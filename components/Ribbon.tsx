import React from 'react';
import { Image as ImageIcon, Music, Type, Shapes, Code, Sparkles, LayoutGrid, MonitorPlay, Clock, Wand2 } from 'lucide-react';

interface RibbonProps {
    onTogglePanel: (id: string) => void;
    onResetLayout: () => void;
    activePanels: string[];
}

export const Ribbon: React.FC<RibbonProps> = ({ onTogglePanel, onResetLayout, activePanels }) => {
    const tools = [
        { id: 'preview', icon: <MonitorPlay size={18} />, label: 'Preview', color: 'text-red-400' },
        { id: 'timeline', icon: <Clock size={18} />, label: 'Timeline', color: 'text-orange-400' },
        { id: 'media', icon: <ImageIcon size={18} />, label: 'Media', color: 'text-blue-400' },
        { id: 'audio', icon: <Music size={18} />, label: 'Audio', color: 'text-pink-400' },
        { id: 'text', icon: <Type size={18} />, label: 'Text', color: 'text-yellow-400' },
        { id: 'shapes', icon: <Shapes size={18} />, label: 'Shapes', color: 'text-orange-400' },
        { id: 'fx', icon: <Wand2 size={18} />, label: 'Effects', color: 'text-purple-400' },
        { id: 'code', icon: <Code size={18} />, label: 'Code', color: 'text-cyan-400' },
        { id: 'ai', icon: <Sparkles size={18} />, label: 'AI Gen', color: 'text-emerald-400' },
    ];

    return (
        <div className="h-12 bg-[#18181b] border-b border-[#27272a] flex items-center px-4 gap-2 shadow-lg z-40 relative">
            <div className="flex items-center gap-1 bg-[#27272a] p-1 rounded-lg border border-[#3f3f46]">
                {tools.map((tool) => (
                    <button
                        key={tool.id}
                        onClick={() => onTogglePanel(tool.id)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${activePanels.includes(tool.id)
                            ? 'bg-[#3f3f46] text-white shadow-sm'
                            : 'text-gray-400 hover:text-white hover:bg-[#3f3f46]/50'
                            }`}
                    >
                        <span className={tool.color}>{tool.icon}</span>
                        {tool.label}
                    </button>
                ))}
            </div>

            <div className="h-6 w-px bg-[#3f3f46] mx-2" />

            <button
                onClick={onResetLayout}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium text-gray-400 hover:text-white hover:bg-[#3f3f46] transition-all bg-[#27272a] border border-[#3f3f46]"
            >
                <LayoutGrid size={16} />
                Reset View
            </button>
        </div>
    );
};
