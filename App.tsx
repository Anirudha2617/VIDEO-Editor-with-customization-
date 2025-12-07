
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Timeline from './components/Timeline';
import Player from './components/Player';
import AssetLibrary from './components/AssetLibrary';
import PropertiesPanel from './components/PropertiesPanel';
import ExportPanel from './components/ExportPanel';
import { Asset, Clip, MediaType, Track, ExportSettings, Effect, AnimationType, Project, CustomFont } from './types';
import { Download, Share2, Loader2, CheckCircle2, Undo2, Redo2, Copy, ClipboardPaste, Save, Upload } from 'lucide-react';
import { useEditorHistory } from './hooks/useEditorHistory';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useAutosave } from './hooks/useAutosave';
import { saveProject, loadProject, loadAutosave, exportProject, importProject } from './services/projectService';

const INITIAL_TRACKS: Track[] = [
  { id: 't1', type: MediaType.VIDEO, name: 'Video Track 1' },
  { id: 't2', type: MediaType.IMAGE, name: 'Overlay / B-Roll' },
  { id: 't3', type: MediaType.TEXT, name: 'Text / Titles' },
  { id: 't4', type: MediaType.AUDIO, name: 'Audio Main' },
];

const INITIAL_ASSETS: Asset[] = [
  { id: 'a1', type: MediaType.IMAGE, src: 'https://picsum.photos/800/450?random=1', name: 'Sample Landscape' },
  { id: 'a2', type: MediaType.IMAGE, src: 'https://picsum.photos/800/450?random=2', name: 'Urban Shot' },
];

function App() {
  const [tracks, setTracks] = useState<Track[]>(INITIAL_TRACKS);
  const [assets, setAssets] = useState<Asset[]>(INITIAL_ASSETS);
  const [clips, setClips] = useState<Clip[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(300);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedClipIds, setSelectedClipIds] = useState<string[]>([]);
  const [clipboard, setClipboard] = useState<Clip[]>([]);
  const [zoom, setZoom] = useState(100);
  const [canvasWidth, setCanvasWidth] = useState(1280);
  const [canvasHeight, setCanvasHeight] = useState(720);
  const [customFonts, setCustomFonts] = useState<CustomFont[]>([]);
  const [projectName, setProjectName] = useState('Untitled Project');

  const [showExportPanel, setShowExportPanel] = useState(false);
  const [exportStatus, setExportStatus] = useState<'idle' | 'exporting' | 'completed' | 'cancelled'>('idle');
  const [exportProgress, setExportProgress] = useState(0);
  const [exportSettings, setExportSettings] = useState<ExportSettings>({ resolution: '1080p', quality: 'high', filename: 'video', startTime: 0, endTime: 0, fps: 30 });

  // Autosave integration
  const { saveStatus, lastSaved, manualSave } = useAutosave({
    projectName,
    assets,
    clips,
    customTransitions: [],
    customEffects: [],
    scripts: [],
    settings: {
      duration,
      fps: exportSettings.fps,
      resolution: { width: canvasWidth, height: canvasHeight }
    }
  }, true, 2000);

  const { addToHistory, undo, redo, historyIndex, historyLength, initHistory } = useEditorHistory(setClips, setTracks, clips, tracks);
  useEffect(() => { initHistory(); }, []);

  // State updates wrapper for history
  const updateClips = (newClips: Clip[]) => {
    setClips(newClips);
    addToHistory(newClips, tracks);
  };

  // Actions
  const handleCopy = () => {
    const selected = clips.filter(c => selectedClipIds.includes(c.id));
    if (selected.length > 0) setClipboard(selected);
  };

  const handlePaste = () => {
    if (clipboard.length === 0) return;
    const minStart = Math.min(...clipboard.map(c => c.start));
    const offset = currentTime - minStart;
    const newClips = clipboard.map(c => ({ ...c, id: crypto.randomUUID(), start: Math.max(0, c.start + offset), name: `${c.name} (Copy)` }));
    updateClips([...clips, ...newClips]);
    setSelectedClipIds(newClips.map(c => c.id));
  };

  const handleDeleteClip = () => {
    if (selectedClipIds.length === 0) return;
    updateClips(clips.filter(c => !selectedClipIds.includes(c.id)));
    setSelectedClipIds([]);
  };

  const handleSplitClip = () => {
    if (selectedClipIds.length === 0) return;

    const newClips: Clip[] = [];
    const clipsToRemove: string[] = [];

    selectedClipIds.forEach(clipId => {
      const clip = clips.find(c => c.id === clipId);
      if (!clip) return;

      // Check if current time is within the clip's range
      if (currentTime > clip.start && currentTime < clip.start + clip.duration) {
        // Calculate the split point
        const splitPoint = currentTime - clip.start;

        // Create first half (keep original clip, just shorten it)
        const firstHalf: Clip = {
          ...clip,
          duration: splitPoint
        };

        // Create second half (new clip)
        const secondHalf: Clip = {
          ...clip,
          id: crypto.randomUUID(),
          start: currentTime,
          duration: clip.duration - splitPoint,
          offset: clip.offset + splitPoint, // Adjust offset for video/audio
          name: `${clip.name} (Split)`
        };

        newClips.push(firstHalf, secondHalf);
        clipsToRemove.push(clipId);
      }
    });

    if (newClips.length > 0) {
      // Remove original clips and add split clips
      const updatedClips = clips.filter(c => !clipsToRemove.includes(c.id)).concat(newClips);
      updateClips(updatedClips);

      // Select the second half clips
      const secondHalfIds = newClips.filter((_, i) => i % 2 === 1).map(c => c.id);
      setSelectedClipIds(secondHalfIds);
    }
  };

  const handleDetachAudio = () => {
    if (selectedClipIds.length === 0) return;

    const newClips: Clip[] = [];
    const updatedClips: Clip[] = [];

    selectedClipIds.forEach(clipId => {
      const clip = clips.find(c => c.id === clipId);
      if (!clip || clip.type !== MediaType.VIDEO) return;
      if (clip.hasAudio === false) return; // Already detached

      // Find an audio track (or use the first AUDIO track)
      let audioTrackId = tracks.find(t => t.type === MediaType.AUDIO)?.id;
      if (!audioTrackId) {
        // If no audio track, use the same track
        audioTrackId = clip.trackId;
      }

      // Create audio clip from video
      const audioClip: Clip = {
        ...clip,
        id: crypto.randomUUID(),
        type: MediaType.AUDIO,
        trackId: audioTrackId,
        name: `${clip.name} (Audio)`,
        linkedClipId: clip.id,
        // Remove visual properties for audio
        x: undefined,
        y: undefined,
        scale: undefined,
        rotation: undefined,
      };

      // Update original video clip to mark audio as detached
      const videoClip: Clip = {
        ...clip,
        hasAudio: false,
        linkedClipId: audioClip.id,
      };

      newClips.push(audioClip);
      updatedClips.push(videoClip);
    });

    if (newClips.length > 0) {
      // Update existing clips and add new audio clips
      const finalClips = clips.map(c => {
        const updated = updatedClips.find(u => u.id === c.id);
        return updated || c;
      }).concat(newClips);

      updateClips(finalClips);

      // Select the new audio clips
      setSelectedClipIds(newClips.map(c => c.id));
    }
  };

  const handleNudge = (isShift: boolean, isAlt: boolean, direction: number) => {
    const delta = direction * (isShift ? 0.5 : isAlt ? 0.001 : 0.05);
    const newClips = clips.map(c => selectedClipIds.includes(c.id) ? { ...c, start: Math.max(0, c.start + delta) } : c);
    updateClips(newClips);
  };

  // Timer Focus Ref
  const timerInputRef = useRef<HTMLInputElement>(null);

  const handleTogglePlay = () => {
    setIsPlaying(prev => !prev);
  };

  const handleSeek = (amount: number) => {
    setCurrentTime(prev => {
      const next = Math.max(0, Math.min(duration, prev + amount));
      return next;
    });
  };

  const handleFocusTimer = () => {
    if (selectedClipIds.length > 0 && timerInputRef.current) {
      timerInputRef.current.focus();
      timerInputRef.current.select();
    }
  };

  useKeyboardShortcuts(exportStatus === 'idle', {
    undo: () => { undo(); },
    redo: () => { redo(); },
    copy: handleCopy,
    paste: handlePaste,
    delete: handleDeleteClip,
    split: handleSplitClip,
    nudgeLeft: (s, a) => handleNudge(s, a, -1),
    nudgeRight: (s, a) => handleNudge(s, a, 1),
    togglePlay: handleTogglePlay,
    seekForward: handleSeek,
    seekBackward: (amount) => handleSeek(-amount),
    deselectAll: () => setSelectedClipIds([]),
    focusTimer: handleFocusTimer
  });

  // Playback
  const lastFrameTime = useRef<number>(0);
  const requestRef = useRef<number>();
  const animate = useCallback((time: number) => {
    if (lastFrameTime.current !== 0) {
      const deltaTime = (time - lastFrameTime.current) / 1000;
      setCurrentTime(prev => {
        // If exporting, do NOT update time here. Player handles it.
        if (exportStatus === 'exporting') {
          return prev;
        }
        const next = prev + deltaTime;
        if (next >= duration) { setIsPlaying(false); return duration; }
        return next;
      });
    }
    lastFrameTime.current = time;
    if (isPlaying && exportStatus !== 'exporting') requestRef.current = requestAnimationFrame(animate);
  }, [isPlaying, duration, exportStatus]);

  useEffect(() => {
    if (isPlaying) { lastFrameTime.current = 0; requestRef.current = requestAnimationFrame(animate); }
    else if (requestRef.current) cancelAnimationFrame(requestRef.current);
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [isPlaying, animate]);

  // Asset Handlers
  const handleAddAsset = (asset: Asset) => setAssets(prev => [...prev, asset]);
  const handleUploadFont = (font: CustomFont) => setCustomFonts(prev => [...prev, font]);
  const handleDragStart = (e: React.DragEvent, asset: Asset) => {
    e.dataTransfer.setData('assetId', asset.id);
    e.dataTransfer.setData('dragType', 'asset');
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDropAsset = (assetId: string, trackId: string, time: number) => {
    console.log('[App] handleDropAsset called:', { assetId, trackId, time });

    let asset = assets.find(a => a.id === assetId);
    if (!asset && assetId.startsWith('txt_')) asset = { id: assetId, type: MediaType.TEXT, src: '', name: 'Text' };
    if (!asset && assetId.startsWith('shape_')) {
      // Handle shape drops
      const shapeType = assetId.split('_')[1] as 'rectangle' | 'circle' | 'arrow' | 'star';
      console.log('[App] Creating shape asset:', { assetId, shapeType });
      asset = { id: assetId, type: MediaType.SHAPE, src: '', name: shapeType.charAt(0).toUpperCase() + shapeType.slice(1) };
    }
    if (!asset) {
      console.error('[App] Asset not found:', assetId);
      return;
    }

    console.log('[App] Creating clip for asset:', asset);
    const newClip: Clip = {
      id: crypto.randomUUID(), assetId: asset.id, trackId, start: time, duration: 5, offset: 0,
      name: asset.name, type: asset.type, src: asset.src, scale: 1, opacity: 1, x: 0, y: 0, rotation: 0,
      text: asset.type === MediaType.TEXT ? 'New Text' : undefined,
      fontSize: 60, fontColor: '#ffffff',
      // Shape properties
      shapeType: asset.type === MediaType.SHAPE ? (assetId.split('_')[1] as any) : undefined,
      fillColor: asset.type === MediaType.SHAPE ? '#3b82f6' : undefined,
      strokeColor: asset.type === MediaType.SHAPE ? '#ffffff' : undefined,
      strokeWidth: asset.type === MediaType.SHAPE ? 2 : undefined,
      borderRadius: asset.type === MediaType.SHAPE ? 0 : undefined,
      effects: [], animationDuration: 1
    };
    console.log('[App] New clip created:', newClip);
    updateClips([...clips, newClip]);
    if (time + 5 > duration) setDuration(time + 15);
    setSelectedClipIds([newClip.id]); setCurrentTime(time);
  };

  const handleCreateEffectClip = (effect: Effect, trackId: string, time: number) => {
    const newClip: Clip = { id: crypto.randomUUID(), assetId: 'fx_' + effect.id, trackId, start: time, duration: 3, offset: 0, name: effect.name, type: MediaType.EFFECT, src: '', effects: [effect], animationDuration: 0 };
    updateClips([...clips, newClip]);
    setSelectedClipIds([newClip.id]); setCurrentTime(time);
  };

  const handleCreateAnimationClip = (animType: AnimationType, trackId: string, time: number, options?: any) => {
    const newClip: Clip = {
      id: crypto.randomUUID(), assetId: 'anim_' + animType, trackId, start: time, duration: options?.duration || 1.0, offset: 0,
      name: animType.charAt(0).toUpperCase() + animType.slice(1), type: MediaType.ANIMATION, src: '', effects: [],
      animationType: animType, animationDuration: 0, easing: options?.easing
    };
    updateClips([...clips, newClip]);
    setSelectedClipIds([newClip.id]); setCurrentTime(time);
  };

  const handleClipUpdate = (clipId: string, updates: Partial<Clip>) => {
    setClips(prev => prev.map(c => c.id === clipId ? { ...c, ...updates } : c));
    // Debounce history here if needed, or handle in mouseUp
  };

  const startExport = () => {
    setExportStatus('exporting');
    setExportProgress(0);
    setCurrentTime(exportSettings.startTime);
    setIsPlaying(true);
  };

  const cancelExport = () => {
    setExportStatus('cancelled');
    setIsPlaying(false);
  };

  const selectedClips = clips.filter(c => selectedClipIds.includes(c.id));

  const handleSaveProject = () => {
    try {
      const project: Project = {
        id: crypto.randomUUID(),
        name: 'My Project',
        version: '1.0.0',
        lastModified: Date.now(),
        state: {
          tracks,
          clips,
          assets,
          duration,
          exportSettings,
          canvasWidth,
          canvasHeight,
          customFonts
        }
      };

      const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lumina-project-${new Date().toISOString().slice(0, 10)}.lumina`;
      document.body.appendChild(a);
      a.click();

      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);

      // Visual feedback
      alert('Project saved successfully! Check your downloads folder.');
    } catch (err) {
      console.error('Save project error:', err);
      alert('Failed to save project: ' + (err as Error).message);
    }
  };

  const handleLoadProject = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const project = JSON.parse(content) as Project;

        // Basic validation
        if (!project.state || !Array.isArray(project.state.tracks) || !Array.isArray(project.state.clips)) {
          alert('Invalid project file');
          return;
        }

        // Restore state
        setTracks(project.state.tracks);
        setClips(project.state.clips);
        setAssets(project.state.assets);
        setDuration(project.state.duration);
        if (project.state.exportSettings) {
          setExportSettings(project.state.exportSettings);
        }
        // Restore canvas dimensions if available (backwards compatibility)
        if ((project.state as any).canvasWidth) setCanvasWidth((project.state as any).canvasWidth);
        if ((project.state as any).canvasHeight) setCanvasHeight((project.state as any).canvasHeight);

        if (project.state.customFonts) {
          setCustomFonts(project.state.customFonts);
          // Re-inject fonts
          project.state.customFonts.forEach(font => {
            const style = document.createElement('style');
            style.textContent = `
            @font-face {
              font-family: '${font.name}';
              src: url('${font.src}') format('${font.type === 'ttf' ? 'truetype' : 'opentype'}');
            }
          `;
            document.head.appendChild(style);
          });
        }

        // Reset selection and history
        setSelectedClipIds([]);
        // We might want to clear history or add this load as a history step

      } catch (err) {
        console.error('Failed to load project:', err);
        alert('Failed to load project file');
      }
    };
    reader.readAsText(file);
    // Reset input value so same file can be loaded again if needed
    e.target.value = '';
  };

  return (
    <div className="flex flex-col h-screen bg-[#000000] text-gray-200 font-sans selection:bg-blue-500/30">
      <header className="h-14 border-b border-white/10 flex items-center justify-between px-4 bg-[#09090b]/80 backdrop-blur-xl z-50 sticky top-0">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-xl shadow-lg shadow-purple-500/20 flex items-center justify-center font-bold text-white text-sm">L</div>
            <h1 className="font-bold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">Lumina</h1>
          </div>
          <div className="h-6 w-px bg-white/10 mx-2"></div>
          <div className="flex items-center gap-2">
            <div className="flex bg-[#18181b] rounded-lg p-1 border border-white/5 shadow-inner">
              <button onClick={undo} disabled={historyIndex <= 0} className="p-1.5 hover:bg-white/10 rounded-md text-gray-400 hover:text-white disabled:opacity-30 transition-all"><Undo2 size={14} /></button>
              <button onClick={redo} disabled={historyIndex >= historyLength - 1} className="p-1.5 hover:bg-white/10 rounded-md text-gray-400 hover:text-white disabled:opacity-30 transition-all"><Redo2 size={14} /></button>
            </div>
            <div className="flex bg-[#18181b] rounded-lg p-1 border border-white/5 shadow-inner">
              <button onClick={handleCopy} className="p-1.5 hover:bg-white/10 rounded-md text-gray-400 hover:text-white transition-all"><Copy size={14} /></button>
              <button onClick={handlePaste} className="p-1.5 hover:bg-white/10 rounded-md text-gray-400 hover:text-white transition-all"><ClipboardPaste size={14} /></button>
            </div>

            {/* Resolution Controls */}
            <div className="flex items-center gap-2 ml-4 bg-[#18181b] p-1 rounded-lg border border-white/5 px-2">
              <select
                className="bg-transparent text-xs font-medium text-gray-300 outline-none border-none cursor-pointer hover:text-white transition-colors py-1"
                value={`${canvasWidth}x${canvasHeight}`}
                onChange={(e) => {
                  const [w, h] = e.target.value.split('x').map(Number);
                  setCanvasWidth(w);
                  setCanvasHeight(h);
                }}
              >
                <option value="1920x1080">16:9 • 1080p</option>
                <option value="1280x720">16:9 • 720p</option>
                <option value="1080x1920">9:16 • Mobile</option>
                <option value="1080x1080">1:1 • Square</option>
                <option value="1080x1350">4:5 • Portrait</option>
              </select>
            </div>

            <div className="flex items-center gap-2 ml-2">
              <button onClick={handleSaveProject} className="flex items-center gap-2 px-3 py-1.5 bg-[#18181b] hover:bg-[#27272a] hover:text-white text-gray-400 rounded-lg text-xs font-medium transition-all border border-white/5 hover:border-white/10">
                <Save size={14} /> Save
              </button>
              <label className="flex items-center gap-2 px-3 py-1.5 bg-[#18181b] hover:bg-[#27272a] hover:text-white text-gray-400 rounded-lg text-xs font-medium transition-all border border-white/5 hover:border-white/10 cursor-pointer">
                <Upload size={14} /> Load
                <input type="file" accept=".lumina,.json" onChange={handleLoadProject} className="hidden" />
              </label>
            </div>
          </div>
        </div>
        <button onClick={() => {
          if (!showExportPanel) {
            // Calculate actual end time from clips
            const actualEndTime = clips.length > 0
              ? Math.max(...clips.map(c => c.start + c.duration))
              : duration;
            // Ensure we have a valid end time (minimum 1 second)
            const validEndTime = Math.max(actualEndTime, 1);
            console.log('Export settings:', { startTime: 0, endTime: validEndTime, clips: clips.length });
            setExportSettings(prev => ({ ...prev, startTime: 0, endTime: validEndTime }));
          }
          setShowExportPanel(!showExportPanel);
        }} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all transform hover:scale-105 active:scale-95"><Download size={14} /> Export Video</button>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <AssetLibrary
          assets={assets}
          onAddAsset={handleAddAsset}
          onDragStart={handleDragStart}
          onAddTextClip={(clip) => {
            // Find first text track or fallback to any track
            const trackId = tracks.find(t => t.type === MediaType.TEXT)?.id || tracks[0].id;

            // 1. Create the persistent Asset so it shows up in "My Text Assets"
            const newAsset: Asset = {
              id: `txt_${crypto.randomUUID()}`,
              type: MediaType.TEXT,
              name: clip.text || 'Custom Text',
              src: '',
            };
            handleAddAsset(newAsset);

            // 2. Add to Timeline with link to asset
            const newClip: Clip = {
              ...clip,
              id: crypto.randomUUID(),
              assetId: newAsset.id,
              trackId,
              start: currentTime,
              duration: 5,
              offset: 0,
              type: MediaType.TEXT,
              src: '',
              effects: [],
              animationDuration: 0.5
            } as Clip;

            updateClips([...clips, newClip]);
            setSelectedClipIds([newClip.id]);
          }}
        />
        <div className="flex-1 flex flex-col min-w-0 bg-[#000000]">
          <div className="flex-1 flex min-h-0 border-b border-[#27272a] relative">
            <div className="flex-1 bg-black/90 relative flex flex-col items-center justify-center p-8 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-900/50 to-black">
              <Player
                clips={clips}
                assets={assets}
                currentTime={currentTime}
                isPlaying={isPlaying}
                onTogglePlay={() => setIsPlaying(!isPlaying)}
                onSeek={setCurrentTime}
                duration={duration}
                exportStatus={exportStatus}
                exportSettings={exportSettings}
                onExportFinish={() => { setExportStatus('completed'); setIsPlaying(false); }}
                onExportProgress={setExportProgress}
                width={canvasWidth}
                height={canvasHeight}
              />
            </div>
            {showExportPanel ? <ExportPanel settings={exportSettings} onUpdateSettings={setExportSettings} onStartExport={startExport} onCancelExport={cancelExport} onClose={() => { setShowExportPanel(false); setExportStatus('idle'); }} isExporting={exportStatus === 'exporting'} progress={exportProgress} currentTime={currentTime} status={exportStatus} maxDuration={duration} /> :
              selectedClips.length > 0 ? <PropertiesPanel clips={selectedClips} allClips={clips} onUpdate={(u) => handleClipUpdate(selectedClips[0].id, u)} onDelete={handleDeleteClip} onDetachAudio={handleDetachAudio} onClose={() => setSelectedClipIds([])} onSeek={setCurrentTime} customFonts={customFonts} onUploadFont={handleUploadFont} timerInputRef={timerInputRef} /> : null}
          </div>
          <div className="h-[340px] flex-shrink-0 bg-[#09090b] relative z-20 shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.5)] border-t border-white/5">
            <Timeline tracks={tracks} clips={clips} currentTime={currentTime} duration={duration} zoom={zoom} onSeek={setCurrentTime} onClipUpdate={handleClipUpdate} selectedClipIds={selectedClipIds} onSelectClip={(id, multi) => { if (multi) { if (selectedClipIds.includes(id)) setSelectedClipIds(prev => prev.filter(i => i !== id)); else setSelectedClipIds(prev => [...prev, id]); } else { setSelectedClipIds([id]); } }} onClearSelection={() => setSelectedClipIds([])} onDropAsset={handleDropAsset} onCreateEffectClip={handleCreateEffectClip} onCreateAnimationClip={handleCreateAnimationClip} onSplitClip={handleSplitClip} onDeleteClip={handleDeleteClip} onZoomChange={setZoom} onClipMove={(id, start, track) => { setClips(prev => prev.map(c => c.id === id ? { ...c, start, trackId: track } : c)); }} onAddTrack={() => setTracks(prev => [...prev, { id: `t${prev.length + 1}`, type: MediaType.VIDEO, name: `Track ${prev.length + 1}` }])} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
