import React, { useState, useEffect, useRef } from 'react';
import { Image as ImageIcon, Music, Type, Shapes, Code, Sparkles, LayoutGrid, MonitorPlay, Clock, Wand2, Menu, ChevronDown, X, ScrollText } from 'lucide-react';

interface RibbonProps {
    onTogglePanel: (id: string) => void;
    onResetLayout: () => void;
    activePanels: string[];
}

export const Ribbon: React.FC<RibbonProps> = ({ onTogglePanel, onResetLayout, activePanels }) => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Use window width to determine layout mode to be absolutely sure of visibility
    const [width, setWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

    useEffect(() => {
        const handleResize = () => setWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const isMobile = width < 768; // < md
    const isDesktop = width >= 1280; // >= xl

    const tools = [
        { id: 'preview', icon: <MonitorPlay size={16} />, label: 'Preview', color: 'text-red-400' },
        { id: 'timeline', icon: <Clock size={16} />, label: 'Timeline', color: 'text-orange-400' },
        { id: 'media', icon: <ImageIcon size={16} />, label: 'Media', color: 'text-blue-400' },
        { id: 'audio', icon: <Music size={16} />, label: 'Audio', color: 'text-pink-400' },
        { id: 'text', icon: <Type size={16} />, label: 'Text', color: 'text-yellow-400' },
        { id: 'shapes', icon: <Shapes size={16} />, label: 'Shapes', color: 'text-orange-400' },
        { id: 'fx', icon: <Wand2 size={16} />, label: 'Effects', color: 'text-purple-400' },
        { id: 'code', icon: <Code size={16} />, label: 'Code', color: 'text-cyan-400' },
        { id: 'script', icon: <ScrollText size={16} />, label: 'Script', color: 'text-green-400' },
        { id: 'ai', icon: <Sparkles size={16} />, label: 'AI Gen', color: 'text-emerald-400' },
    ];

    if (isMobile) {
        return (
            <div className="relative z-50">
                <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium text-gray-200 bg-[#27272a] border border-white/10 shadow-sm hover:bg-[#3f3f46] transition-colors"
                >
                    <Menu size={14} />
                    Tools
                    <ChevronDown size={12} className={`transition-transform duration-200 ${isMobileMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {isMobileMenuOpen && (
                    <>
                        <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]" onClick={() => setIsMobileMenuOpen(false)} />
                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 bg-[#18181b] border border-[#27272a] rounded-lg shadow-xl z-50 p-1 flex flex-col gap-1 ring-1 ring-white/10 animate-in fade-in zoom-in-95 duration-100">
                            <div className="flex items-center justify-between px-2 py-1.5 border-b border-white/5 mb-1">
                                <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Editor Tools</span>
                                <button onClick={() => setIsMobileMenuOpen(false)} className="text-gray-500 hover:text-white"><X size={12} /></button>
                            </div>

                            {tools.map((tool) => (
                                <button
                                    key={tool.id}
                                    onClick={() => {
                                        onTogglePanel(tool.id);
                                        setIsMobileMenuOpen(false);
                                    }}
                                    className={`flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition-all w-full text-left ${activePanels.includes(tool.id)
                                        ? 'bg-[#3f3f46] text-white shadow-sm ring-1 ring-white/5'
                                        : 'text-gray-400 hover:text-white hover:bg-[#3f3f46]/50'
                                        }`}
                                >
                                    <span className={tool.color}>{tool.icon}</span>
                                    {tool.label}
                                </button>
                            ))}
                            <div className="h-px bg-white/10 my-1 mx-2" />
                            <button
                                onClick={() => { onResetLayout(); setIsMobileMenuOpen(false); }}
                                className="flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium text-gray-400 hover:text-white hover:bg-[#3f3f46]/50 w-full text-left"
                            >
                                <LayoutGrid size={16} />
                                Reset Layout
                            </button>
                        </div>
                    </>
                )}
            </div>
        );
    }

    return (
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 bg-[#27272a]/50 p-1 rounded-lg border border-white/5 no-scrollbar overflow-x-auto max-w-[50vw]">
                {tools.map((tool) => (
                    <button
                        key={tool.id}
                        onClick={() => onTogglePanel(tool.id)}
                        title={tool.label}
                        className={`flex-shrink-0 flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium transition-all ${activePanels.includes(tool.id)
                            ? 'bg-[#3f3f46] text-white shadow-sm ring-1 ring-white/10'
                            : 'text-gray-400 hover:text-white hover:bg-[#3f3f46]/50'
                            }`}
                    >
                        <span className={tool.color}>{React.cloneElement(tool.icon as React.ReactElement, { size: 16 })}</span>
                        {isDesktop && <span>{tool.label}</span>}
                    </button>
                ))}
            </div>

            <div className="h-4 w-px bg-white/10" />

            <button
                onClick={onResetLayout}
                className="flex flex-shrink-0 items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium text-gray-400 hover:text-white hover:bg-[#3f3f46] transition-all bg-[#27272a]/50 border border-white/5"
            >
                <LayoutGrid size={14} />
                {isDesktop && <span>Reset Layout</span>}
            </button>
        </div>
    );
};
