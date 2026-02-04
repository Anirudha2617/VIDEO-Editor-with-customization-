
import React, { useEffect, useRef, useState } from 'react';
import { Clip, MediaType, Asset, ExportSettings } from '../models';
import { Play, Pause, SkipBack, SkipForward, Maximize, Minimize } from 'lucide-react';
import { renderCanvas } from '../engines/render/CanvasRenderer';
import TransformOverlay from './TransformOverlay';
import { renderCache } from '../services/renderCache';

interface PlayerProps {
  clips: Clip[];
  assets: Asset[];
  currentTime: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  duration: number;
  exportStatus: 'idle' | 'exporting' | 'completed' | 'cancelled';
  exportSettings?: ExportSettings;
  onExportFinish?: () => void;
  onExportProgress?: (progress: number) => void;
  width?: number;
  height?: number;
  selectedClipId?: string | null;
  onClipUpdate?: (id: string, updates: Partial<Clip>) => void;
  workArea?: { start: number; end: number; enabled: boolean };
}

const Player: React.FC<PlayerProps> = ({
  clips, assets, currentTime, isPlaying, onTogglePlay, onSeek, duration, exportStatus, exportSettings, onExportFinish, onExportProgress, width = 1280, height = 720, selectedClipId, onClipUpdate
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaCache = useRef<Map<string, HTMLImageElement | HTMLVideoElement>>(new Map());
  const [isReady, setIsReady] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceNodesRef = useRef<Map<string, MediaElementAudioSourceNode>>(new Map());

  useEffect(() => {
    const loadAssets = async () => {
      const promises = assets.map(asset => {
        if (mediaCache.current.has(asset.id)) return Promise.resolve();
        return new Promise<void>((resolve) => {
          if (asset.type === MediaType.VIDEO) {
            const video = document.createElement('video');
            video.src = asset.src; video.crossOrigin = "anonymous"; video.muted = false; video.preload = "auto";
            video.onloadedmetadata = () => resolve(); video.onerror = () => resolve();
            mediaCache.current.set(asset.id, video);
          } else if (asset.type === MediaType.AUDIO) {
            const audio = new Audio();
            audio.src = asset.src; audio.crossOrigin = "anonymous"; audio.preload = "auto";
            audio.onloadedmetadata = () => resolve(); audio.onerror = () => resolve();
            mediaCache.current.set(asset.id, audio);
          } else if (asset.type === MediaType.IMAGE) {
            const img = new Image();
            img.src = asset.src; img.crossOrigin = "anonymous";
            img.onload = () => resolve(); img.onerror = () => resolve();
            mediaCache.current.set(asset.id, img);
          } else {
            resolve();
          }
        });
      });
      await Promise.all(promises);
      setIsReady(true);
    };
    loadAssets();
  }, [assets]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let targetWidth = width;
    let targetHeight = height;

    if (exportStatus !== 'idle' && exportSettings) {
      if (exportSettings.resolution === '4k') { targetWidth = 3840; targetHeight = 2160; }
      else if (exportSettings.resolution === '1080p') { targetWidth = 1920; targetHeight = 1080; }
      else if (exportSettings.resolution === '720p') { targetWidth = 1280; targetHeight = 720; }
      else if (exportSettings.resolution === 'custom' && exportSettings.width && exportSettings.height) {
        targetWidth = exportSettings.width;
        targetHeight = exportSettings.height;
      }
    }

    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
    }
  }, [exportStatus, exportSettings, width, height]);

  // Export Logic - MOVED TO VideoExportPipeline.ts
  useEffect(() => {
    // Legacy cleanup if needed
  }, []);

  // removed misplaced import

  // ... (inside Player component)

  const [workArea, setWorkArea] = useState<{ start: number; end: number; enabled: boolean }>({ start: 0, end: 30, enabled: false });

  // Invalidate cache when clips change
  useEffect(() => {
    renderCache.clear();
  }, [clips, assets]);

  // Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isReady) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Smart Caching Check
    const dependencyHash = `${clips.length}-${selectedClipId || ''}-${canvas.width}x${canvas.height}`;

    if (exportStatus === 'idle' && renderCache.has(currentTime, dependencyHash)) {
      const cachedFrame = renderCache.get(currentTime, dependencyHash);
      if (cachedFrame) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(cachedFrame, 0, 0);
        return;
      }
    }

    renderCanvas(ctx, clips, assets, mediaCache.current, currentTime, canvas.width, canvas.height);

    // Save to Cache (if idle and not exporting)
    if (exportStatus === 'idle') {
      createImageBitmap(canvas).then(bitmap => {
        renderCache.set(currentTime, dependencyHash, bitmap);
      });
    }

  }, [currentTime, clips, isReady, exportStatus, assets, selectedClipId]);

  // Audio/Video Playback Synchronization
  useEffect(() => {
    // If we are exporting, we mute everything in the preview as the recorder handles the stream
    if (exportStatus === 'exporting') {
      mediaCache.current.forEach((media) => {
        if (media instanceof HTMLVideoElement || media instanceof HTMLAudioElement) {
          media.muted = true;
        }
      });
      return;
    }

    // Main Playback Loop
    clips.forEach(clip => {
      const media = mediaCache.current.get(clip.assetId);
      if (!media || !(media instanceof HTMLVideoElement || media instanceof HTMLAudioElement)) return;

      // Check if clip is currently active
      const isActive = currentTime >= clip.start && currentTime < clip.start + clip.duration;

      if (isActive) {
        // Calculate where we should be in the media file
        // Current global time - Clip Start Time + Clip Offset (start point in source)
        const expectedMediaTime = currentTime - clip.start + clip.offset;

        // Sync Time (if drift is too large, > 0.1s)
        if (Math.abs(media.currentTime - expectedMediaTime) > 0.1) {
          media.currentTime = expectedMediaTime;
        }

        // Play/Pause State
        if (isPlaying) {
          if (media.paused) {
            const playPromise = media.play();
            if (playPromise !== undefined) {
              playPromise.catch(error => {
                // Auto-play was prevented
                // console.warn("Auto-play prevented for", clip.name, error);
              });
            }
          }
        } else {
          if (!media.paused) {
            media.pause();
          }
        }

        // Volume & Mute
        const volume = clip.audioData?.volume ?? 1;
        const isMuted = clip.audioData?.muted ?? false;

        media.volume = Math.min(1, Math.max(0, volume)); // Clamp 0-1
        media.muted = isMuted;

      } else {
        // Not active: Pause and reset if needed (optional optimization)
        if (!media.paused) {
          media.pause();
        }
      }
    });

    // Cleanup on unmount or pause: pause all
    if (!isPlaying) {
      mediaCache.current.forEach((media) => {
        if ((media instanceof HTMLVideoElement || media instanceof HTMLAudioElement) && !media.paused) {
          media.pause();
        }
      });
    }

  }, [currentTime, isPlaying, clips, exportStatus]); // Dependency on currentTime ensures this runs every frame/tick

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) containerRef.current.requestFullscreen().then(() => setIsFullscreen(true));
    else document.exitFullscreen().then(() => setIsFullscreen(false));
  };

  return (
    <div className="flex flex-col h-full bg-transparent">
      <div className="flex-1 relative flex items-center justify-center overflow-hidden p-8 bg-black/40">
        <div
          ref={containerRef}
          className={`relative shadow-2xl overflow-hidden ring-1 ring-[#27272a] bg-black group ${isFullscreen ? 'w-full h-full ring-0' : 'h-full max-w-full'}`}
          style={{ aspectRatio: isFullscreen ? 'auto' : `${width}/${height}` }}
        >

          <canvas ref={canvasRef} className="w-full h-full object-contain" />

          {/* Interactive Overlay */}
          {isReady && selectedClipId && onClipUpdate && exportStatus === 'idle' && (
            <TransformOverlay
              activeClip={clips.find(c => c.id === selectedClipId) || null}
              onChange={(updates) => onClipUpdate(selectedClipId, updates)}
              containerWidth={containerRef.current?.getBoundingClientRect().width || width}
              containerHeight={containerRef.current?.getBoundingClientRect().height || height}
              canvasWidth={width}
              canvasHeight={height}
              currentTime={currentTime}
            />
          )}

          {!isReady && <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white z-50">Loading...</div>}
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-6">
            <button onClick={() => onSeek(0)} className="text-white hover:scale-110"><SkipBack size={24} /></button>
            <button onClick={onTogglePlay} className="text-white hover:scale-110">{isPlaying ? <Pause size={32} /> : <Play size={32} />}</button>
            <button onClick={() => onSeek(duration)} className="text-white hover:scale-110"><SkipForward size={24} /></button>
          </div>
        </div>
      </div>
      <div className="h-14 bg-white/5 backdrop-blur-md border-t border-white/5 flex items-center justify-center gap-6 px-4">
        <div className="flex-1 text-xs font-mono text-gray-400">{new Date(currentTime * 1000).toISOString().substr(11, 8)} / {new Date(duration * 1000).toISOString().substr(11, 8)}</div>
        <div className="flex items-center gap-4">
          <button onClick={onTogglePlay} className="w-8 h-8 rounded bg-white text-black flex items-center justify-center hover:bg-gray-200">{isPlaying ? <Pause size={16} fill="black" /> : <Play size={16} fill="black" className="ml-0.5" />}</button>
        </div>
        <div className="flex-1 flex justify-end"><button onClick={toggleFullscreen} className="text-gray-400 hover:text-white"><Maximize size={16} /></button></div>
      </div>
    </div>
  );
};

export default Player;
