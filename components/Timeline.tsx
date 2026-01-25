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
import { getTransformTargets } from './timeline/timelineUtils';
import { TimelineContextMenu } from './timeline/TimelineContextMenu';

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
}

const SIDEBAR_WIDTH = 200;
const TRACK_HEIGHT = 64;
const TRACK_PADDING_Y = 6;
const CLIP_HEIGHT = TRACK_HEIGHT - TRACK_PADDING_Y * 2;
const SNAP = 0.1;

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
    const timelineRef = useRef<HTMLDivElement>(null);
    const rulerRef = useRef<HTMLDivElement>(null);

    /* -------------------------------------------------- */
    /* ----------------- Time Formatting ---------------- */
    /* -------------------------------------------------- */

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        const ms3 = Math.floor((seconds % 1) * 1000);
        if (zoom > 500)
            return `${m}:${s.toString().padStart(2, '0')}.${ms3
                .toString()
                .padStart(3, '0')}`;
        return `${m}:${s.toString().padStart(2, '0')}.${ms3
            .toString()
            .padStart(2, '0')
            .slice(0, 2)}`;
    };

    /* -------------------------------------------------- */
    /* ----------------- Seek Handling ------------------ */
    /* -------------------------------------------------- */

    const seekFromEvent = useCallback(
        (clientX: number) => {
            if (!timelineRef.current) return;
            const rect = timelineRef.current.getBoundingClientRect();
            const scrollLeft = timelineRef.current.scrollLeft;
            const x = clientX - rect.left + scrollLeft - SIDEBAR_WIDTH;
            onSeek(Math.max(0, x / zoom));
        },
        [onSeek, zoom]
    );

    const handleTimelineClick = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('[data-clip-id]')) return;
        seekFromEvent(e.clientX);
        onClearSelection();
    };

    /* -------------------------------------------------- */
    /* ----------------- Clip Selection ---------------- */
    /* -------------------------------------------------- */

    const handleClipClick = (e: React.MouseEvent, clipId: string) => {
        e.stopPropagation();

        // Don't select if this was a drag operation
        if (dragRef.current?.hasMoved) {
            return;
        }

        const clickedClip = clips.find(c => c.id === clipId);

        let idsToSelect = [clipId];

        // Auto-select group members
        if (clickedClip?.groupId) {
            idsToSelect = clips
                .filter(c => c.groupId === clickedClip.groupId)
                .map(c => c.id);
        }

        if (e.ctrlKey || e.metaKey) {
            // Multi-select: toggle each ID
            idsToSelect.forEach(id => onSelectClip(id, true));
        } else {
            // Single select: clear and select only these IDs
            onClearSelection();
            idsToSelect.forEach(id => onSelectClip(id, true));
        }
    };

    /* -------------------------------------------------- */
    /* ------------------ Group Logic ------------------- */
    /* -------------------------------------------------- */

    const groupSelected = useCallback(() => {
        if (selectedClipIds.length < 2) return;
        const gid = crypto.randomUUID();
        selectedClipIds.forEach((id) =>
            onClipUpdate(id, { groupId: gid })
        );
    }, [selectedClipIds, onClipUpdate]);

    const ungroupSelected = useCallback(() => {
        selectedClipIds.forEach((id) =>
            onClipUpdate(id, { groupId: null })
        );
    }, [selectedClipIds, onClipUpdate]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'g' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                groupSelected();
            }
            if (e.key === 'u' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                ungroupSelected();
            }
            if (e.key === 'Escape') {
                onClearSelection();
                setContextMenu(prev => ({ ...prev, visible: false }));
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [groupSelected, ungroupSelected, onClearSelection]);

    /* -------------------------------------------------- */
    /* ------------------ Resize Logic ------------------ */
    /* -------------------------------------------------- */

    const resizingRef = useRef<{
        baseClip: Clip;
        targets: Clip[];
        startX: number;
        originals: Map<string, { start: number; duration: number }>;
    } | null>(null);

    const handleResizeStart = (e: React.PointerEvent, clip: Clip) => {
        e.stopPropagation();
        e.preventDefault();
        (e.target as HTMLElement).setPointerCapture(e.pointerId);

        const targets = getTransformTargets(clip, clips, selectedClipIds);
        const originals = new Map(
            targets.map(c => [c.id, { start: c.start, duration: c.duration }])
        );

        resizingRef.current = {
            baseClip: clip,
            targets,
            startX: e.clientX,
            originals
        };
    };

    /* -------------------------------------------------- */
    /* ------------------ Drag Logic -------------------- */
    /* -------------------------------------------------- */

    const dragRef = useRef<{
        baseClip: Clip;
        targets: Clip[];
        startX: number;
        startY: number;
        grabOffsetX: number;
        originals: Map<string, { start: number; trackId: string }>;
        preview?: Clip[];
        hasMoved?: boolean;
    } | null>(null);

    const [ghost, setGhost] = useState<{
        clip: Clip;
        left: number;
        top: number;
        height: number;
        targets?: Clip[]; // Add targets to ghost state
    } | null>(null);

    const getTrackFromPoint = (x: number, y: number) => {
        const el = document.elementFromPoint(x, y) as HTMLElement | null;
        return el?.closest('[data-track-id]') as HTMLElement | null;
    };

    const handleClipPointerDown = (e: React.PointerEvent, clip: Clip) => {
        e.preventDefault();
        e.stopPropagation();
        (e.target as HTMLElement).setPointerCapture(e.pointerId);

        // Determine current selection for drag
        const currentSelection = selectedClipIds.includes(clip.id)
            ? selectedClipIds
            : [clip.id];

        const targets = getTransformTargets(clip, clips, currentSelection);
        const originals = new Map(
            targets.map(c => [c.id, { start: c.start, trackId: c.trackId }])
        );

        const rect = timelineRef.current!.getBoundingClientRect();
        const scrollLeft = timelineRef.current!.scrollLeft;
        const clipLeftPx = SIDEBAR_WIDTH + clip.start * zoom;
        const grabOffsetX =
            e.clientX - rect.left + scrollLeft - clipLeftPx;

        const trackEl = document.querySelector(
            `[data-track-id="${clip.trackId}"]`
        ) as HTMLElement;

        dragRef.current = {
            baseClip: clip,
            targets,
            startX: e.clientX,
            startY: e.clientY,
            grabOffsetX,
            originals,
            preview: targets,
            hasMoved: false
        };

        setGhost({
            clip,
            left: clipLeftPx,
            top: trackEl.offsetTop + TRACK_PADDING_Y,
            height: CLIP_HEIGHT,
            targets // Pass multiple targets to ghost if needed, or just offset logic
        });
    };

    /* -------------------------------------------------- */
    /* ------------------ Context Menu ------------------ */
    /* -------------------------------------------------- */

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
        // If right-clicked clip isn't selected, select it (and its group)
        if (!targets.includes(clip.id)) {
            if (clip.groupId) {
                const groupMembers = clips.filter(c => c.groupId === clip.groupId).map(c => c.id);
                targets = groupMembers;
                groupMembers.forEach(id => {
                    // We need to notify parent selection change if possible, 
                    // but here we just update local context targets
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
    /* ------------------ Global Pointer Move ----------- */
    /* -------------------------------------------------- */

    useEffect(() => {
        const handleMove = (e: PointerEvent) => {
            /* ---------- RESIZING ---------- */
            if (resizingRef.current) {
                const { baseClip, targets, startX, originals } = resizingRef.current;
                const deltaX = e.clientX - startX;
                const deltaTime = deltaX / zoom;

                const baseOriginal = originals.get(baseClip.id)!;
                const newBaseDuration = Math.max(
                    0.05,
                    Math.round((baseOriginal.duration + deltaTime) / SNAP) * SNAP
                );

                const scale = newBaseDuration / baseOriginal.duration;

                targets.forEach(c => {
                    const orig = originals.get(c.id)!;
                    if (c.id === baseClip.id) {
                        onClipUpdate(c.id, { duration: newBaseDuration });
                    } else {
                        const offset = orig.start - baseOriginal.start;
                        onClipUpdate(c.id, {
                            start: baseOriginal.start + offset * scale,
                            duration: orig.duration * scale
                        });
                    }
                });
                return;
            }

            /* ---------- DRAGGING ---------- */
            if (!dragRef.current || !timelineRef.current) return;

            const { baseClip, targets, grabOffsetX, originals } = dragRef.current;

            // Mark that we've started dragging
            if (dragRef.current) {
                dragRef.current.hasMoved = true;
            }
            const rect = timelineRef.current.getBoundingClientRect();
            const scrollLeft = timelineRef.current.scrollLeft;

            const rawX =
                e.clientX - rect.left + scrollLeft - grabOffsetX;
            const rawTime = Math.max(0, (rawX - SIDEBAR_WIDTH) / zoom);
            const snappedTime = Math.round(rawTime / SNAP) * SNAP;

            const baseOrig = originals.get(baseClip.id)!;
            const delta = snappedTime - baseOrig.start;

            const trackEl = getTrackFromPoint(e.clientX, e.clientY);
            const newTrackId = trackEl?.dataset.trackId || baseClip.trackId;

            setGhost(g => ({
                clip: baseClip,
                left: SIDEBAR_WIDTH + snappedTime * zoom,
                top: trackEl
                    ? trackEl.offsetTop + TRACK_PADDING_Y
                    : g?.top ?? 0,
                height: CLIP_HEIGHT
            }));

            dragRef.current.preview = targets.map(c => {
                const orig = originals.get(c.id)!;
                return {
                    ...c,
                    start: Math.max(0, orig.start + delta),
                    trackId:
                        c.id === baseClip.id
                            ? newTrackId
                            : orig.trackId
                };
            });
        };

        const handleUp = () => {
            if (dragRef.current?.preview) {
                dragRef.current.preview.forEach(c => {
                    onClipMove(c.id, c.start, c.trackId);
                });
            }
            dragRef.current = null;
            resizingRef.current = null;
            setGhost(null);
        };

        window.addEventListener('pointermove', handleMove);
        window.addEventListener('pointerup', handleUp);
        return () => {
            window.removeEventListener('pointermove', handleMove);
            window.removeEventListener('pointerup', handleUp);
        };
    }, [zoom, onClipMove, onClipUpdate]);

    /* -------------------------------------------------- */
    /* ------------------ Work Area --------------------- */
    /* -------------------------------------------------- */

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
        const ticks = [];
        let labelInterval = 1;
        if (zoom >= 200) labelInterval = 0.5;
        else if (zoom >= 100) labelInterval = 1;
        else if (zoom >= 50) labelInterval = 2;
        else if (zoom >= 20) labelInterval = 5;
        else if (zoom >= 10) labelInterval = 10;
        else if (zoom >= 5) labelInterval = 15;
        else labelInterval = 30;

        let minorStep = labelInterval / 5;
        if (minorStep < 0.1) minorStep = 0.1;

        for (let i = 0; i <= duration; i += minorStep) {
            const time = Math.round(i * 100) / 100;
            const isLabel =
                Math.abs(time % labelInterval) < 0.01 ||
                Math.abs(labelInterval - (time % labelInterval)) < 0.01;

            if (isLabel) {
                ticks.push(
                    <div
                        key={`maj-${time}`}
                        className="absolute top-0 bottom-0 select-none pointer-events-none z-10 flex flex-col items-start"
                        style={{ left: time * zoom }}
                    >
                        <div className="h-2.5 w-px bg-white/40" />
                        <span className="text-[10px] font-medium text-gray-400 font-mono mt-0.5 transform -translate-x-1/2 bg-black/60 px-1 rounded backdrop-blur-sm">
                            {formatTime(time)}
                        </span>
                    </div>
                );
            } else {
                ticks.push(
                    <div
                        key={`min-${time}`}
                        className="absolute top-0 bottom-0 select-none pointer-events-none z-10 flex flex-col items-start"
                        style={{ left: time * zoom }}
                    >
                        <div className="h-1.5 w-px bg-white/10" />
                    </div>
                );
            }
        }
        return ticks;
    };

    /* -------------------------------------------------- */
    /* ------------------ Helpers ----------------------- */
    /* -------------------------------------------------- */

    const getIcon = (type: MediaType) => {
        switch (type) {
            case MediaType.VIDEO:
                return <Film size={14} className="text-blue-400" />;
            case MediaType.IMAGE:
                return <ImageIcon size={14} className="text-purple-400" />;
            case MediaType.AUDIO:
                return <Music size={14} className="text-green-400" />;
            case MediaType.TEXT:
                return <Type size={14} className="text-yellow-400" />;
            case MediaType.EFFECT:
                return <Wand2 size={14} className="text-pink-400" />;
            case MediaType.ANIMATION:
                return <Move size={14} className="text-orange-400" />;
        }
    };

    const sortClipsForRender = (trackClips: Clip[]) => {
        return [...trackClips].sort((a, b) => {
            const score = (type: MediaType) => {
                if (
                    type === MediaType.VIDEO ||
                    type === MediaType.IMAGE ||
                    type === MediaType.AUDIO
                )
                    return 1;
                if (type === MediaType.TEXT) return 2;
                if (type === MediaType.EFFECT || type === MediaType.ANIMATION)
                    return 3;
                return 0;
            };
            return score(a.type) - score(b.type);
        });
    };

    /* -------------------------------------------------- */
    /* ------------------ Drop External Assets ---------- */
    /* -------------------------------------------------- */

    const handleExternalDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!timelineRef.current) return;

        const rect = timelineRef.current.getBoundingClientRect();
        const scrollLeft = timelineRef.current.scrollLeft;
        const x = e.clientX - rect.left + scrollLeft - SIDEBAR_WIDTH;
        const time = Math.max(0, x / zoom);

        const trackId = (e.target as HTMLElement)
            .closest('[data-track-id]')
            ?.getAttribute('data-track-id');
        if (!trackId) return;

        const dragType = e.dataTransfer.getData('dragType');

        if (dragType === 'effect') {
            try {
                const effectData = JSON.parse(e.dataTransfer.getData('effectData'));
                if (effectData?.type) onCreateEffectClip(effectData, trackId, time);
            } catch { }
            return;
        }

        if (dragType === 'animation') {
            try {
                const animType = e.dataTransfer.getData(
                    'animationType'
                ) as AnimationType;
                const rawData = e.dataTransfer.getData('animationData');
                onCreateAnimationClip(
                    animType,
                    trackId,
                    time,
                    rawData ? JSON.parse(rawData) : {}
                );
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

    /* -------------------------------------------------- */
    /* ------------------ Render ------------------------ */
    /* -------------------------------------------------- */

    return (
        <div
            className="timeline flex flex-col h-full bg-[var(--bg-root)] text-xs select-none relative"
            onClick={() => setContextMenu(prev => ({ ...prev, visible: false }))}
        >
            {/* Toolbar */}
            <div className="h-10 bg-[var(--bg-header)]/90 backdrop-blur-md border-t border-[var(--border-base)] flex items-center justify-between px-3 z-40 relative">
                <div className="flex items-center gap-1 bg-[var(--bg-item)] p-0.5 rounded-lg border border-[var(--border-light)]">
                    <button
                        onClick={onAddTrack}
                        className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-white transition-all text-[10px] font-medium"
                    >
                        <Plus size={11} /> Track
                    </button>
                    <div className="h-3 w-px bg-white/10 mx-1" />
                    <button
                        onClick={onSplitClip}
                        className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-white transition-all text-[10px] font-medium"
                        title="Split (S)"
                    >
                        <Scissors size={11} /> Split
                    </button>
                    <button
                        onClick={onDeleteClip}
                        className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-red-500/10 text-[var(--text-secondary)] hover:text-red-400 transition-all text-[10px] font-medium"
                        title="Delete (Del)"
                    >
                        <Trash2 size={11} /> Delete
                    </button>
                    <div className="h-3 w-px bg-white/10 mx-1" />
                    {workArea && onWorkAreaChange && (
                        <button
                            onClick={() =>
                                onWorkAreaChange({ ...workArea, enabled: !workArea.enabled })
                            }
                            className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-all text-[10px] font-medium ${workArea.enabled
                                ? 'bg-blue-500/20 text-blue-400'
                                : 'hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]'
                                }`}
                            title="Toggle Work Area Loop"
                        >
                            <span className="text-[10px]">Loop</span>
                        </button>
                    )}
                </div>
                <div className="flex items-center gap-2 bg-[var(--bg-item)] p-0.5 rounded-lg border border-[var(--border-light)]">
                    <button
                        onClick={() => onZoomChange(Math.max(10, zoom - 50))}
                        className="p-1 hover:bg-[var(--bg-hover)] rounded-md text-gray-400 hover:text-white transition"
                    >
                        <ZoomOut size={11} />
                    </button>
                    <input
                        type="range"
                        min="10"
                        max="3000"
                        step="10"
                        value={zoom}
                        onChange={(e) => onZoomChange(Number(e.target.value))}
                        className="w-20 h-1 bg-[var(--bg-panel)] rounded-lg appearance-none cursor-pointer accent-[var(--accent-primary)]"
                    />
                    <button
                        onClick={() => onZoomChange(Math.min(3000, zoom + 50))}
                        className="p-1 hover:bg-[var(--bg-hover)] rounded-md text-gray-400 hover:text-white transition"
                    >
                        <ZoomIn size={11} />
                    </button>
                </div>
            </div>

            {/* Timeline */}
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
                            <div className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest">
                                Tracks
                            </div>
                        </div>
                        <div
                            className="relative h-full cursor-pointer overflow-hidden pt-2"
                            style={{ width: duration * zoom }}
                            ref={rulerRef}
                        >
                            {/* Work Area Bar */}
                            {workArea && workArea.enabled && (
                                <div
                                    className="absolute top-0 h-2 bg-blue-500/20 border-b border-blue-500/50 z-20 group/wa rounded-sm"
                                    style={{
                                        left: workArea.start * zoom,
                                        width: (workArea.end - workArea.start) * zoom
                                    }}
                                >
                                    <div
                                        className="absolute inset-x-0 top-0 h-full cursor-grab active:cursor-grabbing hover:bg-blue-500/30"
                                        onPointerDown={(e) => handleWorkAreaPointerDown(e, 'bar')}
                                    />
                                    <div
                                        className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize bg-blue-500 hover:bg-blue-400 rounded-l-sm"
                                        onPointerDown={(e) => handleWorkAreaPointerDown(e, 'start')}
                                    />
                                    <div
                                        className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize bg-blue-500 hover:bg-blue-400 rounded-r-sm"
                                        onPointerDown={(e) => handleWorkAreaPointerDown(e, 'end')}
                                    />
                                    <div className="absolute top-full left-0 mt-0.5 text-[9px] text-blue-400 font-mono bg-black/60 px-1 rounded opacity-0 group-hover/wa:opacity-100 pointer-events-none whitespace-nowrap">
                                        Work Area: {formatTime(workArea.start)} -{' '}
                                        {formatTime(workArea.end)}
                                    </div>
                                </div>
                            )}
                            {renderRulerTicks()}
                        </div>
                    </div>

                    {/* Tracks */}
                    <div className="relative min-w-max pb-8">
                        {zoom > 50 && (
                            <div
                                className="absolute inset-0 pointer-events-none z-0"
                                style={{
                                    left: SIDEBAR_WIDTH,
                                    width: duration * zoom,
                                    backgroundImage:
                                        'linear-gradient(to right, var(--border-base) 1px, transparent 1px)',
                                    backgroundSize: `${zoom}px 100%`,
                                    opacity: 0.08
                                }}
                            />
                        )}

                        {/* Dim outside work area */}
                        {workArea && workArea.enabled && (
                            <>
                                <div
                                    className="absolute top-0 bottom-0 bg-black/40 pointer-events-none z-10"
                                    style={{ left: SIDEBAR_WIDTH, width: workArea.start * zoom }}
                                />
                                <div
                                    className="absolute top-0 bottom-0 bg-black/40 pointer-events-none z-10"
                                    style={{
                                        left: SIDEBAR_WIDTH + workArea.end * zoom,
                                        width: (duration - workArea.end) * zoom
                                    }}
                                />
                            </>
                        )}

                        {tracks.map((track) => (
                            <div
                                key={track.id}
                                data-track-id={track.id}
                                className="timeline-track group/track flex border-b border-white/5 hover:bg-white/[0.015] transition-colors"
                                style={{ height: TRACK_HEIGHT }}
                            >
                                {/* Track Sidebar */}
                                <div className="w-[200px] flex-shrink-0 z-20 sticky left-0 border-r border-white/5 bg-[#0b101a] flex items-center">
                                    <div className="flex items-center px-3 gap-2 text-[11px] text-gray-300 group-hover/track:text-white transition-colors">
                                        <div className="p-1.5 rounded-md bg-white/5">
                                            {getIcon(track.type)}
                                        </div>
                                        <span className="truncate font-medium tracking-wide">
                                            {track.name}
                                        </span>
                                    </div>
                                </div>

                                {/* Track Body */}
                                <div
                                    className="relative flex-1"
                                    style={{ width: duration * zoom }}
                                >
                                    {sortClipsForRender(
                                        clips.filter(
                                            (c) =>
                                                c.trackId === track.id &&
                                                c.start + c.duration >= visibleRange.start &&
                                                c.start <= visibleRange.end
                                        )).map((clip) => (
                                            <TimelineClip
                                                key={clip.id}
                                                clip={clip}
                                                isSelected={selectedClipIds.includes(clip.id)}
                                                isMultiSelected={
                                                    selectedClipIds.includes(clip.id) &&
                                                    selectedClipIds.length > 1
                                                }
                                                zoom={zoom}
                                                onClick={handleClipClick}
                                                onPointerDown={handleClipPointerDown}
                                                onResizeStart={handleResizeStart}
                                                onContextMenu={handleContextMenu}
                                            />
                                        ))}
                                </div>
                            </div>
                        ))}

                        {/* Drag Ghost */}
                        {ghost && (
                            <div
                                className="absolute z-50 rounded-md border shadow-xl pointer-events-none flex items-center px-2 backdrop-blur-sm transition-transform duration-50"
                                style={{
                                    left: ghost.left,
                                    top: ghost.top,
                                    height: ghost.height,
                                    width: ghost.clip.duration * zoom,
                                    background:
                                        ghost.clip.type === MediaType.VIDEO
                                            ? 'rgba(30,58,138,.75)'
                                            : ghost.clip.type === MediaType.IMAGE
                                                ? 'rgba(88,28,135,.75)'
                                                : ghost.clip.type === MediaType.TEXT
                                                    ? 'rgba(113,63,18,.75)'
                                                    : ghost.clip.type === MediaType.AUDIO
                                                        ? 'rgba(20,83,45,.75)'
                                                        : 'rgba(59,130,246,.65)',
                                    borderColor: 'rgba(255,255,255,.35)'
                                }}
                            >
                                <span className="text-white text-[11px] font-semibold truncate">
                                    {ghost.clip.name}
                                </span>
                            </div>
                        )}

                        {/* Playhead */}
                        <div
                            className="absolute top-0 bottom-0 w-px bg-[var(--accent-primary)] pointer-events-none z-50 shadow-[0_0_8px_rgba(59,130,246,0.6)]"
                            style={{ left: SIDEBAR_WIDTH + currentTime * zoom }}
                        >
                            <div className="absolute -top-1 -left-1.5 w-3 h-3 bg-[var(--accent-primary)] transform rotate-45 shadow-sm rounded-[1px]" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Context Menu */}
            {contextMenu.visible && (
                <TimelineContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    onClose={() => setContextMenu(prev => ({ ...prev, visible: false }))}
                    onGroup={groupSelected}
                    onUngroup={ungroupSelected}
                    onDelete={onDeleteClip}
                    onSplit={onSplitClip}
                    canGroup={selectedClipIds.length > 1}
                    canUngroup={selectedClipIds.some(id => clips.find(c => c.id === id)?.groupId)}
                />
            )}
        </div>
    );
};

export default Timeline;
