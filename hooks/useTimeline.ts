import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Clip, Track } from '../types';
import { TimelineEngine } from '../engines/timeline/TimelineEngine';

interface UseTimelineProps {
    clips: Clip[];
    tracks: Track[];
    zoom: number;
    timelineRef: React.RefObject<HTMLDivElement>;
    onClipUpdate: (clipId: string, updates: Partial<Clip>) => void;
    onClipMove: (clipId: string, newStart: number, newTrackId: string) => void;
    onSelectClip: (id: string, isMulti: boolean) => void;
    onClearSelection: () => void;
    selectedClipIds: string[];
}

export const useTimeline = ({
    clips,
    zoom,
    timelineRef,
    onClipUpdate,
    onClipMove,
    onSelectClip,
    onClearSelection,
    selectedClipIds
}: UseTimelineProps) => {

    // Refs
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

    const resizingRef = useRef<{
        baseClip: Clip;
        targets: Clip[];
        startX: number;
        originals: Map<string, { start: number; duration: number }>;
    } | null>(null);

    // State
    const [ghost, setGhost] = useState<{
        clip: Clip;
        left: number;
        top: number;
        height: number;
        targets?: Clip[];
    } | null>(null);

    // Helpers
    const getTrackFromPoint = (x: number, y: number) => {
        const el = document.elementFromPoint(x, y) as HTMLElement | null;
        return el?.closest('[data-track-id]') as HTMLElement | null;
    };

    // User Actions
    const handleClipClick = useCallback((e: React.MouseEvent, clipId: string) => {
        e.stopPropagation();
        if (dragRef.current?.hasMoved) return;

        const clickedClip = clips.find(c => c.id === clipId);
        let idsToSelect = [clipId];

        if (clickedClip?.groupId) {
            idsToSelect = clips
                .filter(c => c.groupId === clickedClip.groupId)
                .map(c => c.id);
        }

        if (e.ctrlKey || e.metaKey) {
            idsToSelect.forEach(id => onSelectClip(id, true));
        } else {
            onClearSelection();
            idsToSelect.forEach(id => onSelectClip(id, true));
        }
    }, [clips, onSelectClip, onClearSelection]);

    const handleClipPointerDown = (e: React.PointerEvent, clip: Clip) => {
        e.preventDefault();
        e.stopPropagation();
        (e.target as HTMLElement).setPointerCapture(e.pointerId);

        const currentSelection = selectedClipIds.includes(clip.id)
            ? selectedClipIds
            : [clip.id];

        const targets = TimelineEngine.getTransformTargets(clip, clips, currentSelection);
        const originals = new Map(
            targets.map(c => [c.id, { start: c.start, trackId: c.trackId }])
        );

        if (!timelineRef.current) return;
        const rect = timelineRef.current.getBoundingClientRect();
        const scrollLeft = timelineRef.current.scrollLeft;
        const clipLeftPx = TimelineEngine.SIDEBAR_WIDTH + clip.start * zoom;
        const grabOffsetX = e.clientX - rect.left + scrollLeft - clipLeftPx;

        const trackEl = document.querySelector(`[data-track-id="${clip.trackId}"]`) as HTMLElement;

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
            top: trackEl ? trackEl.offsetTop + TimelineEngine.TRACK_PADDING_Y : 0,
            height: TimelineEngine.CLIP_HEIGHT,
            targets
        });
    };

    const handleResizeStart = (e: React.PointerEvent, clip: Clip) => {
        e.stopPropagation();
        e.preventDefault();
        (e.target as HTMLElement).setPointerCapture(e.pointerId);

        const targets = TimelineEngine.getTransformTargets(clip, clips, selectedClipIds);
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

    // Global Event Listener
    useEffect(() => {
        const handleMove = (e: PointerEvent) => {
            // RESIZING
            if (resizingRef.current) {
                const { baseClip, targets, startX, originals } = resizingRef.current;
                const deltaX = e.clientX - startX;
                const deltaTime = deltaX / zoom;
                const snap = TimelineEngine.SNAP_INTERVAL;

                const baseOriginal = originals.get(baseClip.id)!;
                const newBaseDuration = Math.max(
                    0.05,
                    Math.round((baseOriginal.duration + deltaTime) / snap) * snap
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

            // DRAGGING
            if (!dragRef.current || !timelineRef.current) return;

            const { baseClip, targets, grabOffsetX, originals } = dragRef.current;
            dragRef.current.hasMoved = true;

            const rect = timelineRef.current.getBoundingClientRect();
            const scrollLeft = timelineRef.current.scrollLeft;

            const rawX = e.clientX - rect.left + scrollLeft - grabOffsetX;
            // Use Engine for time calc
            const rawTime = Math.max(0, (rawX - TimelineEngine.SIDEBAR_WIDTH) / zoom);
            const snappedTime = TimelineEngine.snapTime(rawTime);

            const baseOrig = originals.get(baseClip.id)!;
            const delta = snappedTime - baseOrig.start;

            const trackEl = getTrackFromPoint(e.clientX, e.clientY);
            const newTrackId = trackEl?.dataset.trackId || baseClip.trackId;

            setGhost(g => ({
                clip: baseClip,
                left: TimelineEngine.SIDEBAR_WIDTH + snappedTime * zoom,
                top: trackEl ? trackEl.offsetTop + TimelineEngine.TRACK_PADDING_Y : (g?.top ?? 0),
                height: TimelineEngine.CLIP_HEIGHT
            }));

            dragRef.current.preview = targets.map(c => {
                const orig = originals.get(c.id)!;
                return {
                    ...c,
                    start: Math.max(0, orig.start + delta),
                    trackId: c.id === baseClip.id ? newTrackId : orig.trackId
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
    }, [zoom, onClipMove, onClipUpdate, timelineRef]); // Added timelineRef dependency

    const groupSelected = useCallback(() => {
        if (selectedClipIds.length < 2) return;
        const gid = crypto.randomUUID();
        selectedClipIds.forEach((id) => onClipUpdate(id, { groupId: gid }));
    }, [selectedClipIds, onClipUpdate]);

    const ungroupSelected = useCallback(() => {
        selectedClipIds.forEach((id) => onClipUpdate(id, { groupId: null }));
    }, [selectedClipIds, onClipUpdate]);

    // Keyboard Shortcuts
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
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [groupSelected, ungroupSelected, onClearSelection]);

    return {
        handleClipClick,
        handleClipPointerDown,
        handleResizeStart,
        groupSelected,
        ungroupSelected,
        ghost
    };
};
