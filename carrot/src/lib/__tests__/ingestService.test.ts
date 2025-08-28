import { videoIngestService } from '../ingestService';
import { PrismaClient } from '@prisma/client';

// Mock Prisma
jest.mock('@prisma/client');
const mockPrisma = {
  $transaction: jest.fn(),
  sourceAsset: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
  userVideo: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findMany: jest.fn(),
  },
  ingestionJob: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
  },
  videoVariant: {
    findMany: jest.fn(),
  },
};

(PrismaClient as jest.Mock).mockImplementation(() => mockPrisma);

describe('VideoIngestService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ingestVideo', () => {
    test('reuses existing asset when available', async () => {
      const existingAsset = {
        id: 'asset-123',
        status: 'ready',
        sourceUrlNormalized: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        platform: 'youtube',
        externalId: 'dQw4w9WgXcQ'
      };

      const existingUserVideo = {
        id: 'user-video-123',
        userId: 'user-123',
        assetId: 'asset-123'
      };

      // Mock transaction
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        mockPrisma.sourceAsset.findFirst.mockResolvedValue(existingAsset);
        mockPrisma.userVideo.findUnique.mockResolvedValue(existingUserVideo);
        
        return callback(mockPrisma);
      });

      const result = await videoIngestService.ingestVideo({
        userId: 'user-123',
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
      });

      expect(result.action).toBe('reused');
      expect(result.assetId).toBe('asset-123');
      expect(result.userVideoId).toBe('user-video-123');
      expect(result.existingAsset).toBe(true);
    });

    test('creates new asset when none exists', async () => {
      const newAsset = {
        id: 'asset-456',
        status: 'pending',
        sourceUrlNormalized: 'https://www.youtube.com/watch?v=abc123',
        platform: 'youtube',
        externalId: 'abc123'
      };

      const newUserVideo = {
        id: 'user-video-456',
        userId: 'user-123',
        assetId: 'asset-456'
      };

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        mockPrisma.sourceAsset.findFirst.mockResolvedValue(null);
        mockPrisma.sourceAsset.create.mockResolvedValue(newAsset);
        mockPrisma.ingestionJob.create.mockResolvedValue({});
        mockPrisma.userVideo.findUnique.mockResolvedValue(null);
        mockPrisma.userVideo.create.mockResolvedValue(newUserVideo);
        mockPrisma.sourceAsset.update.mockResolvedValue(newAsset);
        
        return callback(mockPrisma);
      });

      const result = await videoIngestService.ingestVideo({
        userId: 'user-123',
        url: 'https://www.youtube.com/watch?v=abc123'
      });

      expect(result.action).toBe('enqueued');
      expect(result.assetId).toBe('asset-456');
      expect(result.userVideoId).toBe('user-video-456');
      expect(result.existingAsset).toBe(false);
    });

    test('handles race condition gracefully', async () => {
      const conflictAsset = {
        id: 'asset-race',
        status: 'pending',
        sourceUrlNormalized: 'https://www.youtube.com/watch?v=race123',
        platform: 'youtube',
        externalId: 'race123'
      };

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        mockPrisma.sourceAsset.findFirst.mockResolvedValueOnce(null);
        
        // Simulate unique constraint violation
        const error = new Error('Unique constraint violation');
        (error as any).code = 'P2002';
        mockPrisma.sourceAsset.create.mockRejectedValue(error);
        
        // Second findFirst returns the asset created by concurrent transaction
        mockPrisma.sourceAsset.findFirst.mockResolvedValueOnce(conflictAsset);
        mockPrisma.userVideo.findUnique.mockResolvedValue(null);
        mockPrisma.userVideo.create.mockResolvedValue({
          id: 'user-video-race',
          userId: 'user-123',
          assetId: 'asset-race'
        });
        mockPrisma.sourceAsset.update.mockResolvedValue(conflictAsset);
        
        return callback(mockPrisma);
      });

      const result = await videoIngestService.ingestVideo({
        userId: 'user-123',
        url: 'https://www.youtube.com/watch?v=race123'
      });

      expect(result.action).toBe('reused');
      expect(result.assetId).toBe('asset-race');
    });

    test('creates user video relationship when user references new asset', async () => {
      const existingAsset = {
        id: 'asset-existing',
        status: 'ready',
        sourceUrlNormalized: 'https://www.youtube.com/watch?v=existing',
        platform: 'youtube',
        externalId: 'existing'
      };

      const newUserVideo = {
        id: 'user-video-new',
        userId: 'user-456',
        assetId: 'asset-existing'
      };

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        mockPrisma.sourceAsset.findFirst.mockResolvedValue(existingAsset);
        mockPrisma.userVideo.findUnique.mockResolvedValue(null); // No existing relationship
        mockPrisma.userVideo.create.mockResolvedValue(newUserVideo);
        mockPrisma.sourceAsset.update.mockResolvedValue(existingAsset);
        
        return callback(mockPrisma);
      });

      const result = await videoIngestService.ingestVideo({
        userId: 'user-456',
        url: 'https://www.youtube.com/watch?v=existing'
      });

      expect(result.action).toBe('reused');
      expect(result.userVideoId).toBe('user-video-new');
      expect(mockPrisma.sourceAsset.update).toHaveBeenCalledWith({
        where: { id: 'asset-existing' },
        data: { refcount: { increment: 1 } }
      });
    });
  });

  describe('deleteUserVideo', () => {
    test('decrements refcount and marks asset for removal when refcount reaches zero', async () => {
      const userVideo = {
        id: 'user-video-delete',
        assetId: 'asset-delete',
        asset: { id: 'asset-delete' }
      };

      const updatedAsset = {
        id: 'asset-delete',
        refcount: 0
      };

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        mockPrisma.userVideo.findUnique.mockResolvedValue(userVideo);
        mockPrisma.userVideo.delete.mockResolvedValue(userVideo);
        mockPrisma.sourceAsset.update
          .mockResolvedValueOnce(updatedAsset)
          .mockResolvedValueOnce({ ...updatedAsset, status: 'removed' });
        
        return callback(mockPrisma);
      });

      const result = await videoIngestService.deleteUserVideo('user-video-delete');

      expect(result).toEqual(userVideo);
      expect(mockPrisma.sourceAsset.update).toHaveBeenCalledWith({
        where: { id: 'asset-delete' },
        data: { refcount: { decrement: 1 } }
      });
      expect(mockPrisma.sourceAsset.update).toHaveBeenCalledWith({
        where: { id: 'asset-delete' },
        data: { status: 'removed' }
      });
    });

    test('throws error when user video not found', async () => {
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        mockPrisma.userVideo.findUnique.mockResolvedValue(null);
        return callback(mockPrisma);
      });

      await expect(videoIngestService.deleteUserVideo('nonexistent')).rejects.toThrow('User video not found');
    });
  });

  describe('cleanupUnusedAssets', () => {
    test('removes assets with zero refcount', async () => {
      const unusedAssets = [
        { id: 'asset-unused-1', refcount: 0, status: 'removed', sourceUrlNormalized: 'url1' },
        { id: 'asset-unused-2', refcount: 0, status: 'removed', sourceUrlNormalized: 'url2' }
      ];

      mockPrisma.sourceAsset.findMany.mockResolvedValue(unusedAssets);
      mockPrisma.sourceAsset.delete.mockResolvedValue({});

      const cleanedCount = await videoIngestService.cleanupUnusedAssets();

      expect(cleanedCount).toBe(2);
      expect(mockPrisma.sourceAsset.delete).toHaveBeenCalledTimes(2);
      expect(mockPrisma.sourceAsset.delete).toHaveBeenCalledWith({ where: { id: 'asset-unused-1' } });
      expect(mockPrisma.sourceAsset.delete).toHaveBeenCalledWith({ where: { id: 'asset-unused-2' } });
    });
  });
});
