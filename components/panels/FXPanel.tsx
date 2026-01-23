import React, { useState, useRef, useEffect } from 'react';
import { AnimationType, EasingType, Effect } from '../../types';
import { Wand2, Plus, Move, Play, Code, Sparkles } from 'lucide-react';
import { validateTransitionCode, registerTransition, getTransition, getAllTransitions, subscribeToRegistry } from '../../transitions/registry';

interface FXPanelProps {
    onDragStart: (e: React.DragEvent, item: any, type: string) => void;
}

const FXPanel: React.FC<FXPanelProps> = ({ onDragStart }) => {
    // Get transitions from registry
    const [animationPresets, setAnimationPresets] = useState(() => {
        return getAllTransitions().map(t => ({
            type: t.id as AnimationType,
            name: t.name,
            icon: <Move size={16} />,
            duration: 1,
            easing: 'ease-out' as EasingType
        }));
    });

    useEffect(() => {
        const unsubscribe = subscribeToRegistry(() => {
            setAnimationPresets(getAllTransitions().map(t => ({
                type: t.id as AnimationType,
                name: t.name,
                icon: <Move size={16} />,
                duration: 1,
                easing: 'ease-out' as EasingType
            })));
        });
        return unsubscribe;
    }, []);

    const [filterPresets, setFilterPresets] = useState<Effect[]>([
        { id: 'fx_bw', name: 'Black & White', type: 'filter', value: 'grayscale(100%)', kind: 'grayscale', param: 100 },
        { id: 'fx_sepia', name: 'Sepia', type: 'filter', value: 'sepia(100%)', kind: 'sepia', param: 100 },
        { id: 'fx_blur', name: 'Blur', type: 'filter', value: 'blur(4px)', kind: 'blur', param: 10 },
        { id: 'fx_contrast', name: 'High Contrast', type: 'filter', value: 'contrast(150%) brightness(110%)', kind: 'contrast', param: 150 },
        { id: 'fx_vintage', name: 'Vintage', type: 'filter', value: 'sepia(50%) contrast(120%) saturate(80%)', kind: 'custom', param: 100 },
    ]);

    const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
    const [customName, setCustomName] = useState('');
    const [customCode, setCustomCode] = useState(`// Custom Transition...`); // (Shortened for brevity)

    // ... (Transition creation logic would go here - simplifying for now)

    return (
        <div className="h-full overflow-y-auto p-4 custom-scrollbar bg-[#18181b]">
            <div className="space-y-6">
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xs font-bold text-gray-400 uppercase flex items-center gap-2">
                            <Wand2 size={12} /> Transitions / Animations
                        </h3>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        {animationPresets.map((anim, idx) => (
                            <div
                                key={idx}
                                draggable
                                onDragStart={(e) => onDragStart(e, anim, 'animation')}
                                className="bg-[#27272a] hover:bg-[#3f3f46] p-2 rounded cursor-grab border border-[#3f3f46] flex flex-col items-center justify-center gap-1 transition text-gray-300 hover:text-white relative group"
                                title="Drag to clip"
                            >
                                {anim.icon}
                                <span className="text-[10px] truncate w-full text-center">{anim.name}</span>
                                {anim.duration && (
                                    <span className="absolute top-1 right-1 text-[8px] bg-black/50 px-1 rounded text-orange-300">
                                        {anim.duration}s
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase mb-3 flex items-center gap-2">
                        <Sparkles size={12} /> Filters
                    </h3>
                    <div className="space-y-2">
                        {filterPresets.map((effect) => (
                            <div
                                key={effect.id}
                                draggable
                                onDragStart={(e) => onDragStart(e, effect, 'effect')}
                                className="bg-[#27272a] hover:bg-[#3f3f46] p-3 rounded cursor-grab border border-[#3f3f46] flex items-center justify-between group transition"
                            >
                                <span className="text-sm text-gray-300 group-hover:text-white">{effect.name}</span>
                                <div
                                    className="w-4 h-4 rounded-full border border-white/20"
                                    style={{ filter: effect.value, background: 'linear-gradient(45deg, #ff0000, #0000ff)' }}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FXPanel;
