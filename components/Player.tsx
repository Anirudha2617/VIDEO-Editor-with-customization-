
import React, { useEffect, useRef, useState } from 'react';
import { Clip, MediaType, Asset, ExportSettings } from '../types';
import { Play, Pause, SkipBack, SkipForward, Maximize, Minimize } from 'lucide-react';
import { renderCanvas } from '../utils/renderer';

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
}

const Player: React.FC<PlayerProps> = ({
  clips, assets, currentTime, isPlaying, onTogglePlay, onSeek, duration, exportStatus, exportSettings, onExportFinish, onExportProgress, width = 1280, height = 720
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

  // Export Logic (Simplified for brevity in this step, logic preserved)
  // Export Logic
  useEffect(() => {
    if (!canvasRef.current) return;

    if (exportStatus === 'exporting' && exportSettings) {
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
      let options: MediaRecorderOptions = {
        videoBitsPerSecond: exportSettings.quality === 'high' ? 25000000 : (exportSettings.quality === 'medium' ? 8000000 : 2500000), // Increased quality significantly
        audioBitsPerSecond: 320000 // Increased audio quality
      };

      // Try vp9 with opus first, fall back to vp8
      if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')) {
        options.mimeType = 'video/webm;codecs=vp9,opus';
        console.log('✅ Using VP9 codec');
      } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')) {
        options.mimeType = 'video/webm;codecs=vp8,opus';
        console.log('✅ Using VP8 codec');
      } else if (MediaRecorder.isTypeSupported('video/webm')) {
        options.mimeType = 'video/webm';
        console.log('⚠️ Using basic WebM codec');
      }

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

          // Reconnect audio to speakers after export
          exportClips.forEach(clip => {
            const source = audioSourceNodesRef.current.get(clip.assetId);
            if (source) {
              try { source.disconnect(); source.connect(audioContext.destination); } catch (e) { }
            }
          });

          if (recordedChunksRef.current.length > 0) {
            try {
              const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
              console.log('Blob created, size:', blob.size);

              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${filename}.webm`;
              document.body.appendChild(a);
              console.log('Triggering download:', a.download);
              a.click();

              // Clean up after a short delay
              setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }, 100);
            } catch (err) {
              console.error('Download error:', err);
            }
          } else {
            console.warn('No chunks recorded, skipping download');
          }

          // Note: We keep the AudioContext open for reuse in subsequent exports

          if (onExportFinish) onExportFinish();
        };

        // Start recording without timeslice to ensure we get a single blob on stop (or fewer chunks)
        // This is often more reliable for short videos or when timeslice causes issues
        recorder.start();
        mediaRecorderRef.current = recorder;

        let exportTime = exportSettings.startTime || 0;
        const endTime = exportSettings.endTime || 0;
        const frameDuration = 1 / fps;
        let frameCount = 0;
        // Use a slightly faster interval than frame duration to ensure we don't lag behind, 
        // but not too fast to overwhelm the browser.
        // Actually, for export we want to be as fast as possible but wait for render.
        // Since we are using captureStream(fps), the canvas needs to update at that rate.
        const targetFrameMs = 1000 / fps;

        console.log('Export loop starting:', { exportTime, endTime, duration: endTime - exportTime, fps });
        console.log('Stream active:', combinedStream.active);
        console.log('Stream tracks:', combinedStream.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled, readyState: t.readyState })));

        const processFrame = () => {
          if (exportTime >= endTime) {
            console.log(`Export complete: ${frameCount} frames rendered`);
            if (recorder.state !== 'inactive') {
              console.log('Stopping recorder...');
              recorder.requestData(); // Force any pending data to be emitted
              recorder.stop();
            }
            return;
          }

          // 1. Render Video Frame
          const ctx = canvas.getContext('2d');
          if (ctx) {
            renderCanvas(ctx, clips, assets, mediaCache.current, exportTime, canvas.width, canvas.height);
          }

          // 2. Sync Audio
          // We need to manually advance audio elements to the current export time
          // and ensure they are playing if they should be audible.
          // Note: captureStream captures what is playing. If we just seek, it might not capture audio "flow".
          // Ideally for perfect audio export we should use WebAudio API to schedule buffers, but that's complex.
          // For now, we try to play the audio elements in sync.

          exportClips.forEach(clip => {
            const media = mediaCache.current.get(clip.assetId);
            if (media && (media instanceof HTMLAudioElement || media instanceof HTMLVideoElement)) {
              // Is this clip active at this exact moment?
              if (exportTime >= clip.start && exportTime < clip.start + clip.duration) {
                const clipTime = exportTime - clip.start + clip.offset;

                // Sync time if drifted
                if (Math.abs(media.currentTime - clipTime) > 0.1) {
                  media.currentTime = clipTime;
                }

                // Ensure playing
                if (media.paused) {
                  media.play().catch(e => { }); // Ignore play errors (e.g. waiting for data)
                }

                // Ensure unmuted (for the stream)
                media.muted = false;
                // Volume? We assume 1.0 or clip volume (not yet implemented fully in renderer/types)
              } else {
                // Not active, pause it
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

          // Use setTimeout to control the speed of export. 
          // We can't go faster than real-time if we rely on media.play() for audio capture!
          // If we want faster-than-realtime audio export, we MUST use WebAudio OfflineAudioContext, 
          // but that requires decoding all assets first.
          // For now, we stick to real-time export to capture audio correctly via MediaStreamDestination.
          setTimeout(processFrame, targetFrameMs);
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
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        console.log('Cleaning up MediaRecorder');
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current = null;
      }
    };
  }, [exportStatus]); // Only depend on exportStatus to prevent infinite loop

  // Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isReady) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    renderCanvas(ctx, clips, assets, mediaCache.current, currentTime, canvas.width, canvas.height);

  }, [currentTime, clips, isReady, exportStatus, assets]);

  // Audio/Video Playback Synchronization
  useEffect(() => {
    if (!isReady || exportStatus === 'exporting') return;

    // Get all active clips at current time
    const activeClips = clips.filter(
      clip => currentTime >= clip.start && currentTime < clip.start + clip.duration
    );

    // Sync all media elements
    mediaCache.current.forEach((media, assetId) => {
      if (media instanceof HTMLVideoElement || media instanceof HTMLAudioElement) {
        // Find if this media is active
        const activeClip = activeClips.find(c => c.assetId === assetId);

        if (activeClip) {
          const clipTime = currentTime - activeClip.start + activeClip.offset;

          // Sync the current time if it's off by more than 0.3 seconds
          if (Math.abs(media.currentTime - clipTime) > 0.3) {
            media.currentTime = clipTime;
          }

          // Mute videos that have been audio-detached
          if (media instanceof HTMLVideoElement && activeClip.hasAudio === false) {
            media.muted = true;
          }

          // Play/pause based on isPlaying state
          if (isPlaying) {
            if (media.paused) {
              media.play().catch(err => console.log('Play failed:', err));
            }
          } else {
            if (!media.paused) {
              media.pause();
            }
          }
        } else {
          // Not active, ensure it's paused
          if (!media.paused) {
            media.pause();
          }
        }
      }
    });
  }, [currentTime, isPlaying, clips, isReady, exportStatus]);

  // Mute audio during export
  useEffect(() => {
    mediaCache.current.forEach((media) => {
      if (media instanceof HTMLVideoElement || media instanceof HTMLAudioElement) {
        media.muted = exportStatus === 'exporting';
      }
    });
  }, [exportStatus]);

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
