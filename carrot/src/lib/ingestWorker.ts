import { exec } from 'child_process';
import { promisify } from 'util';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs/promises';
import { videoIngestService } from './ingestService';

const execAsync = promisify(exec);

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  fps: number;
  title?: string;
  uploader?: string;
  uploadDate?: string;
  filesize: number;
}

/**
 * Background worker for processing video ingestion jobs
 */
export class VideoIngestWorker {
  private readonly storageBasePath: string;
  private readonly tempDir: string;

  constructor(storageBasePath = '/tmp/video-assets', tempDir = '/tmp/video-processing') {
    this.storageBasePath = storageBasePath;
    this.tempDir = tempDir;
  }

  /**
   * Process a single ingestion job
   */
  async processIngestionJob(jobId: string): Promise<void> {
    console.log(`[IngestWorker] Processing job ${jobId}`);
    
    try {
      // Mark job as running
      await videoIngestService.updateIngestionJob(jobId, { state: 'running' });
      
      const job = await videoIngestService.getIngestionJob(jobId);
      if (!job || !job.asset) {
        throw new Error('Job or associated asset not found');
      }

      const { asset } = job;
      
      // Step 1: Download and extract metadata
      console.log(`[IngestWorker] Downloading ${job.sourceUrlNormalized}`);
      const downloadResult = await this.downloadVideo(job.sourceUrlNormalized);
      
      // Step 2: Compute content hash
      const contentHash = await this.computeFileHash(downloadResult.filePath);
      
      // Step 3: Probe video metadata
      const metadata = await this.probeVideoMetadata(downloadResult.filePath);
      
      // Step 4: Move to permanent storage
      const storageUri = await this.moveToStorage(downloadResult.filePath, asset.id, downloadResult.extension);
      
      // Step 5: Update asset with all metadata
      await videoIngestService.updateAsset(asset.id, {
        storageUri,
        contentHash,
        durationSec: Math.round(metadata.duration),
        width: metadata.width,
        height: metadata.height,
        fps: metadata.fps,
        title: downloadResult.title || metadata.title,
        authorHandle: downloadResult.uploader || metadata.uploader,
        publishedAt: downloadResult.uploadDate ? new Date(downloadResult.uploadDate) : undefined,
        status: 'ready'
      });
      
      // Step 6: Mark job as succeeded
      await videoIngestService.updateIngestionJob(jobId, { state: 'succeeded' });
      
      console.log(`[IngestWorker] Successfully processed job ${jobId} -> ${storageUri}`);
      
    } catch (error: any) {
      console.error(`[IngestWorker] Job ${jobId} failed:`, error);
      
      // Mark job and asset as failed
      await videoIngestService.updateIngestionJob(jobId, { 
        state: 'failed', 
        error: error.message 
      });
      
      const job = await videoIngestService.getIngestionJob(jobId);
      if (job?.asset) {
        await videoIngestService.updateAsset(job.asset.id, { status: 'failed' });
      }
      
      throw error;
    }
  }

  /**
   * Download video using yt-dlp and extract basic metadata
   */
  private async downloadVideo(url: string): Promise<{
    filePath: string;
    extension: string;
    title?: string;
    uploader?: string;
    uploadDate?: string;
  }> {
    // Ensure temp directory exists
    await fs.mkdir(this.tempDir, { recursive: true });
    
    const outputTemplate = path.join(this.tempDir, '%(id)s.%(ext)s');
    
    // Use yt-dlp to download and extract metadata
    const command = [
      'yt-dlp',
      '--format', 'best[height<=1080]', // Limit quality to reduce storage
      '--output', outputTemplate,
      '--print', 'filename',
      '--print', 'title',
      '--print', 'uploader', 
      '--print', 'upload_date',
      '--no-playlist',
      '--no-warnings',
      `"${url}"`
    ].join(' ');
    
    console.log(`[IngestWorker] Executing: ${command}`);
    const { stdout, stderr } = await execAsync(command);
    
    if (stderr) {
      console.warn(`[IngestWorker] yt-dlp warnings: ${stderr}`);
    }
    
    const lines = stdout.trim().split('\n');
    const filePath = lines[0];
    const title = lines[1] || undefined;
    const uploader = lines[2] || undefined;
    const uploadDate = lines[3] || undefined;
    
    if (!filePath || !(await fs.stat(filePath).catch(() => null))) {
      throw new Error('Download failed - no output file');
    }
    
    const extension = path.extname(filePath).slice(1);
    
    return {
      filePath,
      extension,
      title,
      uploader,
      uploadDate
    };
  }

  /**
   * Probe video metadata using ffprobe
   */
  private async probeVideoMetadata(filePath: string): Promise<VideoMetadata> {
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
      fps: this.parseFps(videoStream.r_frame_rate) || 0,
      title: format.tags?.title,
      uploader: format.tags?.artist || format.tags?.author,
      uploadDate: format.tags?.date,
      filesize: parseInt(format.size) || 0
    };
  }

  /**
   * Parse frame rate from ffprobe format (e.g., "30/1" -> 30)
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
   * Move file to permanent storage location
   */
  private async moveToStorage(tempFilePath: string, assetId: string, extension: string): Promise<string> {
    const storageDir = path.join(this.storageBasePath, 'assets', assetId);
    await fs.mkdir(storageDir, { recursive: true });
    
    const fileName = `original.${extension}`;
    const storagePath = path.join(storageDir, fileName);
    
    // Move file to storage location
    await fs.rename(tempFilePath, storagePath);
    
    // Return storage URI (in production this would be S3/GCS URL)
    return `file://${storagePath}`;
  }

  /**
   * Process all pending ingestion jobs
   */
  async processPendingJobs(): Promise<void> {
    const jobs = await videoIngestService.getPendingIngestionJobs(5);
    
    console.log(`[IngestWorker] Found ${jobs.length} pending jobs`);
    
    // Process jobs in parallel (with concurrency limit)
    const promises = jobs.map(job => this.processIngestionJob(job.id));
    await Promise.allSettled(promises);
  }

  /**
   * Start worker loop (for production deployment)
   */
  async startWorkerLoop(intervalMs = 10000): Promise<void> {
    console.log(`[IngestWorker] Starting worker loop (interval: ${intervalMs}ms)`);
    
    const processJobs = async () => {
      try {
        await this.processPendingJobs();
      } catch (error) {
        console.error('[IngestWorker] Error processing jobs:', error);
      }
    };
    
    // Process immediately
    await processJobs();
    
    // Set up interval
    setInterval(processJobs, intervalMs);
  }
}

// Export singleton instance
export const videoIngestWorker = new VideoIngestWorker();
