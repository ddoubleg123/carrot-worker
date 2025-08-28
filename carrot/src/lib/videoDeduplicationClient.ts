/**
 * Client-side utilities for the video deduplication system
 * Provides React hooks and utilities for frontend integration
 */

import { useState, useEffect, useCallback } from 'react';

export interface VideoAsset {
  id: string;
  platform: 'youtube' | 'x' | 'reddit' | 'other';
  sourceUrlNormalized: string;
  title?: string;
  authorHandle?: string;
  status: 'pending' | 'ready' | 'failed' | 'removed';
  durationSec?: number;
  width?: number;
  height?: number;
  storageUri?: string;
}

export interface UserVideo {
  id: string;
  userId: string;
  assetId: string;
  status: 'draft' | 'published' | 'archived';
  titleOverride?: string;
  notes?: string;
  posterUri?: string;
  createdAt: string;
  asset: VideoAsset;
  variants: VideoVariant[];
}

export interface VideoVariant {
  id: string;
  variantKind: 'edit' | 'captioned' | 'clipped';
  storageUri: string;
  durationSec?: number;
  width?: number;
  height?: number;
  editManifest: any;
  createdAt: string;
}

export interface IngestResponse {
  success: boolean;
  action: 'reused' | 'enqueued';
  assetId: string;
  userVideoId: string;
  assetStatus: string;
  existingAsset?: boolean;
}

/**
 * Hook for ingesting video URLs with deduplication
 */
export function useVideoIngest() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ingestVideo = useCallback(async (url: string): Promise<IngestResponse | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/videos/ingest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to ingest video');
      }

      return data;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { ingestVideo, isLoading, error };
}

/**
 * Hook for managing user videos
 */
export function useUserVideos() {
  const [videos, setVideos] = useState<UserVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVideos = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/videos/user');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch videos');
      }

      setVideos(data.videos);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  const refreshVideos = useCallback(() => {
    fetchVideos();
  }, [fetchVideos]);

  return { videos, isLoading, error, refreshVideos };
}

/**
 * Hook for creating video variants
 */
export function useVideoVariants(userVideoId: string) {
  const [variants, setVariants] = useState<VideoVariant[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchVariants = useCallback(async () => {
    if (!userVideoId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/videos/${userVideoId}/variants`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch variants');
      }

      setVariants(data.variants);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [userVideoId]);

  const createVariant = useCallback(async (editManifest: any, variantKind = 'edit') => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/videos/${userVideoId}/variants`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ editManifest, variantKind }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create variant');
      }

      // Refresh variants list
      await fetchVariants();

      return data;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [userVideoId, fetchVariants]);

  useEffect(() => {
    fetchVariants();
  }, [fetchVariants]);

  return { variants, createVariant, isLoading, error, refreshVariants: fetchVariants };
}

/**
 * Hook for polling asset status during ingestion
 */
export function useAssetStatus(assetId: string | null) {
  const [status, setStatus] = useState<string | null>(null);
  const [asset, setAsset] = useState<VideoAsset | null>(null);

  useEffect(() => {
    if (!assetId) return;

    const pollStatus = async () => {
      try {
        const response = await fetch(`/api/videos/assets/${assetId}`);
        if (response.ok) {
          const data = await response.json();
          setAsset(data.asset);
          setStatus(data.asset.status);
        }
      } catch (err) {
        console.error('Failed to poll asset status:', err);
      }
    };

    // Poll immediately
    pollStatus();

    // Set up polling interval for pending assets
    const interval = setInterval(pollStatus, 5000);

    return () => clearInterval(interval);
  }, [assetId]);

  return { status, asset };
}

/**
 * Utility function to get video thumbnail URL
 */
export function getVideoThumbnail(asset: VideoAsset): string | null {
  if (asset.platform === 'youtube' && asset.sourceUrlNormalized) {
    const videoId = new URL(asset.sourceUrlNormalized).searchParams.get('v');
    return videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : null;
  }
  
  // For other platforms, you'd implement similar logic
  return null;
}

/**
 * Utility function to format video duration
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Utility function to get platform display name
 */
export function getPlatformDisplayName(platform: string): string {
  const platformNames = {
    youtube: 'YouTube',
    x: 'X (Twitter)',
    reddit: 'Reddit',
    other: 'Other'
  };
  return platformNames[platform as keyof typeof platformNames] || 'Unknown';
}
