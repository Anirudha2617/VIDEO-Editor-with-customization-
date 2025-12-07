
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
    onAddTrack
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

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault(); // Essential to allow dropping
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
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
            const effectData = JSON.parse(e.dataTransfer.getData('effectData'));
            const targetClip = clips.find(c => c.id === targetClipId);
            if (targetClip) onClipUpdate(targetClipId, { effects: [...(targetClip.effects || []), effectData] });
            return;
        }

        if (dragType === 'animation' && targetClipId) {
            const animType = e.dataTransfer.getData('animationType') as AnimationType;
            const rawData = e.dataTransfer.getData('animationData');
            let duration = 1.0;
            if (rawData) duration = JSON.parse(rawData).duration || 1.0;
            onClipUpdate(targetClipId, { animationIn: animType, animationInDuration: duration });
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
            const effectData = JSON.parse(e.dataTransfer.getData('effectData'));
            onCreateEffectClip(effectData, trackId, time);
        } else if (dragType === 'animation') {
            const animType = e.dataTransfer.getData('animationType') as AnimationType;
            const rawData = e.dataTransfer.getData('animationData');
            onCreateAnimationClip(animType, trackId, time, rawData ? JSON.parse(rawData) : {});
        } else if (dragType === 'shape') {
            const shapeDataStr = e.dataTransfer.getData('text/plain'); // Use standard MIME type
            console.log('[Timeline] Shape drop received:', shapeDataStr);
            const shapeData = JSON.parse(shapeDataStr);
            console.log('[Timeline] Parsed shape data:', shapeData);
            console.log('[Timeline] Calling onDropAsset with:', shapeData.id, trackId, time);
            onDropAsset(shapeData.id, trackId, time);
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

    return (
        <div className="flex flex-col h-full bg-[#09090b] text-xs select-none relative group">
            {/* Toolbar */}
            <div className="h-12 bg-[#09090b]/90 backdrop-blur-md border-t border-white/5 flex items-center justify-between px-4 z-40 relative">
                <div className="flex items-center gap-1 bg-[#18181b] p-1 rounded-lg border border-white/5">
                    <button onClick={onAddTrack} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-white/10 text-gray-400 hover:text-white transition-all text-[11px] font-medium"><Plus size={12} /> Track</button>
                    <div className="h-4 w-px bg-white/10 mx-1" />
                    <button onClick={onSplitClip} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-white/10 text-gray-400 hover:text-white transition-all text-[11px] font-medium" title="Split (S)"><Scissors size={12} /> Split</button>
                    <button onClick={onDeleteClip} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-all text-[11px] font-medium" title="Delete (Del)"><Trash2 size={12} /> Delete</button>
                </div>
                <div className="flex items-center gap-3 bg-[#18181b] p-1 rounded-lg border border-white/5">
                    <button onClick={() => onZoomChange(Math.max(10, zoom - 50))} className="p-1.5 hover:bg-white/10 rounded-md text-gray-400 hover:text-white transition"><ZoomOut size={12} /></button>
                    <input type="range" min="10" max="3000" step="10" value={zoom} onChange={(e) => onZoomChange(Number(e.target.value))} className="w-24 h-1 bg-[#27272a] rounded-lg appearance-none cursor-pointer accent-blue-500" />
                    <button onClick={() => onZoomChange(Math.min(3000, zoom + 50))} className="p-1.5 hover:bg-white/10 rounded-md text-gray-400 hover:text-white transition"><ZoomIn size={12} /></button>
                </div>
            </div>

            <div className="flex-1 flex flex-col overflow-hidden relative">
                <div className="flex-1 overflow-auto bg-[#09090b] relative scrollbar-thin" ref={timelineRef} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} onClick={handleTimelineClick}>
                    <div className="flex h-8 bg-[#09090b] min-w-max sticky top-0 z-30 border-b border-white/5">
                        <div className="w-[200px] border-r border-white/5 bg-[#09090b] z-40 sticky left-0 flex items-center justify-center">
                            <div className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">Tracks</div>
                        </div>
                        <div className="relative h-full cursor-pointer overflow-hidden pt-2" style={{ width: duration * zoom }} ref={rulerRef}>{renderRulerTicks()}</div>
                    </div>
                    <div className="relative min-w-max pb-8">
                        {zoom > 50 && <div className="absolute inset-0 pointer-events-none z-0" style={{ left: 200, width: duration * zoom, backgroundImage: 'linear-gradient(to right, #27272a 1px, transparent 1px)', backgroundSize: `${zoom}px 100%`, opacity: 0.1 }} />}

                        {tracks.map((track, index) => (
                            <div key={track.id} data-track-id={track.id} className={`flex h-24 border-b border-white/5 ${index % 2 === 0 ? 'bg-transparent' : 'bg-white/[0.02]'} relative group/track transition-colors hover:bg-white/[0.03]`}>
                                <div className="w-[200px] flex-shrink-0 bg-[#09090b] border-r border-white/5 p-3 flex flex-col justify-center gap-1 z-20 sticky left-0 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.5)]">
                                    <div className="flex items-center gap-3 text-gray-400 group-hover/track:text-gray-200 transition-colors">
                                        <div className="p-1.5 rounded-md bg-white/5">{getIcon(track.type)}</div>
                                        <span className="truncate text-xs font-medium tracking-wide">{track.name}</span>
                                    </div>
                                </div>
                                <div className="relative py-2" style={{ width: duration * zoom }}>
                                    {sortClipsForRender(clips.filter(c => c.trackId === track.id)).map(clip => (
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
                        <div className="absolute top-0 bottom-0 w-px bg-blue-500 pointer-events-none z-50 shadow-[0_0_8px_rgba(59,130,246,0.6)]" style={{ left: 200 + (currentTime * zoom) }}>
                            <div className="absolute -top-1 -left-1.5 w-3 h-3 bg-blue-500 transform rotate-45 shadow-sm rounded-[1px]" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Timeline;
