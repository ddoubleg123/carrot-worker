import crypto from 'crypto';

export interface NormalizedUrl {
  platform: 'youtube' | 'x' | 'reddit' | 'other';
  sourceUrlNormalized: string;
  externalId: string | null;
}

/**
 * Normalizes URLs from various platforms to create canonical permalinks
 * for deduplication while extracting platform-specific identifiers.
 */
export function normalizeUrl(input: string): NormalizedUrl {
  try {
    const url = new URL(input.trim());
    
    // YouTube normalization
    if (isYouTubeUrl(url)) {
      return normalizeYouTubeUrl(url);
    }
    
    // X/Twitter normalization
    if (isXUrl(url)) {
      return normalizeXUrl(url);
    }
    
    // Reddit normalization
    if (isRedditUrl(url)) {
      return normalizeRedditUrl(url);
    }
    
    // Other platforms - basic normalization
    return {
      platform: 'other',
      sourceUrlNormalized: normalizeGenericUrl(url),
      externalId: null
    };
  } catch (error) {
    // If URL parsing fails, treat as generic
    return {
      platform: 'other',
      sourceUrlNormalized: input.trim(),
      externalId: null
    };
  }
}

function isYouTubeUrl(url: URL): boolean {
  const hostname = url.hostname.toLowerCase();
  return hostname === 'youtube.com' || 
         hostname === 'www.youtube.com' || 
         hostname === 'm.youtube.com' || 
         hostname === 'youtu.be' ||
         hostname === 'youtube-nocookie.com' ||
         hostname === 'www.youtube-nocookie.com';
}

function normalizeYouTubeUrl(url: URL): NormalizedUrl {
  let videoId: string | null = null;
  
  // Extract video ID from different YouTube URL formats
  if (url.hostname === 'youtu.be') {
    // Short format: youtu.be/VIDEO_ID
    videoId = url.pathname.slice(1).split('?')[0];
  } else if (url.pathname === '/watch') {
    // Standard format: youtube.com/watch?v=VIDEO_ID
    videoId = url.searchParams.get('v');
  } else if (url.pathname.startsWith('/embed/')) {
    // Embed format: youtube.com/embed/VIDEO_ID
    videoId = url.pathname.slice('/embed/'.length).split('?')[0];
  } else if (url.pathname.startsWith('/shorts/')) {
    // Shorts format: youtube.com/shorts/VIDEO_ID
    videoId = url.pathname.slice('/shorts/'.length).split('?')[0];
  }
  
  if (!videoId || videoId.length !== 11) {
    throw new Error('Invalid YouTube video ID');
  }
  
  // Create canonical YouTube URL without tracking parameters
  const canonicalUrl = `https://www.youtube.com/watch?v=${videoId}`;
  
  return {
    platform: 'youtube',
    sourceUrlNormalized: canonicalUrl,
    externalId: videoId
  };
}

function isXUrl(url: URL): boolean {
  const hostname = url.hostname.toLowerCase();
  return hostname === 'twitter.com' || 
         hostname === 'www.twitter.com' || 
         hostname === 'mobile.twitter.com' ||
         hostname === 'x.com' ||
         hostname === 'www.x.com' ||
         hostname === 'mobile.x.com';
}

function normalizeXUrl(url: URL): NormalizedUrl {
  // X/Twitter URL pattern: /username/status/TWEET_ID
  const pathMatch = url.pathname.match(/^\/([^\/]+)\/status\/(\d+)/);
  
  if (!pathMatch) {
    throw new Error('Invalid X/Twitter status URL');
  }
  
  const [, username, tweetId] = pathMatch;
  
  // Create canonical X URL (using twitter.com as canonical domain)
  const canonicalUrl = `https://twitter.com/${username}/status/${tweetId}`;
  
  return {
    platform: 'x',
    sourceUrlNormalized: canonicalUrl,
    externalId: tweetId
  };
}

function isRedditUrl(url: URL): boolean {
  const hostname = url.hostname.toLowerCase();
  return hostname === 'reddit.com' || 
         hostname === 'www.reddit.com' || 
         hostname === 'old.reddit.com' ||
         hostname === 'new.reddit.com' ||
         hostname === 'm.reddit.com';
}

function normalizeRedditUrl(url: URL): NormalizedUrl {
  // Reddit URL pattern: /r/subreddit/comments/POST_ID/title/
  const pathMatch = url.pathname.match(/^\/r\/([^\/]+)\/comments\/([^\/]+)/);
  
  if (!pathMatch) {
    throw new Error('Invalid Reddit post URL');
  }
  
  const [, subreddit, postId] = pathMatch;
  
  // Create canonical Reddit URL
  const canonicalUrl = `https://www.reddit.com/r/${subreddit}/comments/${postId}/`;
  
  return {
    platform: 'reddit',
    sourceUrlNormalized: canonicalUrl,
    externalId: postId
  };
}

function normalizeGenericUrl(url: URL): string {
  // Remove common tracking parameters
  const trackingParams = [
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
    'fbclid', 'gclid', 'msclkid', 'twclid',
    'ref', 'source', 'campaign',
    '_ga', '_gl', '_hsenc', '_hsmi'
  ];
  
  trackingParams.forEach(param => {
    url.searchParams.delete(param);
  });
  
  // Normalize hostname (remove www, mobile prefixes)
  let hostname = url.hostname.toLowerCase();
  if (hostname.startsWith('www.')) {
    hostname = hostname.slice(4);
  }
  if (hostname.startsWith('m.')) {
    hostname = hostname.slice(2);
  }
  if (hostname.startsWith('mobile.')) {
    hostname = hostname.slice(7);
  }
  
  // Reconstruct URL
  const normalizedUrl = new URL(url);
  normalizedUrl.hostname = hostname;
  normalizedUrl.protocol = 'https:'; // Always use HTTPS
  
  return normalizedUrl.toString();
}

/**
 * Creates an idempotency key from a normalized URL
 */
export function createIdempotencyKey(normalizedUrl: string): string {
  return crypto.createHash('sha256').update(normalizedUrl).digest('hex');
}

/**
 * Validates if a URL is supported for video ingestion
 */
export function isSupportedVideoUrl(url: string): boolean {
  try {
    const normalized = normalizeUrl(url);
    return ['youtube', 'x', 'reddit'].includes(normalized.platform);
  } catch {
    return false;
  }
}
