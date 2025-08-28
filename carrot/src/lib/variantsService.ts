import { exec } from 'child_process';
import { promisify } from 'util';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs/promises';
import { PrismaClient } from '@prisma/client';

const execAsync = promisify(exec);
const prisma = new PrismaClient();

export interface EditManifest {
  // Timeline operations
  cuts?: Array<{
    startSec: number;
    endSec: number;
  }>;
  
  // Audio operations
  audioVolume?: number; // 0.0 to 2.0
  audioFadeIn?: number; // seconds
  audioFadeOut?: number; // seconds
  muteAudio?: boolean;
  
  // Video operations
  brightness?: number; // -1.0 to 1.0
  contrast?: number; // -1.0 to 1.0
  saturation?: number; // -1.0 to 1.0
  
  // Overlay operations
  textOverlays?: Array<{
    text: string;
    x: number; // percentage 0-100
    y: number; // percentage 0-100
    startSec: number;
    endSec: number;
    fontSize?: number;
    color?: string;
    fontFamily?: string;
  }>;
  
  // Output settings
  outputFormat?: 'mp4' | 'webm' | 'mov';
  quality?: 'low' | 'medium' | 'high';
  maxWidth?: number;
  maxHeight?: number;
}

export interface CreateVariantRequest {
  userVideoId: string;
  editManifest: EditManifest;
  variantKind?: 'edit' | 'captioned' | 'clipped';
}

export interface CreateVariantResponse {
  variantId: string;
  storageUri: string;
  status: 'processing' | 'ready' | 'failed';
}

/**
 * Service for creating and managing video variants (user edits)
 */
export class VideoVariantsService {
  private readonly storageBasePath: string;
  private readonly tempDir: string;

  constructor(storageBasePath = '/tmp/video-variants', tempDir = '/tmp/variant-processing') {
    this.storageBasePath = storageBasePath;
    this.tempDir = tempDir;
  }

  /**
   * Create a new video variant from user edits
   */
  async createVariant({ userVideoId, editManifest, variantKind = 'edit' }: CreateVariantRequest): Promise<CreateVariantResponse> {
    // Get user video and source asset
    const userVideo = await prisma.userVideo.findUnique({
      where: { id: userVideoId },
      include: { asset: true }
    });

    if (!userVideo || !userVideo.asset) {
      throw new Error('User video or source asset not found');
    }

    if (userVideo.asset.status !== 'ready') {
      throw new Error('Source asset is not ready for processing');
    }

    // Create variant record
    const variant = await prisma.videoVariant.create({
      data: {
        userVideoId,
        derivedFromAssetId: userVideo.asset.id,
        variantKind,
        storageUri: '', // Will be updated after processing
        editManifest: editManifest as any
      }
    });

    try {
      // Process the variant asynchronously
      const result = await this.processVariant(variant.id, userVideo.asset.storageUri!, editManifest);
      
      // Update variant with results
      const updatedVariant = await prisma.videoVariant.update({
        where: { id: variant.id },
        data: {
          storageUri: result.storageUri,
          contentHash: result.contentHash,
          durationSec: result.durationSec,
          width: result.width,
          height: result.height,
          fps: result.fps
        }
      });

      return {
        variantId: variant.id,
        storageUri: result.storageUri,
        status: 'ready'
      };

    } catch (error: any) {
      console.error(`[VariantsService] Failed to process variant ${variant.id}:`, error);
      
      // Mark variant as failed (you might want to store error details)
      await prisma.videoVariant.update({
        where: { id: variant.id },
        data: {
          storageUri: `error://${error.message}`
        }
      });

      return {
        variantId: variant.id,
        storageUri: '',
        status: 'failed'
      };
    }
  }

  /**
   * Process a video variant using FFmpeg
   */
  private async processVariant(variantId: string, sourceStorageUri: string, editManifest: EditManifest): Promise<{
    storageUri: string;
    contentHash: string;
    durationSec: number;
    width: number;
    height: number;
    fps: number;
  }> {
    // Ensure temp directory exists
    await fs.mkdir(this.tempDir, { recursive: true });

    // Get source file path (handle different storage URI formats)
    const sourceFilePath = this.resolveStorageUri(sourceStorageUri);
    
    // Generate output path
    const outputExtension = editManifest.outputFormat || 'mp4';
    const tempOutputPath = path.join(this.tempDir, `${variantId}.${outputExtension}`);
    
    // Build FFmpeg command
    const ffmpegCommand = this.buildFFmpegCommand(sourceFilePath, tempOutputPath, editManifest);
    
    console.log(`[VariantsService] Processing variant ${variantId} with command: ${ffmpegCommand}`);
    
    // Execute FFmpeg
    const { stderr } = await execAsync(ffmpegCommand);
    if (stderr) {
      console.log(`[VariantsService] FFmpeg output: ${stderr}`);
    }

    // Verify output file exists
    const outputStats = await fs.stat(tempOutputPath);
    if (!outputStats.isFile()) {
      throw new Error('FFmpeg processing failed - no output file');
    }

    // Probe output metadata
    const metadata = await this.probeVideoMetadata(tempOutputPath);
    
    // Compute content hash
    const contentHash = await this.computeFileHash(tempOutputPath);
    
    // Move to permanent storage
    const storageUri = await this.moveToVariantStorage(tempOutputPath, variantId, outputExtension);
    
    return {
      storageUri,
      contentHash,
      durationSec: Math.round(metadata.duration),
      width: metadata.width,
      height: metadata.height,
      fps: metadata.fps
    };
  }

  /**
   * Build FFmpeg command based on edit manifest
   */
  private buildFFmpegCommand(inputPath: string, outputPath: string, manifest: EditManifest): string {
    const filters: string[] = [];
    let inputOptions: string[] = [];
    let outputOptions: string[] = [];

    // Handle cuts/trimming
    if (manifest.cuts && manifest.cuts.length > 0) {
      // For simplicity, take the first cut. Complex multi-cut editing would need concat filter
      const cut = manifest.cuts[0];
      inputOptions.push(`-ss ${cut.startSec}`, `-t ${cut.endSec - cut.startSec}`);
    }

    // Video filters
    const videoFilters: string[] = [];
    
    // Color adjustments
    if (manifest.brightness !== undefined || manifest.contrast !== undefined || manifest.saturation !== undefined) {
      const brightness = manifest.brightness || 0;
      const contrast = manifest.contrast || 0;
      const saturation = manifest.saturation || 0;
      videoFilters.push(`eq=brightness=${brightness}:contrast=${1 + contrast}:saturation=${1 + saturation}`);
    }

    // Resolution scaling
    if (manifest.maxWidth || manifest.maxHeight) {
      const width = manifest.maxWidth || -2;
      const height = manifest.maxHeight || -2;
      videoFilters.push(`scale=${width}:${height}`);
    }

    // Text overlays
    if (manifest.textOverlays && manifest.textOverlays.length > 0) {
      manifest.textOverlays.forEach(overlay => {
        const fontSize = overlay.fontSize || 24;
        const color = overlay.color || 'white';
        const fontFamily = overlay.fontFamily || 'Arial';
        
        // Convert percentage to pixels (this is approximate - would need video dimensions)
        const x = `(w*${overlay.x/100})`;
        const y = `(h*${overlay.y/100})`;
        
        const enable = `enable='between(t,${overlay.startSec},${overlay.endSec})'`;
        videoFilters.push(`drawtext=text='${overlay.text}':x=${x}:y=${y}:fontsize=${fontSize}:fontcolor=${color}:fontfile=${fontFamily}:${enable}`);
      });
    }

    // Audio filters
    const audioFilters: string[] = [];
    
    if (manifest.muteAudio) {
      outputOptions.push('-an'); // Remove audio
    } else {
      if (manifest.audioVolume !== undefined && manifest.audioVolume !== 1.0) {
        audioFilters.push(`volume=${manifest.audioVolume}`);
      }
      
      if (manifest.audioFadeIn || manifest.audioFadeOut) {
        const fadeIn = manifest.audioFadeIn ? `afade=in:st=0:d=${manifest.audioFadeIn}` : '';
        const fadeOut = manifest.audioFadeOut ? `afade=out:st=${(manifest.cuts?.[0]?.endSec || 0) - manifest.audioFadeOut}:d=${manifest.audioFadeOut}` : '';
        if (fadeIn) audioFilters.push(fadeIn);
        if (fadeOut) audioFilters.push(fadeOut);
      }
    }

    // Combine filters
    if (videoFilters.length > 0) {
      filters.push(`-vf "${videoFilters.join(',')}"`);
    }
    if (audioFilters.length > 0) {
      filters.push(`-af "${audioFilters.join(',')}"`);
    }

    // Quality settings
    const quality = manifest.quality || 'medium';
    const qualityMap = {
      low: ['-crf', '28', '-preset', 'fast'],
      medium: ['-crf', '23', '-preset', 'medium'],
      high: ['-crf', '18', '-preset', 'slow']
    };
    outputOptions.push(...qualityMap[quality]);

    // Build final command
    const command = [
      'ffmpeg',
      '-y', // Overwrite output
      ...inputOptions,
      `-i "${inputPath}"`,
      ...filters,
      ...outputOptions,
      `-c:v libx264`, // Video codec
      `-c:a aac`, // Audio codec
      `"${outputPath}"`
    ].join(' ');

    return command;
  }

  /**
   * Resolve storage URI to local file path
   */
  private resolveStorageUri(storageUri: string): string {
    if (storageUri.startsWith('file://')) {
      return storageUri.slice(7);
    }
    // In production, this would handle S3/GCS URLs by downloading to temp location
    throw new Error(`Unsupported storage URI format: ${storageUri}`);
  }

  /**
   * Probe video metadata using ffprobe
   */
  private async probeVideoMetadata(filePath: string): Promise<{
    duration: number;
    width: number;
    height: number;
    fps: number;
  }> {
    const command = [
      'ffprobe',
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_format',
      '-show_streams',
      `"${filePath}"`
    ].join(' ');
    
    const { stdout } = await execAsync(command);
    const probe = JSON.parse(stdout);
    
    const videoStream = probe.streams.find((s: any) => s.codec_type === 'video');
    if (!videoStream) {
      throw new Error('No video stream found');
    }
    
    const format = probe.format;
    
    return {
      duration: parseFloat(format.duration) || 0,
      width: parseInt(videoStream.width) || 0,
      height: parseInt(videoStream.height) || 0,
      fps: this.parseFps(videoStream.r_frame_rate) || 0
    };
  }

  /**
   * Parse frame rate from ffprobe format
   */
  private parseFps(rFrameRate: string): number {
    if (!rFrameRate) return 0;
    const [num, den] = rFrameRate.split('/').map(Number);
    return den ? num / den : num || 0;
  }

  /**
   * Compute SHA256 hash of file
   */
  private async computeFileHash(filePath: string): Promise<string> {
    const fileBuffer = await fs.readFile(filePath);
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
  }

  /**
   * Move processed variant to storage
   */
  private async moveToVariantStorage(tempFilePath: string, variantId: string, extension: string): Promise<string> {
    // Get user video to determine user ID for storage path
    const variant = await prisma.videoVariant.findUnique({
      where: { id: variantId },
      include: { userVideo: true }
    });

    if (!variant) {
      throw new Error('Variant not found');
    }

    const storageDir = path.join(
      this.storageBasePath, 
      'variants', 
      variant.userVideo.userId, 
      variant.userVideo.id
    );
    
    await fs.mkdir(storageDir, { recursive: true });
    
    const fileName = `${variantId}.${extension}`;
    const storagePath = path.join(storageDir, fileName);
    
    // Move file to storage location
    await fs.rename(tempFilePath, storagePath);
    
    // Return storage URI
    return `file://${storagePath}`;
  }

  /**
   * Get variant by ID
   */
  async getVariant(variantId: string) {
    return await prisma.videoVariant.findUnique({
      where: { id: variantId },
      include: {
        userVideo: {
          include: {
            asset: true,
            user: {
              select: { id: true, username: true, email: true }
            }
          }
        }
      }
    });
  }

  /**
   * List variants for a user video
   */
  async getVariantsForUserVideo(userVideoId: string) {
    return await prisma.videoVariant.findMany({
      where: { userVideoId },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Delete a variant
   */
  async deleteVariant(variantId: string) {
    const variant = await prisma.videoVariant.findUnique({
      where: { id: variantId }
    });

    if (!variant) {
      throw new Error('Variant not found');
    }

    // Delete from storage
    if (variant.storageUri.startsWith('file://')) {
      const filePath = variant.storageUri.slice(7);
      await fs.unlink(filePath).catch(err => {
        console.warn(`Failed to delete variant file ${filePath}:`, err);
      });
    }

    // Delete from database
    return await prisma.videoVariant.delete({
      where: { id: variantId }
    });
  }
}

// Export singleton instance
export const videoVariantsService = new VideoVariantsService();
