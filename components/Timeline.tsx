
import React, { useRef, useState, useEffect } from 'react';
import { Track, Clip, MediaType, Effect, AnimationType } from '../types';
import { Film, Image as ImageIcon, Music, Type, Scissors, Trash2, ZoomIn, ZoomOut, Plus, Wand2, Move } from 'lucide-react';
import { TimelineClip } from './timeline/TimelineClip';

interface TimelineProps {
    tracks: Track[];
    clips: Clip[];
    currentTime: number;
    duration: number;
    zoom: number;
    onSeek: (time: number) => void;
    onClipUpdate: (clipId: string, updates: Partial<Clip>) => void;
    selectedClipIds: string[];
    onSelectClip: (id: string, isMulti: boolean) => void;
    onClearSelection: () => void;
    onDropAsset: (assetId: string, trackId: string, time: number) => void;
    onCreateEffectClip: (effect: Effect, trackId: string, time: number) => void;
    onCreateAnimationClip: (animType: AnimationType, trackId: string, time: number, options?: any) => void;
    onSplitClip: () => void;
    onDeleteClip: () => void;
    onZoomChange: (newZoom: number) => void;
    onClipMove: (clipId: string, newStart: number, newTrackId: string) => void;
    onAddTrack: () => void;
    onDeleteTrack?: (id: string) => void;
    workArea?: { start: number; end: number; enabled: boolean };
    onWorkAreaChange?: (area: { start: number; end: number; enabled: boolean }) => void;
}

const Timeline: React.FC<TimelineProps> = ({
    tracks,
    clips,
    currentTime,
    duration,
    zoom,
    onSeek,
    onClipUpdate,
    selectedClipIds,
    onSelectClip,
    onClearSelection,
    onDropAsset,
    onCreateEffectClip,
    onCreateAnimationClip,
    onSplitClip,
    onDeleteClip,
    onZoomChange,
    onClipMove,
    onAddTrack,
    onDeleteTrack,
    workArea,
    onWorkAreaChange
}) => {
    const rulerRef = useRef<HTMLDivElement>(null);
    const timelineRef = useRef<HTMLDivElement>(null);
    const [isResizing, setIsResizing] = useState<string | null>(null);
    const draggingClipRef = useRef<Clip | null>(null);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        const ms3 = Math.floor((seconds % 1) * 1000);
        if (zoom > 500) return `${m}:${s.toString().padStart(2, '0')}.${ms3.toString().padStart(3, '0')}`;
        return `${m}:${s.toString().padStart(2, '0')}.${ms3.toString().padStart(2, '0').slice(0, 2)}`;
    };

    const handleTimelineClick = (e: React.MouseEvent) => {
        if (!timelineRef.current) return;
        if ((e.target as HTMLElement).closest('[data-clip-id]')) return;
        const rect = timelineRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left + timelineRef.current.scrollLeft - 200;
        onSeek(Math.max(0, x / zoom));
        // Selection is now persistent. Click background to deselect logic moved to Esc key or specific clear interactions if needed later.
        // onClearSelection(); 
    };


    const handleClipClick = (e: React.MouseEvent, clipId: string) => {
        e.stopPropagation();
        onSelectClip(clipId, e.ctrlKey || e.metaKey);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        draggingClipRef.current = null;

        if (!timelineRef.current) return;

        const targetClipId = (e.target as HTMLElement).closest('[data-clip-id]')?.getAttribute('data-clip-id');
        const dragType = e.dataTransfer.getData('dragType');

        if (dragType === 'effect' && targetClipId) {
            try {
                const effectData = JSON.parse(e.dataTransfer.getData('effectData'));
                const targetClip = clips.find(c => c.id === targetClipId);
                if (targetClip && effectData && effectData.type) {
                    onClipUpdate(targetClipId, { effects: [...(targetClip.effects || []), effectData] });
                }
            } catch (err) {
                console.error('Failed to parse effect data:', err);
            }
            return;
        }

        if (dragType === 'animation' && targetClipId) {
            try {
                const animType = e.dataTransfer.getData('animationType') as AnimationType;
                const rawData = e.dataTransfer.getData('animationData');
                let duration = 1.0;
                if (rawData) duration = JSON.parse(rawData).duration || 1.0;
                if (animType) {
                    onClipUpdate(targetClipId, { animationIn: animType, animationInDuration: duration });
                }
            } catch (err) {
                console.error('Failed to parse animation data:', err);
            }
            return;
        }

        const rect = timelineRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left + timelineRef.current.scrollLeft - 200;
        const time = Math.max(0, x / zoom);
        const trackId = (e.target as HTMLElement).closest('[data-track-id]')?.getAttribute('data-track-id');

        if (!trackId) return;

        if (dragType === 'clip') {
            const clipId = e.dataTransfer.getData('clipId');
            onClipMove(clipId, time, trackId);
        } else if (dragType === 'effect') {
            try {
                const effectData = JSON.parse(e.dataTransfer.getData('effectData'));
                if (effectData && effectData.type) {
                    onCreateEffectClip(effectData, trackId, time);
                }
            } catch (err) {
                console.error('Failed to parse effect creation data:', err);
            }
        } else if (dragType === 'animation') {
            try {
                const animType = e.dataTransfer.getData('animationType') as AnimationType;
                const rawData = e.dataTransfer.getData('animationData');
                if (animType) {
                    onCreateAnimationClip(animType, trackId, time, rawData ? JSON.parse(rawData) : {});
                }
            } catch (err) {
                console.error('Failed to parse animation creation data:', err);
            }
        } else if (dragType === 'shape') {
            try {
                const shapeDataStr = e.dataTransfer.getData('text/plain'); // Use standard MIME type
                if (shapeDataStr) {
                    const shapeData = JSON.parse(shapeDataStr);
                    if (shapeData && shapeData.id) {
                        onDropAsset(shapeData.id, trackId, time);
                    }
                }
            } catch (err) {
                console.error('Failed to parse shape data:', err);
            }
        } else {
            const assetId = e.dataTransfer.getData('assetId');
            if (assetId) onDropAsset(assetId, trackId, time);
        }
    };

    const handleClipDragStart = (e: React.DragEvent, clip: Clip) => {
        e.stopPropagation();
        draggingClipRef.current = clip;
        e.dataTransfer.setData('dragType', 'clip');
        e.dataTransfer.setData('clipId', clip.id);
        e.dataTransfer.effectAllowed = 'move';
        const img = new Image();
        img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
        e.dataTransfer.setDragImage(img, 0, 0);
        if (!selectedClipIds.includes(clip.id)) onSelectClip(clip.id, false);
    };

    const renderRulerTicks = () => {
        const ticks = [];
        // Adaptive step based on zoom (pixels per second)
        // We want a label approx every 60-100px.
        // zoom = px per second.

        let labelInterval = 1; // seconds per label
        if (zoom >= 200) labelInterval = 0.5; // Every 0.5s if huge zoom
        else if (zoom >= 100) labelInterval = 1;
        else if (zoom >= 50) labelInterval = 2;
        else if (zoom >= 20) labelInterval = 5;
        else if (zoom >= 10) labelInterval = 10;
        else if (zoom >= 5) labelInterval = 15;
        else labelInterval = 30;

        // Calculate a suitable minor tick interval
        let minorStep = labelInterval / 5;
        if (minorStep < 0.1) minorStep = 0.1;

        // Ensure we don't spam DOM
        // Loop from 0 to duration
        for (let i = 0; i <= duration; i += minorStep) {
            // Fix precision issues
            const time = Math.round(i * 100) / 100;

            // Should we show a label?
            // Check if 'time' is a multiple of 'labelInterval'
            // Use small epsilon for float comparison
            const isLabel = Math.abs(time % labelInterval) < 0.01 || Math.abs(labelInterval - (time % labelInterval)) < 0.01;

            if (isLabel) {
                ticks.push(
                    <div key={`maj-${time}`} className="absolute top-0 bottom-0 select-none pointer-events-none z-10 flex flex-col items-start" style={{ left: time * zoom }}>
                        <div className="h-3 w-px bg-white/40"></div>
                        <span className="text-[11px] font-medium text-gray-400 font-mono mt-0.5 transform -translate-x-1/2 bg-black/60 px-1 rounded backdrop-blur-sm">{formatTime(time)}</span>
                    </div>
                );
            } else {
                ticks.push(
                    <div key={`min-${time}`} className="absolute top-0 bottom-0 select-none pointer-events-none z-10 flex flex-col items-start" style={{ left: time * zoom }}>
                        <div className="h-1.5 w-px bg-white/10"></div>
                    </div>
                );
            }
        }
        return ticks;
    };

    // Resize Logic
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isResizing && timelineRef.current) {
                const clip = clips.find(c => c.id === isResizing);
                if (!clip) return;
                const rect = timelineRef.current.getBoundingClientRect();
                const x = e.clientX - rect.left + timelineRef.current.scrollLeft - 200;
                const mouseTime = Math.max(0, x / zoom);
                onClipUpdate(clip.id, { duration: Math.max(0.001, mouseTime - clip.start) });
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
    }, [isResizing, clips, zoom, onClipUpdate]);

    const getIcon = (type: MediaType) => {
        switch (type) {
            case MediaType.VIDEO: return <Film size={14} className="text-blue-400" />;
            case MediaType.IMAGE: return <ImageIcon size={14} className="text-purple-400" />;
            case MediaType.AUDIO: return <Music size={14} className="text-green-400" />;
            case MediaType.TEXT: return <Type size={14} className="text-yellow-400" />;
            case MediaType.EFFECT: return <Wand2 size={14} className="text-pink-400" />;
            case MediaType.ANIMATION: return <Move size={14} className="text-orange-400" />;
        }
    };

    const sortClipsForRender = (trackClips: Clip[]) => {
        return trackClips.sort((a, b) => {
            const score = (type: MediaType) => {
                if (type === MediaType.VIDEO || type === MediaType.IMAGE || type === MediaType.AUDIO) return 1;
                if (type === MediaType.TEXT) return 2;
                if (type === MediaType.EFFECT || type === MediaType.ANIMATION) return 3;
                return 0;
            };
            return score(a.type) - score(b.type);
        });
    };

    // Ghost Clip Logic for smooth dragging
    const ghostClipRef = useRef<HTMLDivElement>(null);
    const [ghostState, setGhostState] = useState<{ visible: boolean; width: number; name: string; type: MediaType } | null>(null);

    const updateGhostPosition = (e: React.DragEvent) => {
        if (!ghostClipRef.current || !timelineRef.current) return;

        const rect = timelineRef.current.getBoundingClientRect();
        const scrollLeft = timelineRef.current.scrollLeft;

        // Calculate X similar to other handlers
        // x relative to timeline content start (200px sidebar offset)
        // We want the position on screen relative to the container for the ghost

        // Ghost is absolute positioned within the "relative min-w-max" container
        // So left = 200 + (time * zoom).

        // Let's get raw mouse X relative to the timeline container
        let rawX = e.clientX - rect.left + scrollLeft;

        // Clamp to sidebar
        if (rawX < 200) rawX = 200;

        // Find track Y
        const trackElement = (e.target as HTMLElement).closest('[data-track-id]');
        let top = 0;
        let trackFound = false;

        if (trackElement) {
            const trackRect = trackElement.getBoundingClientRect();
            const containerRect = timelineRef.current.getBoundingClientRect();
            // Calculate top relative to the scrolled container
            top = trackRect.top - containerRect.top + timelineRef.current.scrollTop + 32; // +32 for header padding approx? 
            // Actually, best to just use the `offsetTop` relative to the container if possible, 
            // but `trackElement` is deeper.

            // Simpler: The container has `relative`. The tracks are children.
            // visual top = track.offsetTop.
            // Note: trackElement is the `div` with `data-track-id`. 
            // It is inside the list. specific `offsetTop` should work.
            const el = trackElement as HTMLElement;
            // The track element is inside the `pb-8` container.
            // We need its offsetTop relative to that container.
            top = el.offsetTop;
            trackFound = true;
        }

        // Apply transform
        // We subtract scrollLeft from x because the ghost is inside the scrolling container?
        // Wait, if ghost is inside `relative min-w-max`, it scrolls WITH the content.
        // So we just need to set `left` to the absolute coordinate.

        // Calculate time to snap
        const xInTimeline = rawX - 200;
        const time = Math.max(0, xInTimeline / zoom);
        // Snap to grid (optional, maybe 0.1s?)
        // const snappedTime = Math.round(time * 10) / 10;

        const finalLeft = 200 + (time * zoom);

        ghostClipRef.current.style.transform = `translate(${finalLeft}px, ${trackFound ? top + 8 : 40}px)`; // +8 for padding inside track
        ghostClipRef.current.style.display = 'flex';
    };

    const handleDragEnter = (e: React.DragEvent) => {
        e.preventDefault();
        if (draggingClipRef.current) {
            setGhostState({
                visible: true,
                width: draggingClipRef.current.duration * zoom,
                name: draggingClipRef.current.name,
                type: draggingClipRef.current.type
            });
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault(); // Allow drop
        if (draggingClipRef.current) {
            updateGhostPosition(e);
        }
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setGhostState(null);
        if (ghostClipRef.current) ghostClipRef.current.style.display = 'none';
    };

    // ... (rest of handlers)

    const handleDragEnd = () => {
        draggingClipRef.current = null;
        setGhostState(null);
        if (ghostClipRef.current) ghostClipRef.current.style.display = 'none';
        setIsResizing(null);
    };

    // Fix drop to clean up ghost
    const wrapHandleDrop = (e: React.DragEvent) => {
        handleDragEnd(); // Reset ghost state
        handleDrop(e);
    };

    // Work Area Logic
    const [isDraggingWorkArea, setIsDraggingWorkArea] = useState<'start' | 'end' | 'bar' | null>(null);
    const workAreaRef = useRef<{ start: number, end: number, initialX: number } | null>(null);

    const handleWorkAreaMouseDown = (e: React.MouseEvent, type: 'start' | 'end' | 'bar') => {
        e.stopPropagation();
        e.preventDefault();
        setIsDraggingWorkArea(type);
        if (onWorkAreaChange && workArea) {
            workAreaRef.current = { start: workArea.start, end: workArea.end, initialX: e.clientX };
        }
    };

    useEffect(() => {
        const handleWorkAreaMove = (e: MouseEvent) => {
            if (isDraggingWorkArea && workAreaRef.current && onWorkAreaChange && workArea) {
                const deltaX = e.clientX - workAreaRef.current.initialX;
                const deltaSeconds = deltaX / zoom;

                if (isDraggingWorkArea === 'bar') {
                    let newStart = Math.max(0, workAreaRef.current.start + deltaSeconds);
                    let newEnd = Math.max(0, workAreaRef.current.end + deltaSeconds);
                    onWorkAreaChange({ ...workArea, start: newStart, end: newEnd, enabled: true });
                } else if (isDraggingWorkArea === 'start') {
                    let newStart = Math.max(0, Math.min(workArea.end - 0.1, workAreaRef.current.start + deltaSeconds));
                    onWorkAreaChange({ ...workArea, start: newStart, enabled: true });
                } else if (isDraggingWorkArea === 'end') {
                    let newEnd = Math.max(workArea.start + 0.1, workAreaRef.current.end + deltaSeconds);
                    onWorkAreaChange({ ...workArea, end: newEnd, enabled: true });
                }
            }
        };

        const handleWorkAreaUp = () => {
            setIsDraggingWorkArea(null);
            workAreaRef.current = null;
        };

        if (isDraggingWorkArea) {
            window.addEventListener('mousemove', handleWorkAreaMove);
            window.addEventListener('mouseup', handleWorkAreaUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleWorkAreaMove);
            window.removeEventListener('mouseup', handleWorkAreaUp);
        };
    }, [isDraggingWorkArea, onWorkAreaChange, zoom, workArea]);



    // Virtualization State
    const [visibleRange, setVisibleRange] = useState({ start: 0, end: 100 });

    const updateVisibleRange = () => {
        if (!timelineRef.current) return;
        const scrollLeft = timelineRef.current.scrollLeft;
        const containerWidth = timelineRef.current.clientWidth;

        // Calculate time range with buffer (e.g., 10% extra or 200px)
        const bufferPixels = 500;
        const startPixel = Math.max(0, scrollLeft - bufferPixels);
        const endPixel = scrollLeft + containerWidth + bufferPixels;

        const start = startPixel / zoom;
        const end = endPixel / zoom;

        setVisibleRange({ start, end });
    };

    useEffect(() => {
        updateVisibleRange();
        window.addEventListener('resize', updateVisibleRange);
        return () => window.removeEventListener('resize', updateVisibleRange);
    }, [zoom]); // Update when zoom changes

    return (
        <div className="flex flex-col h-full bg-[var(--bg-root)] text-xs select-none relative group">
            {/* Toolbar - Added Work Area Toggle */}
            <div className="h-10 bg-[var(--bg-header)]/90 backdrop-blur-md border-t border-[var(--border-base)] flex items-center justify-between px-3 z-40 relative">
                <div className="flex items-center gap-1 bg-[var(--bg-item)] p-0.5 rounded-lg border border-[var(--border-light)]">
                    {/* Existing buttons... */}
                    <button onClick={onAddTrack} className="flex items-center gap-1.5 px-2 py-1 rounded-sm hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-white transition-all text-[10px] font-medium"><Plus size={11} /> Track</button>
                    <div className="h-3 w-px bg-white/10 mx-1" />
                    <button onClick={onSplitClip} className="flex items-center gap-1.5 px-2 py-1 rounded-sm hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-white transition-all text-[10px] font-medium" title="Split (S)"><Scissors size={11} /> Split</button>
                    <button onClick={onDeleteClip} className="flex items-center gap-1.5 px-2 py-1 rounded-sm hover:bg-red-500/10 text-[var(--text-secondary)] hover:text-red-400 transition-all text-[10px] font-medium" title="Delete (Del)"><Trash2 size={11} /> Delete</button>
                    <div className="h-3 w-px bg-white/10 mx-1" />
                    {workArea && onWorkAreaChange && (
                        <button
                            onClick={() => onWorkAreaChange({ ...workArea, enabled: !workArea.enabled })}
                            className={`flex items-center gap-1.5 px-2 py-1 rounded-sm transition-all text-[10px] font-medium ${workArea.enabled ? 'bg-blue-500/20 text-blue-400' : 'hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]'}`}
                            title="Toggle Work Area Loop"
                        >
                            <span className="text-[10px]">Loop</span>
                        </button>
                    )}
                </div>
                <div className="flex items-center gap-2 bg-[var(--bg-item)] p-0.5 rounded-lg border border-[var(--border-light)]">
                    <button onClick={() => onZoomChange(Math.max(10, zoom - 50))} className="p-1 hover:bg-[var(--bg-hover)] rounded-sm text-gray-400 hover:text-white transition"><ZoomOut size={11} /></button>
                    <input type="range" min="10" max="3000" step="10" value={zoom} onChange={(e) => onZoomChange(Number(e.target.value))} className="w-20 h-1 bg-[var(--bg-panel)] rounded-lg appearance-none cursor-pointer accent-[var(--accent-primary)]" />
                    <button onClick={() => onZoomChange(Math.min(3000, zoom + 50))} className="p-1 hover:bg-[var(--bg-hover)] rounded-sm text-gray-400 hover:text-white transition"><ZoomIn size={11} /></button>
                </div>
            </div>

            <div className="flex-1 flex flex-col overflow-hidden relative">
                <div
                    className="flex-1 overflow-auto bg-[var(--bg-root)] relative custom-scrollbar"
                    ref={timelineRef}
                    onDragOver={handleDragOver}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDrop={wrapHandleDrop}
                    onClick={handleTimelineClick}
                    onDragEnd={handleDragEnd}
                    onScroll={updateVisibleRange}
                >
                    <div className="flex h-8 bg-[var(--bg-panel)] min-w-max sticky top-0 z-30 border-b border-[var(--border-base)]">
                        <div className="w-[200px] border-r border-[var(--border-base)] bg-[var(--bg-panel)] z-40 sticky left-0 flex items-center justify-center">
                            <div className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest">Tracks</div>
                        </div>
                        <div className="relative h-full cursor-pointer overflow-hidden pt-2" style={{ width: duration * zoom }} ref={rulerRef}>
                            {/* Work Area Bar */}
                            {workArea && workArea.enabled && (
                                <div className="absolute top-0 h-2 bg-blue-500/20 border-b border-blue-500/50 z-20 group/wa" style={{ left: workArea.start * zoom, width: (workArea.end - workArea.start) * zoom }}>
                                    {/* Bar Drag Handle */}
                                    <div className="absolute inset-x-0 top-0 h-full cursor-grab active:cursor-grabbing hover:bg-blue-500/30" onMouseDown={(e) => handleWorkAreaMouseDown(e, 'bar')} />
                                    {/* Left Handle */}
                                    <div className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize bg-blue-500 hover:bg-blue-400 rounded-l-sm" onMouseDown={(e) => handleWorkAreaMouseDown(e, 'start')} />
                                    {/* Right Handle */}
                                    <div className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize bg-blue-500 hover:bg-blue-400 rounded-r-sm" onMouseDown={(e) => handleWorkAreaMouseDown(e, 'end')} />
                                    <div className="absolute top-full left-0 mt-0.5 text-[9px] text-blue-400 font-mono bg-black/60 px-1 rounded opacity-0 group-hover/wa:opacity-100 pointer-events-none whitespace-nowrap">
                                        Work Area: {formatTime(workArea.start)} - {formatTime(workArea.end)}
                                    </div>
                                </div>
                            )}
                            {renderRulerTicks()}
                        </div>
                    </div>
                    {/* ... (rest of timeline body) */}
                    <div className="relative min-w-max pb-8">
                        {zoom > 50 && <div className="absolute inset-0 pointer-events-none z-0" style={{ left: 200, width: duration * zoom, backgroundImage: 'linear-gradient(to right, var(--border-base) 1px, transparent 1px)', backgroundSize: `${zoom}px 100%`, opacity: 0.1 }} />}

                        {/* Dim outside work area if enabled */}
                        {workArea && workArea.enabled && (
                            <>
                                <div className="absolute top-0 bottom-0 bg-black/40 pointer-events-none z-10" style={{ left: 200, width: workArea.start * zoom }} />
                                <div className="absolute top-0 bottom-0 bg-black/40 pointer-events-none z-10" style={{ left: 200 + (workArea.end * zoom), width: (duration - workArea.end) * zoom }} />
                            </>
                        )}

                        {tracks.map((track, index) => (
                            // ... (track rendering)
                            <div key={track.id} data-track-id={track.id} className={`flex h-24 border-b border-[var(--border-base)] ${index % 2 === 0 ? 'bg-transparent' : 'bg-white/[0.01]'} relative group/track transition-colors hover:bg-white/[0.02]`}>
                                <div className="w-[200px] flex-shrink-0 bg-[var(--bg-panel)] border-r border-[var(--border-base)] p-3 flex flex-col justify-center gap-1 z-20 sticky left-0 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.5)]">
                                    <div className="flex items-center gap-3 text-[var(--text-secondary)] group-hover/track:text-gray-200 transition-colors">
                                        <div className="p-1.5 rounded-md bg-white/5">{getIcon(track.type)}</div>
                                        <span className="truncate text-xs font-medium tracking-wide">{track.name}</span>
                                    </div>
                                </div>
                                <div className="relative py-2" style={{ width: duration * zoom }}>
                                    {sortClipsForRender(clips.filter(c => c.trackId === track.id && (c.start + c.duration >= visibleRange.start && c.start <= visibleRange.end))).map(clip => (
                                        <TimelineClip
                                            key={clip.id}
                                            clip={clip}
                                            isSelected={selectedClipIds.includes(clip.id)}
                                            zoom={zoom}
                                            onDragStart={handleClipDragStart}
                                            onClick={handleClipClick}
                                            onResizeStart={(e) => { e.stopPropagation(); e.preventDefault(); setIsResizing(clip.id); }}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}

                        {/* Ghost Clip Element */}
                        {ghostState && (
                            <div
                                ref={ghostClipRef}
                                className={`absolute top-0 left-0 h-20 border rounded pointer-events-none z-50 flex items-center px-2 backdrop-blur-sm shadow-2xl transition-transform duration-75`}
                                style={{
                                    width: ghostState.width,
                                    display: 'none',
                                    backgroundColor:
                                        ghostState.type === MediaType.VIDEO ? 'rgba(30, 58, 138, 0.7)' :
                                            ghostState.type === MediaType.IMAGE ? 'rgba(88, 28, 135, 0.7)' :
                                                ghostState.type === MediaType.TEXT ? 'rgba(113, 63, 18, 0.7)' :
                                                    ghostState.type === MediaType.AUDIO ? 'rgba(20, 83, 45, 0.7)' :
                                                        'rgba(59, 130, 246, 0.5)',
                                    borderColor: 'rgba(255,255,255,0.4)'
                                }}
                            >
                                <span className="text-white font-bold text-xs truncate drop-shadow-md">{ghostState.name}</span>
                            </div>
                        )}

                        <div className="absolute top-0 bottom-0 w-px bg-[var(--accent-primary)] pointer-events-none z-50 shadow-[0_0_8px_rgba(59,130,246,0.6)]" style={{ left: 200 + (currentTime * zoom) }}>
                            <div className="absolute -top-1 -left-1.5 w-3 h-3 bg-[var(--accent-primary)] transform rotate-45 shadow-sm rounded-[1px]" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Timeline;
