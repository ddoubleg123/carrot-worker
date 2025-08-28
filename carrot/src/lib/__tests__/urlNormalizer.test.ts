import { normalizeUrl, createIdempotencyKey, isSupportedVideoUrl } from '../urlNormalizer';

describe('URL Normalizer', () => {
  describe('YouTube URLs', () => {
    test('normalizes standard YouTube watch URL', () => {
      const result = normalizeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      expect(result).toEqual({
        platform: 'youtube',
        sourceUrlNormalized: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        externalId: 'dQw4w9WgXcQ'
      });
    });

    test('normalizes YouTube short URL', () => {
      const result = normalizeUrl('https://youtu.be/dQw4w9WgXcQ');
      expect(result).toEqual({
        platform: 'youtube',
        sourceUrlNormalized: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        externalId: 'dQw4w9WgXcQ'
      });
    });

    test('normalizes YouTube shorts URL', () => {
      const result = normalizeUrl('https://www.youtube.com/shorts/dQw4w9WgXcQ');
      expect(result).toEqual({
        platform: 'youtube',
        sourceUrlNormalized: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        externalId: 'dQw4w9WgXcQ'
      });
    });

    test('normalizes YouTube embed URL', () => {
      const result = normalizeUrl('https://www.youtube.com/embed/dQw4w9WgXcQ');
      expect(result).toEqual({
        platform: 'youtube',
        sourceUrlNormalized: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        externalId: 'dQw4w9WgXcQ'
      });
    });

    test('strips tracking parameters from YouTube URL', () => {
      const result = normalizeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30&list=PLrAXtmRdnEQy6nuLMHjMRrm3IYXq5X9Wl&index=1');
      expect(result).toEqual({
        platform: 'youtube',
        sourceUrlNormalized: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        externalId: 'dQw4w9WgXcQ'
      });
    });

    test('handles mobile YouTube URL', () => {
      const result = normalizeUrl('https://m.youtube.com/watch?v=dQw4w9WgXcQ');
      expect(result).toEqual({
        platform: 'youtube',
        sourceUrlNormalized: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        externalId: 'dQw4w9WgXcQ'
      });
    });

    test('throws error for invalid YouTube video ID', () => {
      expect(() => normalizeUrl('https://www.youtube.com/watch?v=invalid')).toThrow('Invalid YouTube video ID');
    });
  });

  describe('X/Twitter URLs', () => {
    test('normalizes Twitter status URL', () => {
      const result = normalizeUrl('https://twitter.com/user/status/1234567890');
      expect(result).toEqual({
        platform: 'x',
        sourceUrlNormalized: 'https://twitter.com/user/status/1234567890',
        externalId: '1234567890'
      });
    });

    test('normalizes X.com URL to Twitter.com', () => {
      const result = normalizeUrl('https://x.com/user/status/1234567890');
      expect(result).toEqual({
        platform: 'x',
        sourceUrlNormalized: 'https://twitter.com/user/status/1234567890',
        externalId: '1234567890'
      });
    });

    test('handles mobile Twitter URL', () => {
      const result = normalizeUrl('https://mobile.twitter.com/user/status/1234567890');
      expect(result).toEqual({
        platform: 'x',
        sourceUrlNormalized: 'https://twitter.com/user/status/1234567890',
        externalId: '1234567890'
      });
    });

    test('throws error for invalid Twitter URL', () => {
      expect(() => normalizeUrl('https://twitter.com/user')).toThrow('Invalid X/Twitter status URL');
    });
  });

  describe('Reddit URLs', () => {
    test('normalizes Reddit post URL', () => {
      const result = normalizeUrl('https://www.reddit.com/r/videos/comments/abc123/title/');
      expect(result).toEqual({
        platform: 'reddit',
        sourceUrlNormalized: 'https://www.reddit.com/r/videos/comments/abc123/',
        externalId: 'abc123'
      });
    });

    test('handles old Reddit URL', () => {
      const result = normalizeUrl('https://old.reddit.com/r/videos/comments/abc123/title/');
      expect(result).toEqual({
        platform: 'reddit',
        sourceUrlNormalized: 'https://www.reddit.com/r/videos/comments/abc123/',
        externalId: 'abc123'
      });
    });

    test('throws error for invalid Reddit URL', () => {
      expect(() => normalizeUrl('https://reddit.com/r/videos')).toThrow('Invalid Reddit post URL');
    });
  });

  describe('Generic URLs', () => {
    test('normalizes generic URL with tracking parameters', () => {
      const result = normalizeUrl('https://example.com/video?utm_source=test&fbclid=123');
      expect(result.platform).toBe('other');
      expect(result.sourceUrlNormalized).toBe('https://example.com/video');
      expect(result.externalId).toBeNull();
    });

    test('removes www prefix from generic URLs', () => {
      const result = normalizeUrl('https://www.example.com/video');
      expect(result.sourceUrlNormalized).toBe('https://example.com/video');
    });

    test('converts http to https', () => {
      const result = normalizeUrl('http://example.com/video');
      expect(result.sourceUrlNormalized).toBe('https://example.com/video');
    });
  });

  describe('Utility functions', () => {
    test('creates consistent idempotency keys', () => {
      const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      const key1 = createIdempotencyKey(url);
      const key2 = createIdempotencyKey(url);
      expect(key1).toBe(key2);
      expect(key1).toHaveLength(64); // SHA256 hex length
    });

    test('identifies supported video URLs', () => {
      expect(isSupportedVideoUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
      expect(isSupportedVideoUrl('https://twitter.com/user/status/123')).toBe(true);
      expect(isSupportedVideoUrl('https://reddit.com/r/videos/comments/abc123/')).toBe(true);
      expect(isSupportedVideoUrl('https://example.com/video')).toBe(false);
      expect(isSupportedVideoUrl('invalid-url')).toBe(false);
    });
  });

  describe('Edge cases', () => {
    test('handles URLs with fragments', () => {
      const result = normalizeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ#t=30');
      expect(result.sourceUrlNormalized).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    });

    test('handles URLs with unusual casing', () => {
      const result = normalizeUrl('HTTPS://WWW.YOUTUBE.COM/WATCH?V=dQw4w9WgXcQ');
      expect(result.sourceUrlNormalized).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    });

    test('handles invalid URLs gracefully', () => {
      const result = normalizeUrl('not-a-url');
      expect(result.platform).toBe('other');
      expect(result.sourceUrlNormalized).toBe('not-a-url');
      expect(result.externalId).toBeNull();
    });
  });
});
