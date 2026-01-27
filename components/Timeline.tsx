import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Track, Clip, MediaType, Effect, AnimationType } from '../types';
import {
    Film,
    Image as ImageIcon,
    Music,
    Type,
    Scissors,
    Trash2,
    ZoomIn,
    ZoomOut,
    Plus,
    Wand2,
    Move
} from 'lucide-react';
import { TimelineClip } from './timeline/TimelineClip';
import { TimelineContextMenu } from './timeline/TimelineContextMenu';
import { TimelineEngine } from '../engines/timeline/TimelineEngine'; // Import Engine
import { useTimeline } from '../hooks/useTimeline'; // Import Hook

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
    onCreateAnimationClip: (
        animType: AnimationType,
        trackId: string,
        time: number,
        options?: any
    ) => void;
    onSplitClip: () => void;
    onDeleteClip: () => void;
    onZoomChange: (newZoom: number) => void;
    onClipMove: (clipId: string, newStart: number, newTrackId: string) => void;
    onAddTrack: () => void;
    onDeleteTrack?: (id: string) => void;
    workArea?: { start: number; end: number; enabled: boolean };
    onWorkAreaChange?: (area: {
        start: number;
        end: number;
        enabled: boolean;
    }) => void;
    onGroup: () => void;
    onUngroup: () => void;
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
    onWorkAreaChange,
    onGroup,
    onUngroup
}) => {
    const timelineRef = useRef<HTMLDivElement>(null);
    const rulerRef = useRef<HTMLDivElement>(null);

    // Use the Hook for logic
    const {
        handleClipClick,
        handleClipPointerDown,
        handleResizeStart,
        ghost,
    } = useTimeline({
        clips,
        tracks,
        zoom,
        timelineRef,
        onClipUpdate,
        onClipMove,
        onSelectClip,
        onClearSelection,
        selectedClipIds
    });

    // Calculate Group capabilities
    const canGroup = selectedClipIds.length > 1;
    const canUngroup = selectedClipIds.some(id => {
        const clip = clips.find(c => c.id === id);
        return clip && !!clip.groupId;
    });

    /* -------------------------------------------------- */
    /* ----------------- Seek Handling ------------------ */
    /* -------------------------------------------------- */

    const seekFromEvent = useCallback(
        (clientX: number) => {
            if (!timelineRef.current) return;
            const rect = timelineRef.current.getBoundingClientRect();
            const scrollLeft = timelineRef.current.scrollLeft;
            // Use Engine for logic
            const time = TimelineEngine.pixelToTime(clientX, zoom, scrollLeft, rect.left + TimelineEngine.SIDEBAR_WIDTH); // Adjusted: sidebar logic might be internal to logic or here. 
            // My Engine.pixelToTime expects pure x. But here we have clientX.
            // Let's stick to the verified math or check Engine implementation.
            // Engine: pixelToTime(x: number, zoom: number, scrollLeft: number, sidebarWidth...) 
            // relativeX = x + scrollLeft - sidebarWidth;
            // logic in seekFromEvent: x = clientX - rect.left + scrollLeft - SIDEBAR_WIDTH
            // So x passed to Engine should be (clientX - rect.left)
            const relativeX = clientX - rect.left;
            const t = TimelineEngine.pixelToTime(relativeX, zoom, scrollLeft);
            onSeek(t);
        },
        [onSeek, zoom]
    );

    const handleTimelineClick = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('[data-clip-id]')) return;
        seekFromEvent(e.clientX);
        onClearSelection();
    };

    /* -------------------------------------------------- */
    /* ------------------ Context Menu ------------------ */
    /* -------------------------------------------------- */

    // Keeping Context Menu state local for now as it's UI specific
    const [contextMenu, setContextMenu] = useState<{
        x: number;
        y: number;
        visible: boolean;
        targets: string[];
    }>({ x: 0, y: 0, visible: false, targets: [] });

    const handleContextMenu = (e: React.MouseEvent, clip: Clip) => {
        e.preventDefault();
        e.stopPropagation();

        let targets = selectedClipIds;
        if (!targets.includes(clip.id)) {
            if (clip.groupId) {
                const groupMembers = clips.filter(c => c.groupId === clip.groupId).map(c => c.id);
                targets = groupMembers;
                groupMembers.forEach(id => {
                    if (!selectedClipIds.includes(id)) onSelectClip(id, true);
                });
            } else {
                targets = [clip.id];
                onSelectClip(clip.id, false);
            }
        }

        setContextMenu({
            x: e.clientX,
            y: e.clientY,
            visible: true,
            targets
        });
    };

    /* -------------------------------------------------- */
    /* ------------------ Work Area --------------------- */
    /* -------------------------------------------------- */

    // Work Area logic is still local. Can be moved later if needed.
    const workAreaDragRef = useRef<{
        type: 'start' | 'end' | 'bar';
        startX: number;
        start: number;
        end: number;
    } | null>(null);

    const handleWorkAreaPointerDown = (
        e: React.PointerEvent,
        type: 'start' | 'end' | 'bar'
    ) => {
        if (!workArea || !onWorkAreaChange) return;
        e.preventDefault();
        e.stopPropagation();
        (e.target as HTMLElement).setPointerCapture(e.pointerId);

        workAreaDragRef.current = {
            type,
            startX: e.clientX,
            start: workArea.start,
            end: workArea.end
        };
    };

    useEffect(() => {
        const handleMove = (e: PointerEvent) => {
            if (!workAreaDragRef.current || !workArea || !onWorkAreaChange) return;

            const { type, startX, start, end } = workAreaDragRef.current;
            const delta = (e.clientX - startX) / zoom;

            if (type === 'bar') {
                const newStart = Math.max(0, start + delta);
                const newEnd = Math.max(newStart + 0.1, end + delta);
                onWorkAreaChange({
                    ...workArea,
                    start: newStart,
                    end: newEnd,
                    enabled: true
                });
            } else if (type === 'start') {
                const newStart = Math.max(0, Math.min(end - 0.1, start + delta));
                onWorkAreaChange({ ...workArea, start: newStart, enabled: true });
            } else if (type === 'end') {
                const newEnd = Math.max(start + 0.1, end + delta);
                onWorkAreaChange({ ...workArea, end: newEnd, enabled: true });
            }
        };

        const handleUp = () => {
            workAreaDragRef.current = null;
        };

        window.addEventListener('pointermove', handleMove);
        window.addEventListener('pointerup', handleUp);
        return () => {
            window.removeEventListener('pointermove', handleMove);
            window.removeEventListener('pointerup', handleUp);
        };
    }, [zoom, workArea, onWorkAreaChange]);

    /* -------------------------------------------------- */
    /* ------------------ Virtualization ---------------- */
    /* -------------------------------------------------- */

    const [visibleRange, setVisibleRange] = useState({ start: 0, end: 100 });

    const updateVisibleRange = useCallback(() => {
        if (!timelineRef.current) return;
        const scrollLeft = timelineRef.current.scrollLeft;
        const width = timelineRef.current.clientWidth;
        const buffer = 600;
        const start = Math.max(0, (scrollLeft - buffer) / zoom);
        const end = (scrollLeft + width + buffer) / zoom;
        setVisibleRange({ start, end });
    }, [zoom]);

    useEffect(() => {
        updateVisibleRange();
        window.addEventListener('resize', updateVisibleRange);
        return () => window.removeEventListener('resize', updateVisibleRange);
    }, [updateVisibleRange]);

    /* -------------------------------------------------- */
    /* ------------------ Ruler Ticks ------------------- */
    /* -------------------------------------------------- */

    const renderRulerTicks = () => {
        // Use Engine logic
        const ticks = TimelineEngine.getRulerTicks(duration, zoom);

        return ticks.map((tick, i) => { // Adding index to key to be safe or use time
            if (tick.type === 'major') {
                return (
                    <div
                        key={`maj-${tick.time}`}
                        className="absolute top-0 bottom-0 select-none pointer-events-none z-10 flex flex-col items-start"
                        style={{ left: tick.time * zoom }}
                    >
                        <div className="h-2.5 w-px bg-white/40" />
                        <span className="text-[10px] font-medium text-gray-400 font-mono mt-0.5 transform -translate-x-1/2 bg-black/60 px-1 rounded backdrop-blur-sm">
                            {TimelineEngine.formatTime(tick.time, zoom)}
                        </span>
                    </div>
                );
            } else {
                return (
                    <div
                        key={`min-${tick.time}`}
                        className="absolute top-0 bottom-0 select-none pointer-events-none z-10 flex flex-col items-start"
                        style={{ left: tick.time * zoom }}
                    >
                        <div className="h-1.5 w-px bg-white/10" />
                    </div>
                );
            }
        });
    };

    /* -------------------------------------------------- */
    /* ------------------ Helpers ----------------------- */
    /* -------------------------------------------------- */

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
        return [...trackClips].sort((a, b) => { // Simple sort, no complex logic needed in Engine yet
            // ... same logic
            const score = (type: MediaType) => {
                if ([MediaType.VIDEO, MediaType.IMAGE, MediaType.AUDIO].includes(type)) return 1;
                if (type === MediaType.TEXT) return 2;
                if (type === MediaType.EFFECT || type === MediaType.ANIMATION) return 3;
                return 0;
            };
            return score(a.type) - score(b.type);
        });
    };

    const handleExternalDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!timelineRef.current) return;

        const rect = timelineRef.current.getBoundingClientRect();
        const scrollLeft = timelineRef.current.scrollLeft;
        const x = e.clientX - rect.left + scrollLeft - TimelineEngine.SIDEBAR_WIDTH;
        const time = Math.max(0, x / zoom);

        const trackId = (e.target as HTMLElement).closest('[data-track-id]')?.getAttribute('data-track-id');
        if (!trackId) return;

        const dragType = e.dataTransfer.getData('dragType');

        // ... same logic for parsing ...
        if (dragType === 'effect') {
            try {
                const effectData = JSON.parse(e.dataTransfer.getData('effectData'));
                if (effectData?.type) onCreateEffectClip(effectData, trackId, time);
            } catch { }
            return;
        }
        // ... (rest of drop logic same)
        if (dragType === 'animation') {
            try {
                const animType = e.dataTransfer.getData('animationType') as AnimationType;
                const rawData = e.dataTransfer.getData('animationData');
                onCreateAnimationClip(animType, trackId, time, rawData ? JSON.parse(rawData) : {});
            } catch { }
            return;
        }
        if (dragType === 'shape') {
            try {
                const shapeData = JSON.parse(e.dataTransfer.getData('text/plain'));
                if (shapeData?.id) onDropAsset(shapeData.id, trackId, time);
            } catch { }
            return;
        }
        const assetId = e.dataTransfer.getData('assetId');
        if (assetId) onDropAsset(assetId, trackId, time);
    };

    return (
        <div
            className="timeline flex flex-col h-full bg-[var(--bg-root)] text-xs select-none relative"
            onClick={() => setContextMenu(prev => ({ ...prev, visible: false }))}
        >
            {/* Toolbar (Same) */}
            <div className="h-10 bg-[var(--bg-header)]/90 backdrop-blur-md border-t border-[var(--border-base)] flex items-center justify-between px-3 z-40 relative">
                <div className="flex items-center gap-1 bg-[var(--bg-item)] p-0.5 rounded-lg border border-[var(--border-light)]">
                    <button onClick={onAddTrack} className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-white transition-all text-[10px] font-medium"><Plus size={11} /> Track</button>
                    <div className="h-3 w-px bg-white/10 mx-1" />
                    <button onClick={onSplitClip} className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-white transition-all text-[10px] font-medium" title="Split (S)"><Scissors size={11} /> Split</button>
                    <button onClick={onDeleteClip} className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-red-500/10 text-[var(--text-secondary)] hover:text-red-400 transition-all text-[10px] font-medium" title="Delete (Del)"><Trash2 size={11} /> Delete</button>
                    <div className="h-3 w-px bg-white/10 mx-1" />
                    {workArea && onWorkAreaChange && (
                        <button onClick={() => onWorkAreaChange({ ...workArea, enabled: !workArea.enabled })} className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-all text-[10px] font-medium ${workArea.enabled ? 'bg-blue-500/20 text-blue-400' : 'hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]'}`} title="Toggle Work Area Loop"><span className="text-[10px]">Loop</span></button>
                    )}
                </div>
                <div className="flex items-center gap-2 bg-[var(--bg-item)] p-0.5 rounded-lg border border-[var(--border-light)]">
                    <button onClick={() => onZoomChange(Math.max(10, zoom - 50))} className="p-1 hover:bg-[var(--bg-hover)] rounded-md text-gray-400 hover:text-white transition"><ZoomOut size={11} /></button>
                    <input type="range" min="10" max="3000" step="10" value={zoom} onChange={(e) => onZoomChange(Number(e.target.value))} className="w-20 h-1 bg-[var(--bg-panel)] rounded-lg appearance-none cursor-pointer accent-[var(--accent-primary)]" />
                    <button onClick={() => onZoomChange(Math.min(3000, zoom + 50))} className="p-1 hover:bg-[var(--bg-hover)] rounded-md text-gray-400 hover:text-white transition"><ZoomIn size={11} /></button>
                </div>
            </div>

            {/* Timeline Area */}
            <div className="flex-1 flex flex-col overflow-hidden relative">
                <div
                    className="flex-1 overflow-auto bg-[var(--bg-root)] relative custom-scrollbar"
                    ref={timelineRef}
                    onClick={handleTimelineClick}
                    onScroll={updateVisibleRange}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleExternalDrop}
                >
                    {/* Ruler */}
                    <div className="flex h-8 bg-[var(--bg-panel)] min-w-max sticky top-0 z-30 border-b border-[var(--border-base)]">
                        <div className="w-[200px] border-r border-[var(--border-base)] bg-[var(--bg-panel)] z-40 sticky left-0 flex items-center justify-center">
                            <div className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest">Tracks</div>
                        </div>
                        <div className="relative h-full cursor-pointer overflow-hidden pt-2" style={{ width: duration * zoom }} ref={rulerRef}>
                            {/* Work Area Bar */}
                            {workArea && workArea.enabled && (
                                <div className="absolute top-0 h-2 bg-blue-500/20 border-b border-blue-500/50 z-20 group/wa rounded-sm" style={{ left: workArea.start * zoom, width: (workArea.end - workArea.start) * zoom }}>
                                    <div className="absolute inset-x-0 top-0 h-full cursor-grab active:cursor-grabbing hover:bg-blue-500/30" onPointerDown={(e) => handleWorkAreaPointerDown(e, 'bar')} />
                                    <div className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize bg-blue-500 hover:bg-blue-400 rounded-l-sm" onPointerDown={(e) => handleWorkAreaPointerDown(e, 'start')} />
                                    <div className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize bg-blue-500 hover:bg-blue-400 rounded-r-sm" onPointerDown={(e) => handleWorkAreaPointerDown(e, 'end')} />
                                    <div className="absolute top-full left-0 mt-0.5 text-[9px] text-blue-400 font-mono bg-black/60 px-1 rounded opacity-0 group-hover/wa:opacity-100 pointer-events-none whitespace-nowrap">
                                        Work Area: {TimelineEngine.formatTime(workArea.start, zoom)} - {TimelineEngine.formatTime(workArea.end, zoom)}
                                    </div>
                                </div>
                            )}
                            {renderRulerTicks()}
                        </div>
                    </div>

                    {/* Tracks */}
                    <div className="relative min-w-max pb-8">
                        {/* Playhead */}
                        <div className="absolute top-0 bottom-0 z-20 pointer-events-none" style={{ left: (currentTime * zoom) + TimelineEngine.SIDEBAR_WIDTH }}>
                            <div className="h-full w-px bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></div>
                            <div className="absolute top-0 -translate-x-1/2 -mt-1 text-[9px] font-mono bg-red-500 text-white px-1.5 py-0.5 rounded shadow-sm">{TimelineEngine.formatTime(currentTime, zoom)}</div>
                        </div>

                        {/* Ghost Clip Overlay */}
                        {ghost && (
                            <div
                                className="absolute pointer-events-none z-50 bg-blue-500/20 border border-blue-500/50 rounded flex items-center px-2"
                                style={{
                                    left: ghost.left,
                                    top: ghost.top,
                                    height: ghost.height,
                                    width: ghost.clip.duration * zoom
                                }}
                            >
                                <span className="text-[10px] text-white/50">{TimelineEngine.formatTime(ghost.clip.start, 100)}</span>
                            </div>
                        )}

                        {/* Track Rows */}
                        {tracks.map(track => {
                            const trackClips = clips.filter(c => c.trackId === track.id);
                            return (
                                <div key={track.id} data-track-id={track.id} className="flex group/track hover:bg-white/[0.02] transition-colors" style={{ height: TimelineEngine.TRACK_HEIGHT }}>
                                    {/* Header */}
                                    <div className="w-[200px] sticky left-0 z-20 border-r border-[var(--border-base)] bg-[var(--bg-panel)] flex items-center px-4 justify-between group-hover/track:bg-[var(--bg-hover)]/30 transition-colors">
                                        <div className="flex items-center gap-2">
                                            {getIcon(track.type)}
                                            <span className="text-[11px] font-medium text-gray-300 truncate w-20">{track.name}</span>
                                        </div>
                                        {onDeleteTrack && (
                                            <button onClick={() => onDeleteTrack(track.id)} className="opacity-0 group-hover/track:opacity-100 p-1 hover:bg-white/10 rounded text-gray-400 hover:text-red-400 transition-all"><Trash2 size={12} /></button>
                                        )}
                                    </div>

                                    {/* Lane */}
                                    <div className="relative border-b border-[var(--border-base)]" style={{ width: duration * zoom }}>
                                        {sortClipsForRender(trackClips).map(clip => (
                                            <TimelineClip
                                                key={clip.id}
                                                clip={clip}
                                                zoom={zoom}
                                                height={TimelineEngine.CLIP_HEIGHT}
                                                isSelected={selectedClipIds.includes(clip.id)}
                                                onClick={(e) => handleClipClick(e, clip.id)}
                                                onContextMenu={(e) => handleContextMenu(e, clip)}
                                                onResizeStart={(e) => handleResizeStart(e, clip)}
                                                onPointerDown={(e) => handleClipPointerDown(e, clip)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Context Menu */}
                {/* Context Menu */}
                {contextMenu.visible && (
                    <TimelineContextMenu
                        x={contextMenu.x}
                        y={contextMenu.y}
                        onClose={() => setContextMenu(prev => ({ ...prev, visible: false }))}
                        onDelete={onDeleteClip}
                        onSplit={onSplitClip}
                        onGroup={onGroup}
                        onUngroup={onUngroup}
                        canGroup={canGroup}
                        canUngroup={canUngroup}
                    />
                )}
            </div>
        </div>
    );
};

export default Timeline;
