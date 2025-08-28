'use client';

import { useState } from 'react';
import { Type, Image, Smile, Wand2, Download, Settings } from 'lucide-react';

type CreationMode = 'overlay' | 'frame' | 'meme' | null;

interface CreationToolsProps {
  selectedMode: CreationMode;
  onModeSelect: (mode: CreationMode) => void;
  hasMedia: boolean;
  onGenerate: () => void;
  isProcessing: boolean;
}

interface OverlayParams {
  text: string;
  font: string;
  size: number;
  position: 'top' | 'center' | 'bottom';
  color: string;
}

interface FrameParams {
  timestamp: number;
  effects: string[];
  format: 'jpg' | 'png';
  quality: number;
}

interface MemeParams {
  template: 'top-bottom' | 'caption' | 'impact';
  topText: string;
  bottomText: string;
}

export default function CreationTools({ 
  selectedMode, 
  onModeSelect, 
  hasMedia, 
  onGenerate, 
  isProcessing 
}: CreationToolsProps) {
  const [overlayParams, setOverlayParams] = useState<OverlayParams>({
    text: '',
    font: 'Inter',
    size: 24,
    position: 'bottom',
    color: '#ffffff'
  });

  const [frameParams, setFrameParams] = useState<FrameParams>({
    timestamp: 0,
    effects: [],
    format: 'jpg',
    quality: 90
  });

  const [memeParams, setMemeParams] = useState<MemeParams>({
    template: 'top-bottom',
    topText: '',
    bottomText: ''
  });

  const tools = [
    {
      id: 'overlay' as const,
      title: 'Video → Text Overlay',
      description: 'Add captions and text to video',
      icon: Type,
      color: 'bg-blue-500'
    },
    {
      id: 'frame' as const,
      title: 'Video → Image/JPEG',
      description: 'Extract and stylize frames',
      icon: Image,
      color: 'bg-green-500'
    },
    {
      id: 'meme' as const,
      title: 'Video → Meme',
      description: 'Create memes with captions',
      icon: Smile,
      color: 'bg-orange-500'
    }
  ];

  const renderParameters = () => {
    if (!selectedMode || !hasMedia) return null;

    switch (selectedMode) {
      case 'overlay':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Overlay Text
              </label>
              <textarea
                value={overlayParams.text}
                onChange={(e) => setOverlayParams(prev => ({ ...prev, text: e.target.value }))}
                placeholder="Enter text to overlay on video..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Position
                </label>
                <select
                  value={overlayParams.position}
                  onChange={(e) => setOverlayParams(prev => ({ ...prev, position: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="top">Top</option>
                  <option value="center">Center</option>
                  <option value="bottom">Bottom</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Size
                </label>
                <input
                  type="range"
                  min="16"
                  max="48"
                  value={overlayParams.size}
                  onChange={(e) => setOverlayParams(prev => ({ ...prev, size: parseInt(e.target.value) }))}
                  className="w-full"
                />
                <div className="text-xs text-gray-500 text-center">{overlayParams.size}px</div>
              </div>
            </div>
          </div>
        );

      case 'frame':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Timestamp (seconds)
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={frameParams.timestamp}
                onChange={(e) => setFrameParams(prev => ({ ...prev, timestamp: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="0.0"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Format
                </label>
                <select
                  value={frameParams.format}
                  onChange={(e) => setFrameParams(prev => ({ ...prev, format: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="jpg">JPEG</option>
                  <option value="png">PNG</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quality
                </label>
                <input
                  type="range"
                  min="50"
                  max="100"
                  value={frameParams.quality}
                  onChange={(e) => setFrameParams(prev => ({ ...prev, quality: parseInt(e.target.value) }))}
                  className="w-full"
                />
                <div className="text-xs text-gray-500 text-center">{frameParams.quality}%</div>
              </div>
            </div>
          </div>
        );

      case 'meme':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Template
              </label>
              <select
                value={memeParams.template}
                onChange={(e) => setMemeParams(prev => ({ ...prev, template: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="top-bottom">Top/Bottom Text</option>
                <option value="caption">Caption Style</option>
                <option value="impact">Impact Font</option>
              </select>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Top Text
                </label>
                <input
                  type="text"
                  value={memeParams.topText}
                  onChange={(e) => setMemeParams(prev => ({ ...prev, topText: e.target.value }))}
                  placeholder="Top caption..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bottom Text
                </label>
                <input
                  type="text"
                  value={memeParams.bottomText}
                  onChange={(e) => setMemeParams(prev => ({ ...prev, bottomText: e.target.value }))}
                  placeholder="Bottom caption..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const canGenerate = () => {
    if (!hasMedia || !selectedMode) return false;
    
    switch (selectedMode) {
      case 'overlay':
        return overlayParams.text.trim().length > 0;
      case 'frame':
        return true;
      case 'meme':
        return memeParams.topText.trim().length > 0 || memeParams.bottomText.trim().length > 0;
      default:
        return false;
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Creation Tools</h3>
      
      {/* Tool Selection */}
      <div className="space-y-2">
        {tools.map((tool) => {
          const Icon = tool.icon;
          const isSelected = selectedMode === tool.id;
          
          return (
            <button
              key={tool.id}
              onClick={() => onModeSelect(tool.id)}
              className={`w-full p-3 text-left rounded-lg border transition-colors ${
                isSelected 
                  ? 'border-purple-500 bg-purple-50' 
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 ${tool.color} rounded-lg flex items-center justify-center`}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <div>
                  <div className="font-medium text-gray-900">{tool.title}</div>
                  <div className="text-sm text-gray-500">{tool.description}</div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Parameters */}
      {renderParameters()}

      {/* Generate Button */}
      {selectedMode && hasMedia && (
        <button
          onClick={onGenerate}
          disabled={!canGenerate() || isProcessing}
          className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isProcessing ? (
            <>
              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
              <span>Processing...</span>
            </>
          ) : (
            <>
              <Wand2 className="w-4 h-4" />
              <span>Generate</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
