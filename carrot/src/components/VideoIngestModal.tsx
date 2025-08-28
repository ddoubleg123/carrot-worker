'use client';

import React, { useState } from 'react';
import { useVideoIngest, useAssetStatus, getVideoThumbnail, getPlatformDisplayName } from '@/lib/videoDeduplicationClient';
import { isSupportedVideoUrl } from '@/lib/urlNormalizer';

interface VideoIngestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVideoIngested?: (result: any) => void;
}

export function VideoIngestModal({ isOpen, onClose, onVideoIngested }: VideoIngestModalProps) {
  const [url, setUrl] = useState('');
  const [ingestResult, setIngestResult] = useState<any>(null);
  const { ingestVideo, isLoading, error } = useVideoIngest();
  const { status: assetStatus, asset } = useAssetStatus(ingestResult?.assetId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url.trim()) return;

    if (!isSupportedVideoUrl(url)) {
      alert('Unsupported video URL. Please use YouTube, X/Twitter, or Reddit URLs.');
      return;
    }

    const result = await ingestVideo(url.trim());
    if (result) {
      setIngestResult(result);
      if (onVideoIngested) {
        onVideoIngested(result);
      }
    }
  };

  const handleClose = () => {
    setUrl('');
    setIngestResult(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Add Video from URL</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>

        {!ingestResult ? (
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="video-url" className="block text-sm font-medium text-gray-700 mb-2">
                Video URL
              </label>
              <input
                id="video-url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              />
              <p className="text-xs text-gray-500 mt-1">
                Supported: YouTube, X/Twitter, Reddit
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || !url.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Processing...' : 'Add Video'}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-md">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  {ingestResult.action === 'reused' ? (
                    <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">✓</span>
                    </div>
                  ) : (
                    <div className="w-5 h-5 bg-blue-500 rounded-full animate-spin">
                      <div className="w-2 h-2 bg-white rounded-full ml-1 mt-1"></div>
                    </div>
                  )}
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800">
                    {ingestResult.action === 'reused' ? 'Video Found!' : 'Video Added!'}
                  </h3>
                  <p className="text-sm text-green-600">
                    {ingestResult.action === 'reused' 
                      ? 'This video was already in our system and has been added to your library.'
                      : 'Video is being processed and will be available shortly.'
                    }
                  </p>
                </div>
              </div>
            </div>

            {asset && (
              <div className="border rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  {getVideoThumbnail(asset) && (
                    <img
                      src={getVideoThumbnail(asset)!}
                      alt="Video thumbnail"
                      className="w-20 h-15 object-cover rounded"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-900 truncate">
                      {asset.title || 'Video'}
                    </h4>
                    <p className="text-sm text-gray-500">
                      {getPlatformDisplayName(asset.platform)}
                      {asset.authorHandle && ` • ${asset.authorHandle}`}
                    </p>
                    <div className="mt-1">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        assetStatus === 'ready' 
                          ? 'bg-green-100 text-green-800'
                          : assetStatus === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : assetStatus === 'failed'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {assetStatus === 'ready' ? 'Ready' : 
                         assetStatus === 'pending' ? 'Processing...' :
                         assetStatus === 'failed' ? 'Failed' : 'Unknown'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={handleClose}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
