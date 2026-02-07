/**
 * CANVAS STUDIO - VIDEO GENERATION PANEL
 * Generate videos from text prompts using AI (fal.ai Minimax video-01-live)
 * Integrates with the canvas-studio sidebar as a panel.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';

interface VideoItem {
  id: string;
  prompt: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  videoUrl?: string;
  requestId?: string;
  createdAt: number;
  error?: string;
}

interface VideoPanelProps {
  onClose?: () => void;
}

const VideoPanel: React.FC<VideoPanelProps> = ({ onClose }) => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Poll for video status
  const pollStatus = useCallback(async (videoId: string, requestId: string) => {
    try {
      const res = await fetch(`/api/video/status/${requestId}`);
      const data = await res.json();

      if (data.success && data.status === 'COMPLETED' && data.videoUrl) {
        setVideos(prev => prev.map(v => 
          v.id === videoId ? { ...v, status: 'completed', videoUrl: data.videoUrl } : v
        ));
        return true; // Done polling
      }

      if (!data.success) {
        setVideos(prev => prev.map(v => 
          v.id === videoId ? { ...v, status: 'failed', error: data.error } : v
        ));
        return true;
      }

      // Update status message
      setVideos(prev => prev.map(v => 
        v.id === videoId ? { ...v, status: data.status === 'IN_QUEUE' ? 'queued' : 'processing' } : v
      ));
      return false; // Keep polling
    } catch {
      return false;
    }
  }, []);

  // Start polling for pending videos
  useEffect(() => {
    const pendingVideos = videos.filter(v => v.status === 'queued' || v.status === 'processing');
    
    if (pendingVideos.length === 0) {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      return;
    }

    if (!pollTimerRef.current) {
      pollTimerRef.current = setInterval(async () => {
        for (const video of pendingVideos) {
          if (video.requestId) {
            const done = await pollStatus(video.id, video.requestId);
            if (done) break;
          }
        }
      }, 4000);
    }

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [videos, pollStatus]);

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;

    setError(null);
    setIsGenerating(true);

    const videoId = 'vid_' + Date.now();
    const newVideo: VideoItem = {
      id: videoId,
      prompt: prompt.trim(),
      status: 'queued',
      createdAt: Date.now(),
    };

    setVideos(prev => [newVideo, ...prev]);
    setPrompt('');

    try {
      const res = await fetch('/api/video/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ prompt: prompt.trim() }),
      });

      const data = await res.json();

      if (data.success) {
        if (data.status === 'COMPLETED' && data.videoUrl) {
          setVideos(prev => prev.map(v => 
            v.id === videoId ? { ...v, status: 'completed', videoUrl: data.videoUrl } : v
          ));
        } else {
          setVideos(prev => prev.map(v => 
            v.id === videoId ? { ...v, requestId: data.requestId, status: 'processing' } : v
          ));
        }
      } else {
        setVideos(prev => prev.map(v => 
          v.id === videoId ? { ...v, status: 'failed', error: data.error } : v
        ));
        setError(data.error);
      }
    } catch (err: any) {
      setVideos(prev => prev.map(v => 
        v.id === videoId ? { ...v, status: 'failed', error: err.message } : v
      ));
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const removeVideo = (id: string) => {
    setVideos(prev => prev.filter(v => v.id !== id));
  };

  const downloadVideo = async (url: string, name: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${name}.mp4`;
      a.click();
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, '_blank');
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#111]/95">
      {/* Header */}
      <div className="px-6 py-4 flex items-center justify-between border-b border-gray-800/50">
        <div>
          <h3 className="text-xs font-bold text-pink-400/80 uppercase tracking-widest">
            Video Generation
          </h3>
          <p className="text-[9px] text-gray-600 mt-0.5">AI-powered text-to-video</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-gray-600 hover:text-cyan-400 transition-colors" title="Close">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Prompt Input */}
      <div className="px-4 py-4 border-b border-gray-800/30">
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleGenerate();
              }
            }}
            placeholder="Describe the video you want to generate..."
            rows={3}
            className="w-full px-4 py-3 text-xs bg-black/50 border border-gray-700 rounded-lg text-gray-300 placeholder-gray-600 focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/20 outline-none transition-all resize-none"
          />
          <button
            onClick={handleGenerate}
            disabled={!prompt.trim() || isGenerating}
            className="absolute bottom-3 right-3 px-3 py-1.5 text-[10px] font-bold bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-lg hover:from-pink-500 hover:to-purple-500 disabled:from-gray-700 disabled:to-gray-700 disabled:text-gray-500 transition-all uppercase tracking-wider"
          >
            {isGenerating ? (
              <span className="flex items-center gap-1">
                <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Generating
              </span>
            ) : (
              '🎬 Generate'
            )}
          </button>
        </div>

        {/* Quick prompts */}
        <div className="flex flex-wrap gap-1.5 mt-2">
          {[
            'A cinematic sunset over the ocean',
            'A futuristic city with flying cars',
            'Abstract colorful particles flowing',
            'A cat playing with a butterfly',
          ].map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => setPrompt(suggestion)}
              className="px-2 py-1 text-[9px] bg-black/30 border border-gray-800 rounded text-gray-500 hover:text-pink-400 hover:border-pink-500/30 transition-all"
            >
              {suggestion.slice(0, 30)}...
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-4 mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-[11px]">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">dismiss</button>
        </div>
      )}

      {/* Video List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-4 space-y-4">
        {videos.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <div className="w-16 h-16 bg-pink-500/10 border border-pink-500/20 rounded-2xl flex items-center justify-center text-3xl mb-4">
              🎬
            </div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">No Videos Yet</p>
            <p className="text-[10px] text-gray-600 max-w-[200px]">
              Describe a scene above and click Generate to create an AI video.
            </p>
          </div>
        )}

        {videos.map((video) => (
          <div
            key={video.id}
            className={`rounded-lg border overflow-hidden transition-all ${
              video.status === 'completed'
                ? 'border-emerald-500/20 bg-emerald-500/5'
                : video.status === 'failed'
                ? 'border-red-500/20 bg-red-500/5'
                : 'border-gray-800 bg-black/30'
            }`}
          >
            {/* Video player */}
            {video.status === 'completed' && video.videoUrl && (
              <div className="relative">
                <video
                  src={video.videoUrl}
                  controls
                  className="w-full rounded-t-lg"
                  style={{ maxHeight: '200px' }}
                />
              </div>
            )}

            {/* Processing indicator */}
            {(video.status === 'queued' || video.status === 'processing') && (
              <div className="h-32 flex flex-col items-center justify-center gap-2">
                <div className="w-8 h-8 border-2 border-pink-500/30 border-t-pink-400 rounded-full animate-spin" />
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">
                  {video.status === 'queued' ? 'In Queue...' : 'Generating...'}
                </p>
              </div>
            )}

            {/* Failed indicator */}
            {video.status === 'failed' && (
              <div className="h-24 flex items-center justify-center">
                <p className="text-[11px] text-red-400">❌ {video.error || 'Generation failed'}</p>
              </div>
            )}

            {/* Info bar */}
            <div className="px-3 py-2 border-t border-gray-800/30">
              <p className="text-[10px] text-gray-400 truncate">{video.prompt}</p>
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-[9px] text-gray-600">
                  {new Date(video.createdAt).toLocaleTimeString()}
                </span>
                <div className="flex items-center gap-1">
                  {video.status === 'completed' && video.videoUrl && (
                    <button
                      onClick={() => downloadVideo(video.videoUrl!, video.prompt.slice(0, 20).replace(/\s+/g, '-'))}
                      className="px-2 py-0.5 text-[9px] text-cyan-400 hover:bg-cyan-500/10 rounded transition-colors"
                    >
                      ⬇ Download
                    </button>
                  )}
                  <button
                    onClick={() => removeVideo(video.id)}
                    className="px-2 py-0.5 text-[9px] text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                  >
                    ✕ Remove
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Info footer */}
      <div className="px-4 py-3 border-t border-gray-800/30">
        <p className="text-[9px] text-gray-600 text-center">
          Powered by AI video generation · Videos are ~5 seconds · Results may take 30-60s
        </p>
      </div>
    </div>
  );
};

export default VideoPanel;
