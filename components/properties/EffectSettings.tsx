import React, { useState, useEffect, useRef } from 'react';
import { Clip, Effect, MediaType, EffectDefinition } from '../../models';
import { Wand2, X, Plus, Play, Code } from 'lucide-react';
import { getAllEffects, getEffect } from '../../effects/registry';

interface EffectSettingsProps {
    clip: Clip;
    onUpdate: (updates: Partial<Clip>) => void;
}

export const EffectSettings: React.FC<EffectSettingsProps> = ({ clip, onUpdate }) => {
    const safeEffects = clip.effects || [];
    const availableEffects = getAllEffects();
    const [showAddMenu, setShowAddMenu] = useState(false);

    // Demo / Preview Logic - Moved to top level to avoid hook violation
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isPlayingDemo, setIsPlayingDemo] = useState(false);
    const demoReqRef = useRef<number>();

    useEffect(() => {
        if (!isPlayingDemo) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let startTime = performance.now();

        const loop = (time: number) => {
            // Clear
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw Base Content (Colorful Rects)
            ctx.fillStyle = '#ef4444'; ctx.fillRect(10, 10, 50, 50);
            ctx.fillStyle = '#22c55e'; ctx.fillRect(70, 10, 50, 50);
            ctx.fillStyle = '#3b82f6'; ctx.fillRect(130, 10, 50, 50);
            ctx.fillStyle = '#eab308'; ctx.fillRect(190, 10, 50, 50);

            ctx.fillStyle = '#fff';
            ctx.font = '12px Arial';
            ctx.fillText("Original", 10, 80);

            // Apply Effects
            // We apply ALL effects in the list to the demo
            const filters: string[] = [];

            safeEffects.forEach(e => {
                const def = getEffect(e.kind || e.name.toLowerCase());
                if (def) {
                    const res = def.apply({
                        ctx,
                        width: canvas.width,
                        height: canvas.height,
                        params: e.effectParams || {}
                    });
                    if (res.filter) filters.push(res.filter);
                }
            });

            if (filters.length > 0) {
                ctx.filter = filters.join(' ');
                // Draw "Effected" Content below
                ctx.save();
                ctx.translate(0, 80);
                ctx.fillStyle = '#ef4444'; ctx.fillRect(10, 10, 50, 50);
                ctx.fillStyle = '#22c55e'; ctx.fillRect(70, 10, 50, 50);
                ctx.fillStyle = '#3b82f6'; ctx.fillRect(130, 10, 50, 50);
                ctx.fillStyle = '#eab308'; ctx.fillRect(190, 10, 50, 50);
                ctx.fillStyle = '#fff'; ctx.fillText("With Effects", 10, 80);
                ctx.restore();
                ctx.filter = 'none';
            } else {
                ctx.fillStyle = '#666';
                ctx.fillText("No Effects Active", 10, 140);
            }

            demoReqRef.current = requestAnimationFrame(loop);
        };

        demoReqRef.current = requestAnimationFrame(loop);

        return () => {
            if (demoReqRef.current) cancelAnimationFrame(demoReqRef.current);
        };
    }, [isPlayingDemo, safeEffects]);

    // Simplified UI for standalone EFFECT clips
    if (clip.type === MediaType.EFFECT && safeEffects.length > 0) {
        const effect = safeEffects[0]; // Effect clips have one effect
        const def = getEffect(effect.kind || effect.name.toLowerCase());

        return (
            <div className="space-y-3">
                <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider flex items-center gap-2">
                    <Wand2 size={12} /> Effect
                </label>

                <div className="p-3 rounded border bg-[#27272a] border-pink-500/30">
                    <div className="space-y-3">
                        {/* Effect Type (Read-only) */}
                        <div className="space-y-1">
                            <label className="text-[10px] text-gray-400">Type</label>
                            <div className="w-full bg-[#09090b] border border-[#3f3f46] rounded px-3 py-2 text-xs text-gray-400 flex items-center gap-2">
                                <Wand2 size={12} className="text-pink-400" />
                                <span>{effect.name}</span>
                            </div>
                        </div>

                        {/* Effect Parameters */}
                        {def && def.variables.map(v => (
                            <div key={v.key} className="space-y-1">
                                <label className="text-[10px] text-gray-400 block">{v.name}</label>
                                {v.type === 'number' ? (
                                    <div className="space-y-1">
                                        <input
                                            type="range"
                                            min={v.min} max={v.max} step={v.step}
                                            value={effect.effectParams?.[v.key] ?? v.defaultValue}
                                            onChange={(e) => {
                                                const newEffects = [...safeEffects];
                                                const currentParams = newEffects[0].effectParams || {};
                                                newEffects[0] = {
                                                    ...newEffects[0],
                                                    effectParams: { ...currentParams, [v.key]: parseFloat(e.target.value) }
                                                };
                                                onUpdate({ effects: newEffects });
                                            }}
                                            className="w-full h-1.5 bg-[#3f3f46] rounded-lg appearance-none cursor-pointer accent-pink-500"
                                        />
                                        <div className="text-[9px] text-gray-500 text-center">{effect.effectParams?.[v.key] ?? v.defaultValue}</div>
                                    </div>
                                ) : v.type === 'boolean' ? (
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={effect.effectParams?.[v.key] ?? v.defaultValue}
                                            onChange={(e) => {
                                                const newEffects = [...safeEffects];
                                                const currentParams = newEffects[0].effectParams || {};
                                                newEffects[0] = {
                                                    ...newEffects[0],
                                                    effectParams: { ...currentParams, [v.key]: e.target.checked }
                                                };
                                                onUpdate({ effects: newEffects });
                                            }}
                                            className="h-3 w-3 rounded border-gray-600 text-pink-500 focus:ring-pink-500 bg-[#3f3f46]"
                                        />
                                        <span className="text-[10px] text-gray-400">{v.name}</span>
                                    </div>
                                ) : v.type === 'select' ? (
                                    <select
                                        value={effect.effectParams?.[v.key] ?? v.defaultValue}
                                        onChange={(e) => {
                                            const newEffects = [...safeEffects];
                                            const currentParams = newEffects[0].effectParams || {};
                                            newEffects[0] = {
                                                ...newEffects[0],
                                                effectParams: { ...currentParams, [v.key]: e.target.value }
                                            };
                                            onUpdate({ effects: newEffects });
                                        }}
                                        className="w-full bg-[#09090b] border border-[#3f3f46] rounded px-2 py-1 text-xs text-gray-300 outline-none focus:border-pink-500"
                                    >
                                        {v.options?.map(opt => (
                                            <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                    </select>
                                ) : null}
                            </div>
                        ))}

                        <div className="text-[9px] text-gray-500 italic pt-2 border-t border-[#3f3f46]/30">
                            Effect clips have a single effect. For multiple effects, use media clips (images/videos).
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Helper to update params for a specific effect instance
    const updateEffectParam = (index: number, key: string, value: any) => {
        const newEffects = [...safeEffects];
        const currentParams = newEffects[index].effectParams || {};
        newEffects[index] = {
            ...newEffects[index],
            effectParams: { ...currentParams, [key]: value }
        };
        onUpdate({ effects: newEffects });
    };

    const removeEffect = (index: number) => {
        const newEffects = safeEffects.filter((_, i) => i !== index);
        onUpdate({ effects: newEffects });
    };

    const addEffect = (effectDef: EffectDefinition) => {
        const newEffect: Effect = {
            id: crypto.randomUUID(),
            name: effectDef.name,
            type: 'filter',
            value: '', // Legacy support, will be ignored by new renderer if effectParams exist
            kind: effectDef.id,
            effectParams: {}
        };

        // Initialize defaults
        effectDef.variables.forEach(v => {
            newEffect.effectParams![v.key] = v.defaultValue;
        });

        onUpdate({ effects: [...safeEffects, newEffect] });
        setShowAddMenu(false);
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider flex items-center gap-2">Visual Effects<span className="h-px bg-[#3f3f46] flex-1"></span></label>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setIsPlayingDemo(!isPlayingDemo)}
                        className={`p - 1 rounded ${isPlayingDemo ? 'bg-blue-600 text-white' : 'bg-[#27272a] text-gray-400 hover:text-white'} `}
                        title="Preview Effects"
                    >
                        <Play size={12} fill={isPlayingDemo ? "currentColor" : "none"} />
                    </button>
                    <button
                        onClick={() => setShowAddMenu(!showAddMenu)}
                        className="p-1 bg-[#27272a] text-gray-400 hover:text-white rounded"
                        title="Add Effect"
                    >
                        <Plus size={12} />
                    </button>
                </div>
            </div>

            {showAddMenu && (
                <div className="bg-[#18181b] border border-[#3f3f46] rounded p-2 grid grid-cols-2 gap-2 mb-2">
                    {availableEffects.map(e => (
                        <button
                            key={e.id}
                            onClick={() => addEffect(e)}
                            className="text-xs text-left px-2 py-1.5 hover:bg-[#27272a] rounded text-gray-300"
                        >
                            {e.name}
                        </button>
                    ))}
                </div>
            )}

            {isPlayingDemo && (
                <div className="w-full h-40 bg-black rounded border border-[#3f3f46] mb-2 overflow-hidden relative">
                    <canvas ref={canvasRef} width={300} height={200} className="w-full h-full object-contain" />
                    <div className="absolute bottom-1 right-1 text-[9px] text-gray-500">Preview</div>
                </div>
            )}

            {safeEffects.length === 0 && !showAddMenu && (
                <div className="p-3 bg-[#18181b] border border-[#27272a] rounded text-center">
                    <p className="text-[10px] text-gray-600 italic">No effects applied.</p>
                </div>
            )}

            {safeEffects.map((effect, index) => {
                const def = getEffect(effect.kind || effect.name.toLowerCase());
                return (
                    <div key={effect.id || index} className="bg-[#27272a] p-3 rounded border border-[#3f3f46] shadow-sm relative group space-y-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2"><Wand2 size={12} className="text-pink-400" /><span className="text-xs font-semibold text-white">{effect.name}</span></div>
                            <button onClick={() => removeEffect(index)} className="text-gray-500 hover:text-red-400 transition"><X size={12} /></button>
                        </div>

                        {def ? (
                            <div className="space-y-2">
                                {def.variables.map(v => (
                                    <div key={v.key} className="space-y-1">
                                        <label className="text-[10px] text-gray-400 block">{v.name}</label>
                                        {v.type === 'number' ? (
                                            <input
                                                type="range"
                                                min={v.min} max={v.max} step={v.step}
                                                value={effect.effectParams?.[v.key] ?? v.defaultValue}
                                                onChange={(e) => updateEffectParam(index, v.key, parseFloat(e.target.value))}
                                                className="w-full h-1.5 bg-[#3f3f46] rounded-lg appearance-none cursor-pointer accent-pink-500"
                                            />
                                        ) : v.type === 'select' && v.key === 'code' ? (
                                            <textarea
                                                value={effect.effectParams?.[v.key] ?? v.defaultValue}
                                                onChange={(e) => updateEffectParam(index, v.key, e.target.value)}
                                                className="w-full h-24 bg-[#09090b] border border-[#3f3f46] rounded p-2 text-[10px] font-mono text-pink-400 focus:outline-none resize-none"
                                                spellCheck={false}
                                            />
                                        ) : v.type === 'boolean' ? (
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    checked={effect.effectParams?.[v.key] ?? v.defaultValue}
                                                    onChange={(e) => updateEffectParam(index, v.key, e.target.checked)}
                                                    className="h-3 w-3 rounded border-gray-600 text-pink-500 focus:ring-pink-500 bg-[#3f3f46]"
                                                />
                                                <span className="text-[10px] text-gray-400">Enabled</span>
                                            </div>
                                        ) : v.type === 'select' ? (
                                            <select
                                                value={effect.effectParams?.[v.key] ?? v.defaultValue}
                                                onChange={(e) => updateEffectParam(index, v.key, e.target.value)}
                                                className="w-full bg-[#09090b] border border-[#3f3f46] rounded px-2 py-1 text-xs text-gray-300 outline-none focus:border-pink-500"
                                            >
                                                {v.options?.map(opt => (
                                                    <option key={opt} value={opt}>{opt}</option>
                                                ))}
                                            </select>
                                        ) : null}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-[10px] text-red-400">Unknown Effect Type</div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};
