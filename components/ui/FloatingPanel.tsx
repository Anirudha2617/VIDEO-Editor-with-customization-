import React from 'react';
import { Rnd } from 'react-rnd';
import { X, GripHorizontal, PanelLeft, PanelRight, Minimize2, ArrowDown, ArrowUp, LayoutTemplate } from 'lucide-react';

interface FloatingPanelProps {
    id: string;
    title: string;
    isOpen: boolean;
    position: { x: number; y: number };
    size: { width: string | number; height: string | number };
    zIndex: number;
    isDocked?: boolean;
    dockSide?: 'left' | 'right' | 'top' | 'bottom' | 'center';
    onClose: () => void;
    onUpdate: (id: string, data: any) => void;
    onFocus: () => void;
    onDock: (id: string, side: 'left' | 'right' | 'bottom' | 'top' | 'center') => void;
    onUndock: (id: string) => void;
    children: React.ReactNode;
}

export const FloatingPanel: React.FC<FloatingPanelProps> = ({
    id,
    title,
    isOpen,
    position,
    size,
    zIndex,
    isDocked,
    dockSide,
    onClose,
    onUpdate,
    onFocus,
    onDock,
    onUndock,
    children
}) => {
    if (!isOpen) return null;

    // Render docked version (static flex child)
    if (isDocked) {
        return (
            <div
                className="flex flex-col h-full w-full bg-transparent overflow-hidden"
            >
                {/* Simple Header for Docked State */}
                <div className="h-9 flex items-center justify-between px-3 border-b border-white/5 shrink-0">
                    <span className="text-xs font-semibold text-gray-200">{title}</span>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => onUndock(id)}
                            className="text-gray-500 hover:text-white hover:bg-white/5 p-1 rounded transition-colors"
                            title="Undock to Floating Window"
                        >
                            <Minimize2 size={12} />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onClose(); }}
                            className="text-gray-500 hover:text-white hover:bg-red-500/20 p-1 rounded transition-colors"
                        >
                            <X size={12} />
                        </button>
                    </div>
                </div>
                <div className="flex-1 overflow-hidden relative">
                    {children}
                </div>
            </div>
        );
    }

    // Render floating version (draggable Rnd)
    return (
        <Rnd
            size={{ width: size.width, height: size.height }}
            position={{ x: position.x, y: position.y }}
            onDragStop={(e, d) => {
                onUpdate(id, { position: { x: d.x, y: d.y } });
            }}
            onResizeStop={(e, direction, ref, delta, position) => {
                onUpdate(id, {
                    size: { width: ref.style.width, height: ref.style.height },
                    position: position,
                });
            }}
            onMouseDown={onFocus}
            className={`flex flex-col bg-[#18181b] border border-[#27272a] rounded-lg shadow-xl overflow-hidden`}
            style={{ zIndex, display: 'flex' }}
            dragHandleClassName="panel-drag-handle"
            enableUserSelectHack={false}
            bounds="window"
            minWidth={200}
            minHeight={150}
            enableResizing={true}
        >
            {/* Header */}
            <div className="panel-drag-handle h-9 flex items-center justify-between px-3 bg-[#18181b] border-b border-[#27272a] cursor-grab active:cursor-grabbing select-none shrink-0 group">
                <div className="flex items-center gap-2">
                    <GripHorizontal size={14} className="text-gray-500 group-hover:text-gray-300 transition-colors" />
                    <span className="text-xs font-semibold text-gray-200">{title}</span>
                </div>
                <div className="flex items-center gap-1">
                    {/* Docking Controls */}
                    <button
                        onClick={() => onDock(id, 'left')}
                        className="text-gray-500 hover:text-white hover:bg-[#3f3f46] p-1 rounded transition-colors"
                        title="Dock Left"
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        <PanelLeft size={12} />
                    </button>
                    <button
                        onClick={() => onDock(id, 'right')}
                        className="text-gray-500 hover:text-white hover:bg-[#3f3f46] p-1 rounded transition-colors"
                        title="Dock Right"
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        <PanelRight size={12} />
                    </button>
                    <button
                        onClick={() => onDock(id, 'top')}
                        className="text-gray-500 hover:text-white hover:bg-[#3f3f46] p-1 rounded transition-colors"
                        title="Dock Top"
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        <ArrowUp size={12} />
                    </button>
                    <button
                        onClick={() => onDock(id, 'bottom')}
                        className="text-gray-500 hover:text-white hover:bg-[#3f3f46] p-1 rounded transition-colors"
                        title="Dock Bottom"
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        <ArrowDown size={12} />
                    </button>
                    <button
                        onClick={() => onDock(id, 'center')}
                        className="text-gray-500 hover:text-white hover:bg-[#3f3f46] p-1 rounded transition-colors"
                        title="Dock Center"
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        <LayoutTemplate size={12} />
                    </button>
                    <div className="w-px h-3 bg-[#3f3f46] mx-1" />
                    <button
                        onClick={(e) => { e.stopPropagation(); onClose(); }}
                        className="text-gray-500 hover:text-white hover:bg-red-500/20 p-1 rounded transition-colors"
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        <X size={14} />
                    </button>
                </div>
            </div>

            {/* Content */}            {/* Let the childrens have their own properties */}
            <div
                className="flex-1 overflow-hidden relative min-h-0"
                onMouseDown={(e) => e.stopPropagation()}
            >
                {children}
            </div>
        </Rnd>
    );
};
