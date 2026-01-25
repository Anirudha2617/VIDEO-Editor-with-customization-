import React from 'react';
import { Clip, MediaType } from '../../types';
import {
    Film,
    Image as ImageIcon,
    Music,
    Type,
    Sparkles,
    Wand2,
    Move,
    ArrowRight,
    ArrowLeft,
    GripVertical
} from 'lucide-react';

interface TimelineClipProps {
    clip: Clip;
    isSelected: boolean;
    isMultiSelected: boolean;
    zoom: number;
    onPointerDown: (e: React.PointerEvent, clip: Clip) => void;
    onClick: (e: React.MouseEvent, clipId: string) => void;
    onResizeStart: (e: React.PointerEvent, clip: Clip) => void;
    onContextMenu?: (e: React.MouseEvent, clip: Clip) => void;
}

const TimelineClipComponent: React.FC<TimelineClipProps> = ({
    clip,
    isSelected,
    isMultiSelected,
    zoom,
    onPointerDown,
    onClick,
    onResizeStart,
    onContextMenu
}) => {
    const getBaseClasses = () => {
        if (clip.type === MediaType.EFFECT)
            return `z-30 bg-pink-900/30 border-pink-500/50 ${isSelected ? 'ring-2 ring-white' : 'hover:ring-1 hover:ring-white/50'}`;
        if (clip.type === MediaType.ANIMATION)
            return `z-30 bg-orange-900/30 border-orange-500/50 ${isSelected ? 'ring-2 ring-white' : 'hover:ring-1 hover:ring-white/50'}`;

        let colors = 'bg-gray-700 border-gray-600 z-10';
        switch (clip.type) {
            case MediaType.VIDEO:
                colors = 'bg-blue-900 border-blue-600 z-10';
                break;
            case MediaType.IMAGE:
                colors = 'bg-purple-900 border-purple-600 z-10';
                break;
            case MediaType.AUDIO:
                colors = 'bg-green-900 border-green-600 z-10';
                break;
            case MediaType.TEXT:
                colors = 'bg-yellow-900 border-yellow-600 z-20';
                break;
            case MediaType.SHAPE:
                colors = 'bg-cyan-900 border-cyan-600 z-20';
                break;
        }
        return `${colors} ${isSelected ? 'ring-2 ring-white' : 'hover:ring-1 hover:ring-white/50'}`;
    };

    const renderContent = () => {
        if (clip.type === MediaType.EFFECT) {
            return (
                <div className="absolute inset-0 flex items-center px-2 overflow-hidden bg-pink-500/40 backdrop-blur-[1px]">
                    <div
                        className="absolute inset-0 opacity-30"
                        style={{
                            backgroundImage:
                                'repeating-linear-gradient(45deg, #ec4899 0, #ec4899 2px, transparent 2px, transparent 6px)'
                        }}
                    />
                    <span className="text-[10px] font-bold text-white drop-shadow-md truncate font-mono z-10 flex items-center gap-1">
                        <Sparkles size={10} />{' '}
                        {clip.effects?.length > 0
                            ? clip.effects.length > 1
                                ? `${clip.effects.length} FX`
                                : clip.effects[0].name
                            : clip.name}
                    </span>
                </div>
            );
        }
        if (clip.type === MediaType.ANIMATION) {
            return (
                <div className="absolute inset-0 flex items-center px-2 overflow-hidden bg-orange-500/40 backdrop-blur-[1px]">
                    <div
                        className="absolute inset-0 opacity-30"
                        style={{
                            backgroundImage:
                                'repeating-linear-gradient(45deg, #f97316 0, #f97316 2px, transparent 2px, transparent 6px)'
                        }}
                    />
                    <span className="text-[10px] font-bold text-white drop-shadow-md truncate font-mono z-10 flex items-center gap-1">
                        <Move size={10} /> {clip.animationType || clip.name}
                    </span>
                </div>
            );
        }
        if (clip.type === MediaType.IMAGE) {
            return (
                <div
                    className="absolute inset-0 w-full h-full opacity-60"
                    style={{
                        backgroundImage: `url(${clip.src})`,
                        backgroundSize: 'auto 100%',
                        backgroundRepeat: 'repeat-x',
                        backgroundPosition: 'left center'
                    }}
                />
            );
        }
        if (clip.type === MediaType.VIDEO) {
            return (
                <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden">
                    <div
                        className="absolute top-0 left-0 right-0 h-1.5 bg-repeat-x"
                        style={{
                            backgroundImage:
                                'radial-gradient(circle, #000000 1px, transparent 1.5px)',
                            backgroundSize: '8px 100%'
                        }}
                    />
                    <div
                        className="absolute bottom-0 left-0 right-0 h-1.5 bg-repeat-x"
                        style={{
                            backgroundImage:
                                'radial-gradient(circle, #000000 1px, transparent 1.5px)',
                            backgroundSize: '8px 100%'
                        }}
                    />
                    <div className="w-full h-full bg-blue-500/10 flex items-center justify-center" />
                </div>
            );
        }
        if (clip.type === MediaType.TEXT) {
            return (
                <div className="absolute inset-0 flex items-center px-2 overflow-hidden">
                    <span className="text-[10px] font-bold text-yellow-100/80 truncate font-mono">
                        {clip.text || clip.name}
                    </span>
                </div>
            );
        }
        if (clip.type === MediaType.AUDIO) {
            if (clip.waveform) {
                return (
                    <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
                        <img
                            src={clip.waveform}
                            alt="waveform"
                            className="w-full h-full object-cover opacity-70"
                            style={{ objectFit: 'fill' }}
                        />
                        <div className="absolute inset-0 bg-green-900/20" />
                    </div>
                );
            }
            return (
                <div
                    className="absolute inset-0 flex items-center opacity-40"
                    style={{
                        backgroundImage:
                            'linear-gradient(90deg, transparent 50%, #ffffff 50%)',
                        backgroundSize: '4px 100%'
                    }}
                />
            );
        }
        return null;
    };

    const isGrouped = Boolean(clip.groupId);

    return (
        <div
            onPointerDown={(e) => onPointerDown(e, clip)}
            onClick={(e) => onClick(e, clip.id)}
            onContextMenu={(e) => onContextMenu && onContextMenu(e, clip)}
            className={`absolute overflow-hidden cursor-pointer group flex flex-col select-none timeline-clip 
                ${isSelected ? 'selected' : ''} 
                ${isMultiSelected ? 'multi-selected' : ''} 
                ${isGrouped ? 'grouped' : ''} 
                ${getBaseClasses()}`}
            style={{
                left: clip.start * zoom,
                width: Math.max(clip.duration * zoom, 2)
            }}
        >
            {isGrouped && (
                <div className="timeline-group-badge">G</div>
            )}

            {renderContent()}

            {/* Badges */}
            {clip.type !== MediaType.EFFECT && clip.type !== MediaType.ANIMATION && (
                <div className="absolute top-0 right-0 flex gap-0.5 z-20">
                    {clip.animationIn && clip.animationIn !== 'none' && (
                        <div className="p-0.5 bg-green-500/80 rounded-bl-sm">
                            <ArrowRight size={8} className="text-black" />
                        </div>
                    )}
                    {clip.animationOut && clip.animationOut !== 'none' && (
                        <div className="p-0.5 bg-red-500/80 rounded-bl-sm">
                            <ArrowLeft size={8} className="text-black" />
                        </div>
                    )}
                    {clip.effects && clip.effects.length > 0 && (
                        <div className="p-0.5 bg-pink-500/80 rounded-bl-sm">
                            <Sparkles size={8} className="text-black" />
                        </div>
                    )}
                </div>
            )}

            <div className="relative flex-1 px-2 py-1 flex items-center min-w-0 z-10">
                <GripVertical
                    size={12}
                    className="text-white/40 mr-1 flex-shrink-0 drop-shadow-md"
                />
                <span className="truncate text-white text-[10px] font-medium drop-shadow-md select-none">
                    {clip.name}
                </span>
            </div>

            {isSelected && (
                <div
                    className="absolute right-0 top-0 bottom-0 w-4 cursor-ew-resize hover:bg-white/30 flex items-center justify-center z-30 transition-colors resizer-h"
                    onPointerDown={(e) => {
                        e.stopPropagation();
                        onResizeStart(e, clip);
                    }}
                >
                    <div className="w-1.5 h-5 bg-white rounded-full shadow-lg" />
                </div>
            )}
        </div>
    );
};

export const TimelineClip = React.memo(TimelineClipComponent);
