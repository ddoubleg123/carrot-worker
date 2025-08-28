import { videoIngestService } from '../ingestService';
import { videoVariantsService } from '../variantsService';
import { normalizeUrl } from '../urlNormalizer';

// Integration tests for the complete video deduplication workflow
describe('Video Deduplication Integration Tests', () => {
  const testUserId1 = 'user-test-1';
  const testUserId2 = 'user-test-2';
  const testYouTubeUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
  const testYouTubeShortUrl = 'https://youtu.be/dQw4w9WgXcQ';

  beforeAll(async () => {
    // Setup test database state
    // In a real test, you'd use a test database or transaction rollback
  });

  afterAll(async () => {
    // Cleanup test data
  });

  describe('Acceptance Test 1: First user, first time', () => {
    test('creates new asset and enqueues job for new URL', async () => {
      const result = await videoIngestService.ingestVideo({
        userId: testUserId1,
        url: testYouTubeUrl
      });

      expect(result.action).toBe('enqueued');
      expect(result.assetId).toBeDefined();
      expect(result.userVideoId).toBeDefined();
      expect(result.assetStatus).toBe('pending');
      expect(result.existingAsset).toBe(false);

      // Verify asset was created with correct normalized URL
      const asset = await videoIngestService.getAsset(result.assetId);
      expect(asset).toBeTruthy();
      expect(asset!.sourceUrlNormalized).toBe(testYouTubeUrl);
      expect(asset!.platform).toBe('youtube');
      expect(asset!.externalId).toBe('dQw4w9WgXcQ');
      expect(asset!.status).toBe('pending');
      expect(asset!.refcount).toBe(1);
    });
  });

  describe('Acceptance Test 2: Second user, same permalink', () => {
    test('reuses existing asset without new download', async () => {
      // First user ingests the URL
      const firstResult = await videoIngestService.ingestVideo({
        userId: testUserId1,
        url: testYouTubeUrl
      });

      // Second user ingests the same URL
      const secondResult = await videoIngestService.ingestVideo({
        userId: testUserId2,
        url: testYouTubeUrl
      });

      expect(secondResult.action).toBe('reused');
      expect(secondResult.assetId).toBe(firstResult.assetId);
      expect(secondResult.userVideoId).not.toBe(firstResult.userVideoId);
      expect(secondResult.existingAsset).toBe(true);

      // Verify refcount was incremented
      const asset = await videoIngestService.getAsset(firstResult.assetId);
      expect(asset!.refcount).toBe(2);

      // Verify both users have their own UserVideo records
      const user1Videos = await videoIngestService.getUserVideos(testUserId1);
      const user2Videos = await videoIngestService.getUserVideos(testUserId2);
      
      expect(user1Videos).toHaveLength(1);
      expect(user2Videos).toHaveLength(1);
      expect(user1Videos[0].assetId).toBe(user2Videos[0].assetId);
    });
  });

  describe('Acceptance Test 3: User edit creates variant', () => {
    test('creates variant without affecting original asset', async () => {
      // First ingest a video
      const ingestResult = await videoIngestService.ingestVideo({
        userId: testUserId1,
        url: testYouTubeUrl
      });

      // Simulate asset being ready (normally done by worker)
      await videoIngestService.updateAsset(ingestResult.assetId, {
        status: 'ready',
        storageUri: 'file:///tmp/test-original.mp4',
        durationSec: 120,
        width: 1920,
        height: 1080
      });

      // Create a variant with edits
      const editManifest = {
        cuts: [{ startSec: 10, endSec: 60 }],
        audioVolume: 0.8,
        textOverlays: [{
          text: 'Test Overlay',
          x: 50,
          y: 50,
          startSec: 5,
          endSec: 15
        }]
      };

      const variantResult = await videoVariantsService.createVariant({
        userVideoId: ingestResult.userVideoId,
        editManifest,
        variantKind: 'edit'
      });

      expect(variantResult.variantId).toBeDefined();
      expect(variantResult.status).toBe('ready');

      // Verify variant was created correctly
      const variant = await videoVariantsService.getVariant(variantResult.variantId);
      expect(variant).toBeTruthy();
      expect(variant!.derivedFromAssetId).toBe(ingestResult.assetId);
      expect(variant!.editManifest).toEqual(editManifest);
      expect(variant!.userVideoId).toBe(ingestResult.userVideoId);

      // Verify original asset is unchanged
      const originalAsset = await videoIngestService.getAsset(ingestResult.assetId);
      expect(originalAsset!.status).toBe('ready');
      expect(originalAsset!.storageUri).toBe('file:///tmp/test-original.mp4');
    });
  });

  describe('Acceptance Test 4: Race condition handling', () => {
    test('handles concurrent ingestion of same URL', async () => {
      const newUrl = 'https://www.youtube.com/watch?v=test_race_123';
      
      // Simulate concurrent requests
      const promises = [
        videoIngestService.ingestVideo({ userId: testUserId1, url: newUrl }),
        videoIngestService.ingestVideo({ userId: testUserId2, url: newUrl })
      ];

      const results = await Promise.allSettled(promises);
      
      // Both should succeed
      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('fulfilled');

      if (results[0].status === 'fulfilled' && results[1].status === 'fulfilled') {
        const result1 = results[0].value;
        const result2 = results[1].value;

        // Should reference the same asset
        expect(result1.assetId).toBe(result2.assetId);
        
        // But have different user video IDs
        expect(result1.userVideoId).not.toBe(result2.userVideoId);

        // One should be enqueued, one reused (or both reused if very fast)
        const actions = [result1.action, result2.action];
        expect(actions).toContain('enqueued');
      }
    });
  });

  describe('Acceptance Test 5: External ID path (URL variants)', () => {
    test('maps different URL forms to same asset via normalization', async () => {
      // Ingest standard YouTube URL
      const standardResult = await videoIngestService.ingestVideo({
        userId: testUserId1,
        url: testYouTubeUrl
      });

      // Ingest short YouTube URL (same video)
      const shortResult = await videoIngestService.ingestVideo({
        userId: testUserId2,
        url: testYouTubeShortUrl
      });

      // Should map to the same asset
      expect(shortResult.assetId).toBe(standardResult.assetId);
      expect(shortResult.action).toBe('reused');

      // Verify normalization worked
      const normalized1 = normalizeUrl(testYouTubeUrl);
      const normalized2 = normalizeUrl(testYouTubeShortUrl);
      
      expect(normalized1.sourceUrlNormalized).toBe(normalized2.sourceUrlNormalized);
      expect(normalized1.externalId).toBe(normalized2.externalId);
    });
  });

  describe('Acceptance Test 6: Delete safety', () => {
    test('removing one user video does not delete shared original', async () => {
      const testUrl = 'https://www.youtube.com/watch?v=delete_test_123';

      // Both users ingest the same video
      const user1Result = await videoIngestService.ingestVideo({
        userId: testUserId1,
        url: testUrl
      });

      const user2Result = await videoIngestService.ingestVideo({
        userId: testUserId2,
        url: testUrl
      });

      expect(user1Result.assetId).toBe(user2Result.assetId);

      // Verify refcount is 2
      let asset = await videoIngestService.getAsset(user1Result.assetId);
      expect(asset!.refcount).toBe(2);

      // User 1 deletes their video
      await videoIngestService.deleteUserVideo(user1Result.userVideoId);

      // Asset should still exist with refcount 1
      asset = await videoIngestService.getAsset(user1Result.assetId);
      expect(asset).toBeTruthy();
      expect(asset!.refcount).toBe(1);
      expect(asset!.status).not.toBe('removed');

      // User 2's video should still be accessible
      const user2Video = await videoIngestService.getUserVideo(testUserId2, user2Result.assetId);
      expect(user2Video).toBeTruthy();

      // User 2 deletes their video
      await videoIngestService.deleteUserVideo(user2Result.userVideoId);

      // Now asset should be marked for removal
      asset = await videoIngestService.getAsset(user1Result.assetId);
      expect(asset!.refcount).toBe(0);
      expect(asset!.status).toBe('removed');
    });
  });

  describe('URL Normalization Edge Cases', () => {
    test('handles various YouTube URL formats consistently', () => {
      const urls = [
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'https://youtu.be/dQw4w9WgXcQ',
        'https://m.youtube.com/watch?v=dQw4w9WgXcQ',
        'https://www.youtube.com/embed/dQw4w9WgXcQ',
        'https://www.youtube.com/shorts/dQw4w9WgXcQ',
        'https://youtube.com/watch?v=dQw4w9WgXcQ&t=30&list=PLtest'
      ];

      const normalized = urls.map(url => normalizeUrl(url));
      
      // All should normalize to the same canonical URL
      const canonical = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      normalized.forEach(result => {
        expect(result.sourceUrlNormalized).toBe(canonical);
        expect(result.platform).toBe('youtube');
        expect(result.externalId).toBe('dQw4w9WgXcQ');
      });
    });

    test('handles X/Twitter URL variants', () => {
      const urls = [
        'https://twitter.com/user/status/1234567890',
        'https://x.com/user/status/1234567890',
        'https://mobile.twitter.com/user/status/1234567890',
        'https://www.twitter.com/user/status/1234567890'
      ];

      const normalized = urls.map(url => normalizeUrl(url));
      
      // All should normalize to canonical Twitter URL
      const canonical = 'https://twitter.com/user/status/1234567890';
      normalized.forEach(result => {
        expect(result.sourceUrlNormalized).toBe(canonical);
        expect(result.platform).toBe('x');
        expect(result.externalId).toBe('1234567890');
      });
    });
  });
});
