import React, { useEffect, useRef } from 'react';
import { Group, Ungroup, Trash2, SplitSquareHorizontal } from 'lucide-react';

interface TimelineContextMenuProps {
    x: number;
    y: number;
    onClose: () => void;
    onGroup: () => void;
    onUngroup: () => void;
    onDelete: () => void;
    onSplit: () => void;
    canGroup: boolean;
    canUngroup: boolean;
}

export const TimelineContextMenu: React.FC<TimelineContextMenuProps> = ({
    x,
    y,
    onClose,
    onGroup,
    onUngroup,
    onDelete,
    onSplit,
    canGroup,
    canUngroup
}) => {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        const handleScroll = () => onClose();

        // Delay attaching the listener to prevent immediate closure from the right-click event
        const timeoutId = setTimeout(() => {
            document.addEventListener('click', handleClickOutside);
            document.addEventListener('contextmenu', handleClickOutside);
            document.addEventListener('scroll', handleScroll, true);
        }, 0);

        return () => {
            clearTimeout(timeoutId);
            document.removeEventListener('click', handleClickOutside);
            document.removeEventListener('contextmenu', handleClickOutside);
            document.removeEventListener('scroll', handleScroll, true);
        };
    }, [onClose]);

    return (
        <div
            ref={menuRef}
            className="fixed z-[100] min-w-[180px] bg-[#1a1f2e] border border-white/10 rounded-lg shadow-xl py-1 animate-in fade-in zoom-in-95 duration-100"
            style={{ left: x, top: y }}
            onContextMenu={(e) => e.preventDefault()}
        >
            <div className="px-1 space-y-0.5">
                <button
                    onClick={() => { onGroup(); onClose(); }}
                    disabled={!canGroup}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 text-xs text-left rounded-md transition-colors ${canGroup
                        ? 'text-gray-200 hover:bg-white/10'
                        : 'text-gray-500 cursor-not-allowed'
                        }`}
                >
                    <Group size={14} />
                    <span>Group Clips</span>
                    <span className="ml-auto text-[10px] text-gray-500">Ctrl+G</span>
                </button>

                <button
                    onClick={() => { onUngroup(); onClose(); }}
                    disabled={!canUngroup}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 text-xs text-left rounded-md transition-colors ${canUngroup
                        ? 'text-gray-200 hover:bg-white/10'
                        : 'text-gray-500 cursor-not-allowed'
                        }`}
                >
                    <Ungroup size={14} />
                    <span>Ungroup Clips</span>
                    <span className="ml-auto text-[10px] text-gray-500">Ctrl+U</span>
                </button>
            </div>

            <div className="my-1 border-t border-white/10" />

            <div className="px-1 space-y-0.5">
                <button
                    onClick={() => { onSplit(); onClose(); }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-left rounded-md text-gray-200 hover:bg-white/10 transition-colors"
                >
                    <SplitSquareHorizontal size={14} />
                    <span>Split</span>
                    <span className="ml-auto text-[10px] text-gray-500">S</span>
                </button>

                <button
                    onClick={() => { onDelete(); onClose(); }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-left rounded-md text-red-400 hover:bg-red-500/10 transition-colors"
                >
                    <Trash2 size={14} />
                    <span>Delete</span>
                    <span className="ml-auto text-[10px] text-gray-500">Del</span>
                </button>
            </div>
        </div>
    );
};
