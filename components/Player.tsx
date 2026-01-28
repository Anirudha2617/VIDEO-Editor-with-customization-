
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

  // Export Logic
  useEffect(() => {
    if (!canvasRef.current) return;

    if (exportStatus === 'exporting' && exportSettings) {
      const startTime = performance.now();

      // Clean up any existing recorder first
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        console.log('Stopping previous MediaRecorder');
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current = null;
      }

      // Reset recorded chunks for new export
      recordedChunksRef.current = [];

      const canvas = canvasRef.current;
      const fps = exportSettings.fps || 30;
      const canvasStream = canvas.captureStream(fps);

      console.log('Export starting with fps:', fps, exportSettings);

      // Create or reuse audio context
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new AudioContext();
        console.log('Created new AudioContext');
      }

      const audioContext = audioContextRef.current;
      const audioDestination = audioContext.createMediaStreamDestination();

      // Find all audio/video clips in the export range
      const exportClips = clips.filter(clip =>
        (clip.type === MediaType.AUDIO || clip.type === MediaType.VIDEO) &&
        clip.start < exportSettings.endTime &&
        clip.start + clip.duration > exportSettings.startTime
      );

      console.log('Export clips with audio:', exportClips.length);

      // Connect audio sources to the destination
      exportClips.forEach(clip => {
        const media = mediaCache.current.get(clip.assetId);
        if (media && (media instanceof HTMLAudioElement || media instanceof HTMLVideoElement)) {
          try {
            // Check if we already have a source node for this media element
            let source = audioSourceNodesRef.current.get(clip.assetId);

            if (!source) {
              // Create new source node only if it doesn't exist
              source = audioContext.createMediaElementSource(media);
              audioSourceNodesRef.current.set(clip.assetId, source);
              console.log('Created new audio source:', clip.name);
            } else {
              console.log('Reusing existing audio source:', clip.name);
            }

            // Connect ONLY to the export destination, NOT to speakers (to avoid echo)
            // Disconnect first to be safe
            try { source.disconnect(); } catch (e) { }

            source.connect(audioDestination);
            // source.connect(audioContext.destination); // DO NOT connect to speakers during export
          } catch (err) {
            // Element already connected to a different context
            console.log('Audio source connection error:', clip.name, err);
          }
        }
      });

      // Combine video and audio streams
      let combinedStream = canvasStream;
      if (audioDestination.stream.getAudioTracks().length > 0) {
        console.log('Adding audio tracks to export');
        combinedStream = new MediaStream([
          ...canvasStream.getVideoTracks(),
          ...audioDestination.stream.getAudioTracks()
        ]);
      } else {
        console.log('No audio tracks to export');
      }

      // Capture exportSettings in local variable to avoid closure issues
      const filename = exportSettings.filename || 'export';
      console.log('📹 Export filename:', filename);

      // Try different codecs for better compatibility
      // MimeType Selection based on format
      let mimeType = 'video/webm;codecs=vp9,opus'; // Default

      if (exportSettings.format === 'mp4') {
        // Try MP4 MIME types
        if (MediaRecorder.isTypeSupported('video/mp4;codecs=avc1.42E01E,mp4a.40.2')) {
          mimeType = 'video/mp4;codecs=avc1.42E01E,mp4a.40.2';
          console.log('✅ Using MP4 (H.264/AAC)');
        } else if (MediaRecorder.isTypeSupported('video/mp4')) {
          mimeType = 'video/mp4';
          console.log('✅ Using MP4 (Generic)');
        } else {
          console.warn('⚠️ MP4 not supported by this browser. Falling back to WebM.');
          // Fallback handled below
        }
      }

      if (exportSettings.format === 'webm' || !mimeType.includes('mp4')) {
        if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')) {
          mimeType = 'video/webm;codecs=vp9,opus';
          console.log('✅ Using VP9 codec');
        } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')) {
          mimeType = 'video/webm;codecs=vp8,opus';
          console.log('✅ Using VP8 codec');
        } else {
          mimeType = 'video/webm';
          console.log('⚠️ Using basic WebM codec');
        }
      }

      const options: MediaRecorderOptions = {
        mimeType,
        videoBitsPerSecond: exportSettings.quality === 'high' ? 25000000 : (exportSettings.quality === 'medium' ? 8000000 : 2500000),
        audioBitsPerSecond: 320000
      };

      console.log('📹 MediaRecorder options:', options);
      try {
        console.log('📹 Combined stream tracks:', combinedStream.getTracks().map(t => `${t.kind}:${t.readyState}`));

        const recorder = new MediaRecorder(combinedStream, options);
        console.log('✅ MediaRecorder created, state:', recorder.state);

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            console.log('Data available:', e.data.size);
            recordedChunksRef.current.push(e.data);
          }
        };

        recorder.onstop = () => {
          console.log('Recorder stopped. Chunks:', recordedChunksRef.current.length);

          // Stop all tracks to release resources
          if (recorder.stream) {
            recorder.stream.getTracks().forEach(track => track.stop());
          }

          // Reconnect audio to speakers after export
          exportClips.forEach(clip => {
            const source = audioSourceNodesRef.current.get(clip.assetId);
            if (source) {
              try { source.disconnect(); source.connect(audioContext.destination); } catch (e) { }
            }
          });

          if (recordedChunksRef.current.length > 0) {
            try {
              const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';
              const fileType = mimeType.includes('mp4') ? 'video/mp4' : 'video/webm';

              const blob = new Blob(recordedChunksRef.current, { type: fileType });
              console.log('Blob created, size:', blob.size);

              if (blob.size > 1000) { // Check for meaningful data size
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${filename}.${extension}`;
                document.body.appendChild(a);
                console.log('Triggering download:', a.download);
                a.click();

                // Clean up after a short delay
                setTimeout(() => {
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }, 100);
              } else {
                console.warn('Exported file is too small, likely failed recording.');
              }
            } catch (err) {
              console.error('Download error:', err);
            }
          } else {
            console.warn('No chunks recorded, skipping download');
          }

          if (onExportFinish) onExportFinish();
        };

        // Use timeslice to ensure data is periodically flushed. 
        // This is often more reliable than a single huge blob for browser memory.
        recorder.start(1000);
        mediaRecorderRef.current = recorder;

        let exportTime = exportSettings.startTime || 0;
        const endTime = exportSettings.endTime || 0;
        const frameDuration = 1 / fps;
        let frameCount = 0;

        // Loop control with drift compensation
        let expectedTime = performance.now();
        const targetFrameMs = 1000 / fps;

        console.log('Export loop starting:', { exportTime, endTime, duration: endTime - exportTime, fps });

        // Ensure AudioContext is running (browsers might suspend it)
        if (audioContext.state === 'suspended') {
          audioContext.resume();
        }

        const processFrame = () => {
          // Safety check: if user cancelled or component unmounted
          if (mediaRecorderRef.current?.state === 'inactive' || exportStatus !== 'exporting') {
            return;
          }

          if (exportTime >= endTime) {
            console.log(`Export complete: ${frameCount} frames rendered`);
            if (recorder.state !== 'inactive') {
              console.log('Stopping recorder...');
              recorder.stop();
            }
            return;
          }

          // 1. Render Video Frame
          try {
            const ctx = canvas.getContext('2d');
            if (ctx) {
              renderCanvas(ctx, clips, assets, mediaCache.current, exportTime, canvas.width, canvas.height);
            }
          } catch (renderErr) {
            console.error('Render error at', exportTime, renderErr);
            // Continue despite error to avoid hanging
          }

          // 2. Sync Audio
          exportClips.forEach(clip => {
            const media = mediaCache.current.get(clip.assetId);
            if (media && (media instanceof HTMLAudioElement || media instanceof HTMLVideoElement)) {
              if (exportTime >= clip.start && exportTime < clip.start + clip.duration) {
                const clipTime = exportTime - clip.start + clip.offset;

                if (Math.abs(media.currentTime - clipTime) > 0.1) {
                  media.currentTime = clipTime;
                }

                if (media.paused) {
                  media.play().catch(e => { });
                }
                media.muted = false;
              } else {
                if (!media.paused) media.pause();
              }
            }
          });

          if (onExportProgress && endTime > 0) {
            const p = Math.min(100, Math.max(0, (exportTime / endTime) * 100));
            onExportProgress(p);
          }

          exportTime += frameDuration;
          frameCount++;

          // Compensate for drift
          expectedTime += targetFrameMs;
          let delay = Math.max(0, expectedTime - performance.now());
          setTimeout(processFrame, delay); // Using calculated delay instead of fixed targetFrameMs
        };

        // Start processing
        setTimeout(processFrame, 0);
      } catch (err) {
        console.error('MediaRecorder initialization error:', err);
        if (onExportFinish) onExportFinish();
      }
    }

    // Cleanup function
    return () => {
      // Force cleanup if component unmounts or status changes mid-export
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        console.log('Cleanup: Stopping active recorder');
        mediaRecorderRef.current.stop();
        // Tracks will be stopped by onstop handler
      }
    };
  }, [exportStatus]); // Only depend on exportStatus

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
    <div className="flex flex-col h-full bg-[#000000]">
      <div className="flex-1 relative flex items-center justify-center overflow-hidden p-8 bg-[#09090b]">
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
      <div className="h-14 bg-[#18181b] border-t border-[#27272a] flex items-center justify-center gap-6 px-4">
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
