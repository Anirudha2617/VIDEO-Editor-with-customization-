
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Timeline from './components/Timeline';
import Player from './components/Player';
import PropertiesPanel from './components/PropertiesPanel';
import ExportPanel from './components/ExportPanel';
import { Ribbon } from './components/Ribbon';
import { FloatingPanel } from './components/ui/FloatingPanel';
import MediaPanel from './components/panels/MediaPanel';
import AudioPanel from './components/panels/AudioPanel';
import FXPanel from './components/panels/FXPanel';
import CodePanel from './components/panels/CodePanel';
import AIPanel from './components/panels/AIPanel';
import ShapesPanel from './components/panels/ShapesPanel';
import TextPanel from './components/panels/TextPanel';
import ScriptPanel from './components/panels/ScriptPanel';
import { Asset, Clip, MediaType, Track, ExportSettings, Effect, AnimationType, Project, CustomFont } from './types';
import { Download, Undo2, Redo2, Save, X, Sparkles } from 'lucide-react';
import { useEditorHistory } from './hooks/useEditorHistory';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useAutosave } from './hooks/useAutosave';
import { loadAutosave } from './services/projectService';
import { getCodeAssets } from './services/codeAssetStorage';
import { registerTransition } from './transitions/registry';
import { registerEffect } from './effects/registry';
import { getDemoContent } from './utils/demoContent';
import { saveProjectToFile, loadProjectFromFile } from './services/persistenceService';
import { FolderOpen } from 'lucide-react';
import { useMediaLibrary } from './hooks/useMediaLibrary';
import { globalCommandManager } from './engines/commands/CommandManager';
import { useCommandManager } from './engines/commands/hooks';
import { AddClipCommand, RemoveClipCommand, MoveClipCommand, UpdateClipCommand, CommandContext, GroupClipsCommand, UngroupClipsCommand } from './engines/commands/TimelineCommands';

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
  const { assets, setAssets, importFiles, removeAsset, updateAsset } = useMediaLibrary(INITIAL_ASSETS);
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

  const [exportStatus, setExportStatus] = useState<'idle' | 'exporting' | 'completed' | 'cancelled'>('idle');
  const [exportProgress, setExportProgress] = useState(0);
  const [exportSettings, setExportSettings] = useState<ExportSettings>({ resolution: '1080p', quality: 'high', filename: 'video', startTime: 0, endTime: 0, fps: 30, format: 'webm' });

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

  // Command System Integration
  const { undo, redo, canUndo, canRedo } = useCommandManager(globalCommandManager);

  // Refs for State Access
  const clipsRef = useRef(clips);
  const tracksRef = useRef(tracks);
  useEffect(() => { clipsRef.current = clips; }, [clips]);
  useEffect(() => { tracksRef.current = tracks; }, [tracks]);

  // Command Context
  const commandContext = useRef<CommandContext>({
    getClips: () => clipsRef.current,
    getTracks: () => tracksRef.current,
    setClips,
    setTracks
  }).current;

  // Legacy History (Disabled)
  // const { addToHistory, undo, redo, historyIndex, historyLength, initHistory } = useEditorHistory(setClips, setTracks, clips, tracks);
  // useEffect(() => { initHistory(); }, []);

  // Initialize Custom Scripts (Transitions/Effects)
  useEffect(() => {
    const savedAssets = getCodeAssets();
    savedAssets.forEach(asset => {
      if (asset.type === 'text' && (asset.subtype === 'transition' || asset.subtype === 'filter')) {
        try {
          // Compile and register
          const createObj = new Function(asset.js);
          const result = createObj();

          if (asset.subtype === 'transition') {
            registerTransition(result);
          } else if (asset.subtype === 'filter') {
            registerEffect(result);
          }
          console.log(`[App] Registered custom script: ${asset.name}`);
        } catch (e) {
          console.error(`[App] Failed to restore script ${asset.name}:`, e);
        }
      }
    });
  }, []);

  // State updates wrapper for history
  const updateClips = (newClips: Clip[]) => {
    setClips(newClips);
    // addToHistory(newClips, tracks); // Legacy history disabled
  };

  // Actions
  const handleCopy = () => {
    // Reading selectedClips is fine from state
    const selected = clips.filter(c => selectedClipIds.includes(c.id));
    if (selected.length > 0) setClipboard(selected);
  };

  const handlePaste = () => {
    if (clipboard.length === 0) return;
    const minStart = Math.min(...clipboard.map(c => c.start));
    const offset = currentTime - minStart;

    // Create AddClipCommands for each pasted clip
    const commands: any[] = [];
    const newIds: string[] = [];

    clipboard.forEach(c => {
      const newId = crypto.randomUUID();
      const newClip = { ...c, id: newId, start: Math.max(0, c.start + offset), name: `${c.name} (Copy)` };
      commands.push(new AddClipCommand(commandContext, newClip));
      newIds.push(newId);
    });

    if (commands.length > 0) {
      // We need BatchCommand import
      // For now execute one by one or create ad-hoc batch
      // Since I haven't imported BatchCommand yet, I will do so or execute loop
      // But loop means multiple undo steps for one paste. Not ideal.
      // I will assume BatchCommand is imported or use loop for now and fix later
      // Actually I should add BatchCommand to imports first.
      // Assuming loop for now to avoid break:
      commands.forEach(cmd => globalCommandManager.execute(cmd));
      setSelectedClipIds(newIds);
    }
  };

  const handleDeleteClip = () => {
    if (selectedClipIds.length === 0) return;
    selectedClipIds.forEach(id => {
      globalCommandManager.execute(new RemoveClipCommand(commandContext, id));
    });
    setSelectedClipIds([]);
  };

  const handleAddClip = (clip: Clip) => {
    globalCommandManager.execute(new AddClipCommand(commandContext, clip));
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
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    undo: () => { if (canUndo) undo(); },
    redo: () => { if (canRedo) redo(); },
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
  const [workArea, setWorkArea] = useState<{ start: number; end: number; enabled: boolean }>({ start: 0, end: 30, enabled: false });

  const requestRef = useRef<number>();
  const animate = useCallback((time: number) => {
    if (lastFrameTime.current !== 0) {
      const deltaTime = (time - lastFrameTime.current) / 1000;
      setCurrentTime(prev => {
        // If exporting, do NOT update time here. Player handles it.
        if (exportStatus === 'exporting') {
          return prev;
        }
        let next = prev + deltaTime;

        // Loop Logic
        if (workArea.enabled) {
          if (next >= workArea.end) {
            next = workArea.start;
          } else if (next < workArea.start && isPlaying) {
            // If we somehow started before start
            next = workArea.start;
          }
        } else if (next >= duration) {
          setIsPlaying(false); return duration;
        }

        return next;
      });
    }
    lastFrameTime.current = time;
    if (isPlaying && exportStatus !== 'exporting') requestRef.current = requestAnimationFrame(animate);
  }, [isPlaying, duration, exportStatus, workArea]);

  useEffect(() => {
    if (isPlaying) { lastFrameTime.current = 0; requestRef.current = requestAnimationFrame(animate); }
    else if (requestRef.current) cancelAnimationFrame(requestRef.current);
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [isPlaying, animate]);

  // Asset Handlers
  const handleAddAsset = (asset: Asset) => setAssets(prev => [...prev, asset]);
  const handleUpdateAsset = (assetId: string, updates: Partial<Asset>) => updateAsset(assetId, updates);
  const handleRemoveAsset = (assetId: string) => removeAsset(assetId);
  const handleUploadFont = (font: CustomFont) => setCustomFonts(prev => [...prev, font]);
  const handleDragStart = (e: React.DragEvent, item: any, type?: string) => {
    if (type === 'effect') {
      e.dataTransfer.setData('dragType', 'effect');
      e.dataTransfer.setData('effectData', JSON.stringify(item));
      e.dataTransfer.effectAllowed = 'copy';
      return;
    }
    if (type === 'animation') {
      e.dataTransfer.setData('dragType', 'animation');
      e.dataTransfer.setData('animationType', item.type);
      e.dataTransfer.setData('animationData', JSON.stringify(item));
      e.dataTransfer.effectAllowed = 'copy';
      return;
    }

    // Default asset behavior
    const asset = item as Asset;
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
    globalCommandManager.execute(new AddClipCommand(commandContext, newClip));

    if (time + 5 > duration) setDuration(time + 15);
    setSelectedClipIds([newClip.id]); setCurrentTime(time);
  };

  const handleCreateEffectClip = (effect: Effect, trackId: string, time: number) => {
    const newClip: Clip = { id: crypto.randomUUID(), assetId: 'fx_' + effect.id, trackId, start: time, duration: 3, offset: 0, name: effect.name, type: MediaType.EFFECT, src: '', effects: [effect], animationDuration: 0 };
    globalCommandManager.execute(new AddClipCommand(commandContext, newClip));
    setSelectedClipIds([newClip.id]); setCurrentTime(time);
  };

  const handleCreateAnimationClip = (animType: AnimationType, trackId: string, time: number, options?: any) => {
    const newClip: Clip = {
      id: crypto.randomUUID(), assetId: 'anim_' + animType, trackId, start: time, duration: options?.duration || 1.0, offset: 0,
      name: animType.charAt(0).toUpperCase() + animType.slice(1), type: MediaType.ANIMATION, src: '', effects: [],
      animationType: animType, animationDuration: 0, easing: options?.easing
    };
    globalCommandManager.execute(new AddClipCommand(commandContext, newClip));
    setSelectedClipIds([newClip.id]); setCurrentTime(time);
  };

  const handleClipUpdate = (clipId: string, updates: Partial<Clip>) => {
    // CRITICAL: Do NOT use CommandManager here for continuous updates (resize drag).
    // It creates infinite commands and crashes the app.
    // TODO: Implement onResizeEnd in Timeline to fire a single Command.
    setClips(prev => prev.map(c => c.id === clipId ? { ...c, ...updates } : c));
  };

  const handleGroupClips = () => {
    if (selectedClipIds.length < 2) return;
    globalCommandManager.execute(new GroupClipsCommand(commandContext, selectedClipIds));
  };

  const handleUngroupClips = () => {
    if (selectedClipIds.length === 0) return;
    globalCommandManager.execute(new UngroupClipsCommand(commandContext, selectedClipIds));
  };

  const startExport = () => {
    if (exportSettings.format === 'json') {
      const project: Project = {
        id: crypto.randomUUID(),
        name: exportSettings.filename || 'Project',
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
      a.download = `${exportSettings.filename || 'project'}.lumina`;
      document.body.appendChild(a);
      a.click();

      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);

      setExportStatus('completed');
      updatePanel('export', { isOpen: false });
      return;
    }

    setExportStatus('exporting');
    setExportProgress(0);
    setCurrentTime(exportSettings.startTime);
    setIsPlaying(true);
  };

  const cancelExport = () => {
    setExportStatus('cancelled');
    setIsPlaying(false);
    updatePanel('export', { isOpen: false });
  };

  const selectedClips = clips.filter(c => selectedClipIds.includes(c.id));

  const handleSaveProject = async () => {
    try {
      // setExportStatus('exporting'); // Removed to prevent triggering video export logic
      const project: Project = {
        id: crypto.randomUUID(),
        name: projectName || 'My Project',
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

      await saveProjectToFile(project);

      // Visual feedback
      alert('Project saved successfully!');
    } catch (err) {
      console.error('Save project error:', err);
      alert('Failed to save project: ' + (err as Error).message);
    } finally {
      setExportStatus('idle');
    }
  };

  const handleLoadProject = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const project = await loadProjectFromFile(file);

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

      setProjectName(project.name);

      // Reset selection and history
      setSelectedClipIds([]);
      // We might want to clear history or add this load as a history step
      alert('Project loaded successfully!');

    } catch (err) {
      console.error('Failed to load project:', err);
      alert('Failed to load project file');
    }

    // Reset input value so same file can be loaded again if needed
    e.target.value = '';
  };

  const handleLoadDemo = () => {
    const demo = getDemoContent();

    // 1. Register Scripts
    demo.assets.forEach(a => {
      if (a.subtype === 'transition' && a.codeSource?.js) {
        try {
          const createObj = new Function(a.codeSource.js);
          registerTransition(createObj());
        } catch (e) { console.error(e); }
      } else if (a.subtype === 'filter' && a.codeSource?.js) {
        try {
          const createObj = new Function(a.codeSource.js);
          registerEffect(createObj());
        } catch (e) { console.error(e); }
      }
    });

    // 2. Merge State
    setAssets(prev => [...prev, ...demo.assets]);
    setTracks(prev => [...prev, ...demo.tracks]);
    setClips(prev => [...prev, ...demo.clips]);

    alert("✨ Demo Content Loaded: \n- New 'Demo Track' created\n- Custom Transition 'CircZoom' registered\n- Custom Effect 'Pixelate' registered\n- Cyberpunk assets added");
  };

  // Window Manager State
  interface PanelState {
    id: string;
    type: 'media' | 'audio' | 'text' | 'shapes' | 'fx' | 'code' | 'ai' | 'preview' | 'timeline' | 'export' | 'script';
    isOpen: boolean;
    position: { x: number; y: number };
    size: { width: string | number; height: string | number };
    zIndex: number;
    title: string;
    isDocked?: boolean;
    dockSide?: 'left' | 'right' | 'top' | 'bottom' | 'center';
  }

  const [panels, setPanels] = useState<PanelState[]>([
    { id: 'preview', type: 'preview', isOpen: true, position: { x: 400, y: 50 }, size: { width: 800, height: 450 }, zIndex: 20, title: 'Preview Monitor', isDocked: true, dockSide: 'center' },
    { id: 'timeline', type: 'timeline', isOpen: true, position: { x: 50, y: 500 }, size: { width: 1000, height: 300 }, zIndex: 15, title: 'Timeline', isDocked: true, dockSide: 'bottom' },
    { id: 'media', type: 'media', isOpen: true, position: { x: 20, y: 80 }, size: { width: 300, height: 450 }, zIndex: 10, title: 'Media Library', isDocked: true, dockSide: 'left' },
    { id: 'audio', type: 'audio', isOpen: false, position: { x: 50, y: 100 }, size: { width: 300, height: 400 }, zIndex: 9, title: 'Audio Browser' },
    { id: 'text', type: 'text', isOpen: false, position: { x: 80, y: 120 }, size: { width: 280, height: 400 }, zIndex: 8, title: 'Text Assets' },
    { id: 'shapes', type: 'shapes', isOpen: false, position: { x: 110, y: 140 }, size: { width: 250, height: 350 }, zIndex: 7, title: 'Shapes' },
    { id: 'fx', type: 'fx', isOpen: false, position: { x: 140, y: 160 }, size: { width: 300, height: 500 }, zIndex: 6, title: 'Effects & Transitions' },
    { id: 'code', type: 'code', isOpen: false, position: { x: 170, y: 180 }, size: { width: 400, height: 500 }, zIndex: 5, title: 'Code Editor' },
    { id: 'ai', type: 'ai', isOpen: false, position: { x: 200, y: 200 }, size: { width: 350, height: 600 }, zIndex: 4, title: 'AI Generator' },
    { id: 'script', type: 'script', isOpen: false, position: { x: 230, y: 220 }, size: { width: 400, height: 500 }, zIndex: 4, title: 'Script Editor' },
    { id: 'export', type: 'export', isOpen: false, position: { x: 300, y: 100 }, size: { width: 300, height: 620 }, zIndex: 100, title: 'Export Video' },
  ]);

  const [maxZIndex, setMaxZIndex] = useState(100);

  const togglePanel = (id: string) => {
    setPanels(prev => prev.map(p => {
      if (p.id === id) {
        return { ...p, isOpen: !p.isOpen, zIndex: !p.isOpen ? maxZIndex + 1 : p.zIndex };
      }
      return p;
    }));
    if (!panels.find(p => p.id === id)?.isOpen) {
      setMaxZIndex(prev => prev + 1);
    }
  };

  const updatePanel = (id: string, data: Partial<PanelState>) => {
    setPanels(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
  };

  const focusPanel = (id: string) => {
    setPanels(prev => prev.map(p => p.id === id ? { ...p, zIndex: maxZIndex + 1 } : p));
    setMaxZIndex(prev => prev + 1);
  };


  const resetLayout = () => {
    setPanels(prev => prev.map((p, idx) => ({
      ...p,
      isOpen: idx === 0, // Only open media
      position: { x: 20 + (idx * 20), y: 80 + (idx * 20) },
      size: { width: 320, height: 500 },
      zIndex: 10 + idx,
      isDocked: false,
      dockSide: undefined
    })));
    setSidebarWidth(320);
    setRightSidebarWidth(320);
  };

  const handleDock = (id: string, side: 'left' | 'right' | 'top' | 'bottom' | 'center') => {
    setPanels(prev => prev.map(p => p.id === id ? { ...p, isDocked: true, dockSide: side } : p));
  };

  const handleUndock = (id: string) => {
    setPanels(prev => prev.map(p => p.id === id ? { ...p, isDocked: false, dockSide: undefined } : p));
  };

  // Resizable state
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [rightSidebarWidth, setRightSidebarWidth] = useState(320);
  const [bottomHeight, setBottomHeight] = useState(300);
  const [topHeight, setTopHeight] = useState(250);
  const [isResizing, setIsResizing] = useState<'sidebar' | 'rightSidebar' | 'bottom' | 'top' | null>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      e.preventDefault();

      if (isResizing === 'sidebar') {
        setSidebarWidth(Math.max(200, Math.min(600, e.clientX)));
      } else if (isResizing === 'rightSidebar') {
        setRightSidebarWidth(Math.max(200, Math.min(600, window.innerWidth - e.clientX)));
      } else if (isResizing === 'bottom') {
        setBottomHeight(Math.max(150, Math.min(window.innerHeight - 300, window.innerHeight - e.clientY)));
      } else if (isResizing === 'top') {
        setTopHeight(Math.max(150, Math.min(600, e.clientY - 100))); // approx header offset
      }
    };

    const handleMouseUp = () => setIsResizing(null);

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const renderPanelContent = (panel: PanelState) => {
    switch (panel.type) {
      case 'media': return <MediaPanel assets={assets} onAddAsset={handleAddAsset} onImportFiles={importFiles} onUpdateAsset={handleUpdateAsset} onRemoveAsset={handleRemoveAsset} onDragStart={handleDragStart} />;
      case 'audio': return <AudioPanel onAddAsset={handleAddAsset} />;
      case 'text': return <TextPanel assets={assets} onDragStart={handleDragStart} />;
      case 'shapes': return <ShapesPanel onDragStart={handleDragStart} />;
      case 'fx': return <FXPanel onDragStart={handleDragStart} />;
      case 'code': return <CodePanel onAddAsset={handleAddAsset} assets={assets} />;
      case 'export': return (
        <ExportPanel
          settings={exportSettings}
          onUpdateSettings={setExportSettings}
          onStartExport={startExport}
          onCancelExport={cancelExport}
          onReset={() => setExportStatus('idle')} // Pass reset function
          isExporting={exportStatus === 'exporting'}
          progress={exportProgress}
          currentTime={currentTime}
          status={exportStatus}
          maxDuration={duration}
        />
      );
      case 'ai': return <AIPanel onAddAsset={handleAddAsset} />;
      case 'script': return (
        <ScriptPanel
          tracks={tracks}
          clips={clips}
          assets={assets}
          onApplyScript={updateClips}
          onAddClip={handleAddClip}
          onUpdateClip={handleClipUpdate}
          onRemoveClip={handleDeleteClip}
          onAddAsset={handleAddAsset}
          selectedClipIds={selectedClipIds}
          onSelectClip={(id) => setSelectedClipIds([id])}
        />
      );
      case 'preview': return (
        <div className="flex-1 flex items-center justify-center overflow-hidden bg-black h-full w-full">
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
            selectedClipId={selectedClipIds[0] || null}
            onClipUpdate={handleClipUpdate}
            workArea={workArea}
          />
        </div>
      );
      case 'timeline': return (
        <Timeline
          tracks={tracks}
          clips={clips}
          currentTime={currentTime}
          duration={duration}
          zoom={zoom}
          onSeek={setCurrentTime}
          onClipUpdate={handleClipUpdate}
          selectedClipIds={selectedClipIds}
          onSelectClip={(id, multi) => { if (multi) { if (selectedClipIds.includes(id)) setSelectedClipIds(prev => prev.filter(i => i !== id)); else setSelectedClipIds(prev => [...prev, id]); } else { setSelectedClipIds([id]); } }}
          onClearSelection={() => setSelectedClipIds([])}
          onDropAsset={handleDropAsset}
          onCreateEffectClip={handleCreateEffectClip}
          onCreateAnimationClip={handleCreateAnimationClip}
          onSplitClip={handleSplitClip}
          onDeleteClip={handleDeleteClip}
          onZoomChange={setZoom}
          onClipMove={(id, start, track) => { globalCommandManager.execute(new MoveClipCommand(commandContext, id, start, track)); }}
          onAddTrack={() => setTracks(prev => [...prev, { id: `t${prev.length + 1}`, type: MediaType.VIDEO, name: `Track ${prev.length + 1}` }])}
          onDeleteTrack={(id) => setTracks(prev => prev.filter(t => t.id !== id))}
          workArea={workArea}
          onWorkAreaChange={setWorkArea}
          onGroup={handleGroupClips}
          onUngroup={handleUngroupClips}
        />
      );
      default: return null;
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[var(--bg-root)] text-[var(--text-primary)] font-sans">

      {/* HEADER */}
      <header className="h-12 border-b border-[var(--border-base)] flex items-center justify-between px-4 bg-[var(--bg-header)] z-50 shrink-0">
        <div className="flex items-center gap-6">
          {/* NAME  */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-[var(--accent-primary)] to-indigo-600 rounded-lg shadow-lg shadow-blue-500/10 flex items-center justify-center font-bold text-white text-sm">L</div>
            <h1 className="font-semibold text-sm tracking-tight text-gray-200">Lumina Editor</h1>
          </div>

          {/* SEPARATOR */}
          <div className="h-4 w-px bg-white/10 mx-2"></div>

          {/* TOOLS */}
          <div className="flex items-center gap-1">
            <div className="flex bg-[var(--bg-item)] rounded-md p-0.5 border border-[var(--border-light)] gap-0.5">
              <button onClick={undo} disabled={!canUndo} className="p-1.5 hover:bg-[var(--bg-hover)] rounded-sm text-gray-400 hover:text-white disabled:opacity-30 transition-all" title="Undo"><Undo2 size={13} /></button>
              <button onClick={redo} disabled={!canRedo} className="p-1.5 hover:bg-[var(--bg-hover)] rounded-sm text-gray-400 hover:text-white disabled:opacity-30 transition-all" title="Redo"><Redo2 size={13} /></button>
            </div>

            <div className="h-4 w-px bg-white/10 mx-2"></div>

            <div className="flex bg-[var(--bg-item)] rounded-md p-0.5 border border-[var(--border-light)] gap-0.5">
              <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 px-2 py-1 hover:bg-[var(--bg-hover)] rounded-sm text-gray-200 text-xs font-medium transition-all">
                <FolderOpen size={13} className="text-blue-400" />
                <span>Open</span>
              </button>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".lumina,.json"
                onChange={handleLoadProject}
              />
              <button onClick={handleSaveProject} className="flex items-center gap-1.5 px-2 py-1 hover:bg-[var(--bg-hover)] rounded-sm text-gray-200 text-xs font-medium transition-all">
                <Save size={13} className="text-emerald-400" />
                <span>Save Project</span>
              </button>
            </div>
          </div>
        </div>

        {/* RIBBON */}
        <Ribbon
          onTogglePanel={togglePanel}
          activePanels={panels.filter(p => p.isOpen).map(p => p.id)}
          onResetLayout={resetLayout}
        />

        <div className="flex items-center gap-3">
          {/* Resolution Controls */}
          <div className="flex items-center gap-2 bg-[var(--bg-item)] p-0.5 rounded-md border border-[var(--border-light)] px-2">
            <span className="text-[10px] text-gray-500 font-medium">CANVAS</span>
            <select
              className="bg-transparent text-xs font-medium text-gray-300 outline-none border-none cursor-pointer hover:text-white transition-colors py-1 w-24"
              value={`${canvasWidth}x${canvasHeight}`}
              onChange={(e) => {
                const [w, h] = e.target.value.split('x').map(Number);
                setCanvasWidth(w);
                setCanvasHeight(h);
              }}
            >
              <option value="1920x1080" className="bg-[#18181b] text-gray-300">1080p (16:9)</option>
              <option value="1280x720" className="bg-[#18181b] text-gray-300">720p (16:9)</option>
              <option value="1080x1920" className="bg-[#18181b] text-gray-300">Mobile (9:16)</option>
              <option value="1080x1080" className="bg-[#18181b] text-gray-300">Square (1:1)</option>
              <option value="1080x1350" className="bg-[#18181b] text-gray-300">Portrait (4:5)</option>
            </select>
          </div>

          <div className="h-4 w-px bg-white/10"></div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleLoadDemo}
              className="px-3 py-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded text-[10px] font-bold text-white hover:opacity-90 flex items-center gap-1"
            >
              <Sparkles size={12} /> TEST DEMO
            </button>
            <button onClick={() => {
              // Stress Test Generator
              if (!confirm('This will replace your current timeline with a 5-minute heavy stress test project. Continue?')) return;

              const STRESS_DURATION = 300; // 5 mins
              const CLIP_DURATION = 3;
              const TRACK_COUNT = 5;
              const totalClips = Math.ceil(STRESS_DURATION / CLIP_DURATION) * TRACK_COUNT;

              const newClips: Clip[] = [];
              // Ensure we have enough tracks
              const newTracks = [...INITIAL_TRACKS];
              if (newTracks.length < TRACK_COUNT) {
                for (let i = newTracks.length; i < TRACK_COUNT; i++) {
                  newTracks.push({ id: `t${i + 1}`, type: MediaType.VIDEO, name: `Track ${i + 1}` });
                }
              }
              setTracks(newTracks);

              console.log(`Generating ${totalClips} clips for stress test...`);

              for (let i = 0; i < totalClips; i++) {
                const trackIndex = i % TRACK_COUNT;
                // Stagger clips so they overlap slightly or just fill
                // Track 0: 0-3, 3-6
                // Track 1: 0.5-3.5 (offset)
                const startTime = Math.floor(i / TRACK_COUNT) * CLIP_DURATION + (trackIndex * 0.5);

                if (startTime > STRESS_DURATION) break;

                const asset = assets[i % assets.length];
                const hasEffect = Math.random() > 0.5;
                const hasAnimation = Math.random() > 0.5;

                const clip: Clip = {
                  id: crypto.randomUUID(),
                  assetId: asset.id,
                  trackId: newTracks[trackIndex].id,
                  start: startTime,
                  duration: CLIP_DURATION,
                  offset: 0,
                  name: `Stress ${i}`,
                  type: asset.type,
                  src: asset.src,
                  scale: 1,
                  opacity: 1,
                  x: 0,
                  y: 0,
                  rotation: 0,
                  effects: hasEffect ? [{ id: 'blur', name: 'Blur', type: 'filter', value: 'blur(5px)' }] : [],
                  animationIn: hasAnimation ? (Math.random() > 0.5 ? 'fade' : 'slide-left') : undefined,
                  animationDuration: 0.5
                };
                newClips.push(clip);
              }

              setClips(newClips);
              setDuration(STRESS_DURATION + 5);
              setWorkArea({ start: 0, end: 10, enabled: true }); // Enable work area to test looping immediately
              setCurrentTime(0);
              alert(`Generated ${newClips.length} clips with effects and animations.`);

            }} className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-md text-xs font-medium transition-all border border-red-500/20" title="Run 5-min Stress Test">
              <Sparkles size={13} /> Stress Test
            </button>

            <button onClick={handleSaveProject} className="flex items-center gap-2 px-3 py-1.5 bg-[var(--bg-item)] hover:bg-[var(--bg-hover)] text-gray-300 hover:text-white rounded-md text-xs font-medium transition-all border border-[var(--border-light)]">
              <Save size={13} /> Save Project
            </button>
            <button onClick={() => {
              const actualEndTime = clips.length > 0 ? Math.max(...clips.map(c => c.start + c.duration)) : duration;
              setExportSettings(prev => ({ ...prev, startTime: 0, endTime: Math.max(actualEndTime, 1) }));
              updatePanel('export', { isOpen: true, zIndex: maxZIndex + 1 });
            }} className="bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white px-4 py-1.5 rounded-md text-xs font-semibold flex items-center gap-2 shadow-lg shadow-blue-900/20 transition-all border border-blue-400/20">
              <Download size={13} /> Export
            </button>
          </div>
        </div>
      </header>




      {/* WORKSPACE AREA */}
      <div className="flex-1 flex overflow-hidden relative bg-[var(--bg-root)]">

        {/* LEFT DOCK */}
        {panels.some(p => p.isOpen && p.isDocked && p.dockSide === 'left') && (
          <div style={{ width: sidebarWidth }} className="flex-shrink-0 flex flex-col border-r border-[var(--border-base)] bg-[var(--bg-panel)] relative z-20 h-full">
            <div className="flex-1 flex flex-col overflow-hidden">
              {panels.filter(p => p.isOpen && p.isDocked && p.dockSide === 'left').map(panel => (
                <div key={panel.id} className="flex-1 relative overflow-hidden flex flex-col min-h-0">
                  <FloatingPanel
                    id={panel.id}
                    title={panel.title}
                    isOpen={panel.isOpen}
                    position={panel.position}
                    size={panel.size}
                    zIndex={panel.zIndex}
                    isDocked={true}
                    dockSide="left"
                    onClose={() => togglePanel(panel.id)}
                    onUpdate={updatePanel}
                    onFocus={() => focusPanel(panel.id)}
                    onDock={handleDock}
                    onUndock={handleUndock}
                  >
                    {renderPanelContent(panel)}
                  </FloatingPanel>
                </div>
              ))}
            </div>
            <div className="resizer-v absolute right-0 top-0 bottom-0 cursor-col-resize group z-30 w-2 -mr-1 hover:bg-transparent transition-colors" onMouseDown={() => setIsResizing('sidebar')}>
              <div className="absolute right-1 w-px h-full bg-[var(--border-base)] group-hover:bg-[var(--accent-primary)] transition-colors"></div>
            </div>
          </div>
        )}

        {/* CENTER COLUMN */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">

          {/* TOP DOCK */}
          {panels.some(p => p.isOpen && p.isDocked && p.dockSide === 'top') && (
            <div style={{ height: topHeight }} className="flex-shrink-0 flex flex-col border-b border-[var(--border-base)] bg-[var(--bg-panel)] relative z-20">
              <div className="flex-1 flex overflow-hidden">
                {panels.filter(p => p.isOpen && p.isDocked && p.dockSide === 'top').map(panel => (
                  <div key={panel.id} className="flex-1 relative overflow-hidden flex flex-col">
                    <FloatingPanel
                      id={panel.id}
                      title={panel.title}
                      isOpen={panel.isOpen}
                      position={panel.position}
                      size={panel.size}
                      zIndex={panel.zIndex}
                      isDocked={true}
                      dockSide="top"
                      onClose={() => togglePanel(panel.id)}
                      onUpdate={updatePanel}
                      onFocus={() => focusPanel(panel.id)}
                      onDock={handleDock}
                      onUndock={handleUndock}
                    >
                      {renderPanelContent(panel)}
                    </FloatingPanel>
                  </div>
                ))}
              </div>
              <div className="resizer-h absolute bottom-0 left-0 right-0 cursor-row-resize group z-30 h-2 -mb-1 hover:bg-transparent transition-colors" onMouseDown={() => setIsResizing('top')}>
                <div className="absolute bottom-1 w-full h-px bg-[var(--border-base)] group-hover:bg-[var(--accent-primary)] transition-colors"></div>
              </div>
            </div>
          )}

          {/* CENTER DOCK & FLOATING AREA */}
          <div className="flex-1 flex overflow-hidden relative bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:20px_20px]">
            {/* Render Center Docked Panels */}
            {panels.some(p => p.isOpen && p.isDocked && p.dockSide === 'center') ? (
              <div className="w-full h-full flex flex-col overflow-hidden">
                {panels.filter(p => p.isOpen && p.isDocked && p.dockSide === 'center').map(panel => (
                  <div key={panel.id} className="flex-1 relative overflow-hidden flex flex-col min-h-0 border-b last:border-0 border-[#27272a]">
                    <FloatingPanel
                      id={panel.id}
                      title={panel.title}
                      isOpen={panel.isOpen}
                      position={panel.position}
                      size={panel.size}
                      zIndex={panel.zIndex}
                      isDocked={true}
                      dockSide="center"
                      onClose={() => togglePanel(panel.id)}
                      onUpdate={updatePanel}
                      onFocus={() => focusPanel(panel.id)}
                      onDock={handleDock}
                      onUndock={handleUndock}
                    >
                      {renderPanelContent(panel)}
                    </FloatingPanel>
                  </div>
                ))}
              </div>
            ) : null}

            {/* Floating Panels Container - MOVED TO ROOT */}


            {/* Modal removed - Handled by FloatingPanel */}
          </div>

          {/* BOTTOM DOCK */}
          {panels.some(p => p.isOpen && p.isDocked && p.dockSide === 'bottom') && (
            <div style={{ height: bottomHeight }} className="flex-shrink-0 flex flex-col border-t border-[var(--border-base)] bg-[var(--bg-panel)] relative z-20">
              <div className="resizer-h absolute top-0 left-0 right-0 cursor-row-resize group z-30 h-2 -mt-1 hover:bg-transparent transition-colors" onMouseDown={() => setIsResizing('bottom')}>
                <div className="absolute top-1 w-full h-px bg-[var(--border-base)] group-hover:bg-[var(--accent-primary)] transition-colors"></div>
              </div>
              <div className="flex-1 flex overflow-hidden">
                {panels.filter(p => p.isOpen && p.isDocked && p.dockSide === 'bottom').map(panel => (
                  <div key={panel.id} className="flex-1 relative overflow-hidden flex flex-col min-w-0">
                    <FloatingPanel
                      id={panel.id}
                      title={panel.title}
                      isOpen={panel.isOpen}
                      position={panel.position}
                      size={panel.size}
                      zIndex={panel.zIndex}
                      isDocked={true}
                      dockSide="bottom"
                      onClose={() => togglePanel(panel.id)}
                      onUpdate={updatePanel}
                      onFocus={() => focusPanel(panel.id)}
                      onDock={handleDock}
                      onUndock={handleUndock}
                    >
                      {renderPanelContent(panel)}
                    </FloatingPanel>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT DOCK */}
        {((panels.some(p => p.isOpen && p.isDocked && p.dockSide === 'right')) || (selectedClips.length > 0)) && (
          <div style={{ width: rightSidebarWidth }} className="flex-shrink-0 flex flex-col border-l border-[var(--border-base)] bg-[var(--bg-panel)] relative z-20 h-full">
            <div className="resizer-v absolute left-0 top-0 bottom-0 cursor-col-resize group z-30 w-2 -ml-1 hover:bg-transparent transition-colors" onMouseDown={() => setIsResizing('rightSidebar')}>
              <div className="absolute left-1 w-px h-full bg-[var(--border-base)] group-hover:bg-[var(--accent-primary)] transition-colors"></div>
            </div>

            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Regular Right Docked Panels */}
              {panels.filter(p => p.isOpen && p.isDocked && p.dockSide === 'right').map(panel => (
                <div key={panel.id} className="flex-1 relative overflow-hidden flex flex-col min-h-0 border-b last:border-0 border-[#27272a]">
                  <FloatingPanel
                    id={panel.id}
                    title={panel.title}
                    isOpen={panel.isOpen}
                    position={panel.position}
                    size={panel.size}
                    zIndex={panel.zIndex}
                    isDocked={true}
                    dockSide="right"
                    onClose={() => togglePanel(panel.id)}
                    onUpdate={updatePanel}
                    onFocus={() => focusPanel(panel.id)}
                    onDock={handleDock}
                    onUndock={handleUndock}
                  >
                    {renderPanelContent(panel)}
                  </FloatingPanel>
                </div>
              ))}

              {/* Properties Panel (always docked right if open and no other panels hide it?) */}
              {/* Note: In original logic, PropertiesPanel was just conditional. Now we stack it or toggle it? */}
              {/* Let's keep it simply stacked at the bottom if clips are selected */}
              {selectedClips.length > 0 && (
                <div className="flex-1 relative overflow-hidden flex flex-col min-h-0">
                  <div className="h-9 flex items-center justify-between px-3 bg-[#27272a] border-b border-[#3f3f46] shrink-0">
                    <span className="text-xs font-semibold text-gray-200">Properties</span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setSelectedClipIds([])} className="text-gray-500 hover:text-white p-1"><X size={12} /></button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-auto">
                    <PropertiesPanel
                      clips={selectedClips}
                      allClips={clips}
                      onUpdate={(u) => handleClipUpdate(selectedClips[0].id, u)}
                      onDelete={handleDeleteClip}
                      onDetachAudio={handleDetachAudio}
                      onClose={() => setSelectedClipIds([])}
                      onSeek={setCurrentTime}
                      customFonts={customFonts}
                      onUploadFont={handleUploadFont}
                      timerInputRef={timerInputRef}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Floating Windows Container - Root Level */}
      <div className="absolute inset-0 pointer-events-none z-[100]">
        {panels.filter(p => !p.isDocked).map(panel => (
          <div key={panel.id} className="pointer-events-auto">
            <FloatingPanel
              id={panel.id}
              title={panel.title}
              isOpen={panel.isOpen}
              position={panel.position}
              size={panel.size}
              zIndex={panel.zIndex}
              isDocked={false}
              onClose={() => togglePanel(panel.id)}
              onUpdate={updatePanel}
              onFocus={() => focusPanel(panel.id)}
              onDock={handleDock}
              onUndock={handleUndock}
            >
              {renderPanelContent(panel)}
            </FloatingPanel>
          </div>
        ))}
      </div>

    </div >
  );
}

export default App;
