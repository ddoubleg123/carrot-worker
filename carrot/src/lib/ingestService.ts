import { PrismaClient } from '@prisma/client';
import { normalizeUrl, createIdempotencyKey } from './urlNormalizer';

const prisma = new PrismaClient();

export interface IngestRequest {
  userId: string;
  url: string;
}

export interface IngestResponse {
  action: 'reused' | 'enqueued';
  assetId: string;
  userVideoId: string;
  assetStatus: string;
  existingAsset?: boolean;
}

/**
 * Main ingestion service that handles video URL deduplication and user video creation
 */
export class VideoIngestService {
  
  /**
   * Ingests a video URL with deduplication logic
   */
  async ingestVideo({ userId, url }: IngestRequest): Promise<IngestResponse> {
    // Step 1: Normalize the URL
    const normalized = normalizeUrl(url);
    const idempotencyKey = createIdempotencyKey(normalized.sourceUrlNormalized);
    
    // Step 2: Use transaction for race-safe upsert logic
    return await prisma.$transaction(async (tx) => {
      // Try to find existing asset by normalized URL or platform+externalId
      let existingAsset = await tx.sourceAsset.findFirst({
        where: {
          OR: [
            { sourceUrlNormalized: normalized.sourceUrlNormalized },
            ...(normalized.externalId ? [{
              AND: [
                { platform: normalized.platform },
                { externalId: normalized.externalId }
              ]
            }] : [])
          ]
        }
      });

      let asset;
      let action: 'reused' | 'enqueued' = 'reused';

      if (existingAsset && ['ready', 'pending'].includes(existingAsset.status)) {
        // Asset exists and is usable - reuse it
        asset = existingAsset;
      } else {
        // Need to create new asset and enqueue ingestion job
        action = 'enqueued';
        
        try {
          // Create new source asset
          asset = await tx.sourceAsset.create({
            data: {
              platform: normalized.platform,
              sourceUrlRaw: url,
              sourceUrlNormalized: normalized.sourceUrlNormalized,
              externalId: normalized.externalId,
              status: 'pending',
              version: 1,
              refcount: 0
            }
          });

          // Create ingestion job with idempotency key
          await tx.ingestionJob.create({
            data: {
              userId,
              sourceUrlRaw: url,
              sourceUrlNormalized: normalized.sourceUrlNormalized,
              platform: normalized.platform,
              externalId: normalized.externalId,
              assetId: asset.id,
              idempotencyKey,
              state: 'queued'
            }
          });

        } catch (error: any) {
          // Handle race condition - another transaction might have created the asset
          if (error.code === 'P2002') { // Unique constraint violation
            const conflictAsset = await tx.sourceAsset.findFirst({
              where: {
                OR: [
                  { sourceUrlNormalized: normalized.sourceUrlNormalized },
                  ...(normalized.externalId ? [{
                    AND: [
                      { platform: normalized.platform },
                      { externalId: normalized.externalId }
                    ]
                  }] : [])
                ]
              }
            });
            
            if (conflictAsset) {
              asset = conflictAsset;
              action = 'reused';
            } else {
              throw error;
            }
          } else {
            throw error;
          }
        }
      }

      // Step 3: Create or find user video relationship
      let userVideo = await tx.userVideo.findUnique({
        where: {
          user_asset: {
            userId,
            assetId: asset.id
          }
        }
      });

      if (!userVideo) {
        userVideo = await tx.userVideo.create({
          data: {
            userId,
            assetId: asset.id,
            role: 'original_ref',
            status: 'draft'
          }
        });

        // Increment refcount for new user reference
        await tx.sourceAsset.update({
          where: { id: asset.id },
          data: { refcount: { increment: 1 } }
        });
      }

      return {
        action,
        assetId: asset.id,
        userVideoId: userVideo.id,
        assetStatus: asset.status,
        existingAsset: existingAsset !== null
      };
    });
  }

  /**
   * Gets a user's video by asset ID
   */
  async getUserVideo(userId: string, assetId: string) {
    return await prisma.userVideo.findUnique({
      where: {
        user_asset: {
          userId,
          assetId
        }
      },
      include: {
        asset: true,
        variants: true
      }
    });
  }

  /**
   * Lists all user videos for a user
   */
  async getUserVideos(userId: string) {
    return await prisma.userVideo.findMany({
      where: { userId },
      include: {
        asset: true,
        variants: {
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Updates user video metadata
   */
  async updateUserVideo(userVideoId: string, data: {
    titleOverride?: string;
    notes?: string;
    posterUri?: string;
    status?: 'draft' | 'published' | 'archived';
  }) {
    return await prisma.userVideo.update({
      where: { id: userVideoId },
      data
    });
  }

  /**
   * Deletes a user video and decrements refcount
   */
  async deleteUserVideo(userVideoId: string) {
    return await prisma.$transaction(async (tx) => {
      const userVideo = await tx.userVideo.findUnique({
        where: { id: userVideoId },
        include: { asset: true }
      });

      if (!userVideo) {
        throw new Error('User video not found');
      }

      // Delete the user video (cascades to variants)
      await tx.userVideo.delete({
        where: { id: userVideoId }
      });

      // Decrement refcount
      const updatedAsset = await tx.sourceAsset.update({
        where: { id: userVideo.assetId },
        data: { refcount: { decrement: 1 } }
      });

      // If refcount reaches 0, mark asset for cleanup (but don't delete immediately)
      if (updatedAsset.refcount <= 0) {
        await tx.sourceAsset.update({
          where: { id: userVideo.assetId },
          data: { status: 'removed' }
        });
      }

      return userVideo;
    });
  }

  /**
   * Gets asset by ID with metadata
   */
  async getAsset(assetId: string) {
    return await prisma.sourceAsset.findUnique({
      where: { id: assetId },
      include: {
        userVideos: {
          include: {
            user: {
              select: { id: true, username: true, email: true }
            }
          }
        },
        videoVariants: true
      }
    });
  }

  /**
   * Updates asset metadata (called by ingestion worker)
   */
  async updateAsset(assetId: string, data: {
    storageUri?: string;
    contentHash?: string;
    durationSec?: number;
    width?: number;
    height?: number;
    fps?: number;
    title?: string;
    authorHandle?: string;
    publishedAt?: Date;
    status?: 'pending' | 'ready' | 'failed' | 'removed';
  }) {
    return await prisma.sourceAsset.update({
      where: { id: assetId },
      data
    });
  }

  /**
   * Gets ingestion job by ID
   */
  async getIngestionJob(jobId: string) {
    return await prisma.ingestionJob.findUnique({
      where: { id: jobId },
      include: { asset: true }
    });
  }

  /**
   * Updates ingestion job state
   */
  async updateIngestionJob(jobId: string, data: {
    state?: 'queued' | 'running' | 'succeeded' | 'failed';
    error?: string;
  }) {
    return await prisma.ingestionJob.update({
      where: { id: jobId },
      data
    });
  }

  /**
   * Gets pending ingestion jobs for worker processing
   */
  async getPendingIngestionJobs(limit = 10) {
    return await prisma.ingestionJob.findMany({
      where: { state: 'queued' },
      orderBy: { createdAt: 'asc' },
      take: limit,
      include: { asset: true }
    });
  }

  /**
   * Cleanup method to remove assets with zero refcount
   */
  async cleanupUnusedAssets() {
    const unusedAssets = await prisma.sourceAsset.findMany({
      where: {
        refcount: { lte: 0 },
        status: 'removed'
      }
    });

    // In production, this would trigger storage cleanup as well
    for (const asset of unusedAssets) {
      console.log(`Cleaning up unused asset: ${asset.id} (${asset.sourceUrlNormalized})`);
      // TODO: Delete from storage (S3/GCS)
      await prisma.sourceAsset.delete({
        where: { id: asset.id }
      });
    }

    return unusedAssets.length;
  }
}

// Export singleton instance
export const videoIngestService = new VideoIngestService();
