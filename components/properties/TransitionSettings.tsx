import React, { useState, useEffect, useRef } from 'react';
import { Clip, AnimationType, EasingType, MediaType } from '../../types';
import { Move, Clock, ArrowRightFromLine, ArrowLeftFromLine, Play, Code } from 'lucide-react';
import { getAllTransitions, getTransition, subscribeToRegistry } from '../../transitions/registry';
// import { renderFrame } from '../../engines/render/CanvasRenderer';

interface TransitionSettingsProps {
    clip: Clip;
    allClips?: Clip[];
    onUpdate: (updates: Partial<Clip>) => void;
    onSeek: (time: number) => void;
}

export const TransitionSettings: React.FC<TransitionSettingsProps> = ({ clip, allClips = [], onUpdate, onSeek }) => {
    const focusStart = () => onSeek(clip.start);
    const focusEnd = () => onSeek(clip.start + clip.duration - Math.min(clip.duration, (clip.animationOutDuration || 1)));

    // Subscribe to registry updates
    const [transitions, setTransitions] = useState(getAllTransitions());
    useEffect(() => {
        return subscribeToRegistry(() => {
            setTransitions(getAllTransitions());
        });
    }, []);

    // Helper to find overlapping clips
    const getOverlappingClips = () => {
        return allClips.filter(c =>
            c.id !== clip.id && // Not self
            c.type !== MediaType.AUDIO && // No audio
            c.start < (clip.start + clip.duration) && // Overlaps in time
            (c.start + c.duration) > clip.start
        );
    };

    // Demo / Preview Logic Hooks (Must be before early return)
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
        const duration = 3000; // 3s loop: 1s In, 1s Hold, 1s Out

        const loop = (time: number) => {
            const elapsed = (time - startTime) % duration;

            // Clear
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw Background (Clip A)
            ctx.fillStyle = '#333';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#fff';
            ctx.font = '20px Arial';
            ctx.fillText("A", 10, 30);

            // Determine Phase
            // 0-1s: In Transition (B entering)
            // 1-2s: Hold (B fully visible)
            // 2-3s: Out Transition (B exiting)

            let progress = 0;
            let isExit = false;
            let activeAnim = 'none';
            let params = {};

            if (elapsed < 1000) {
                // IN Phase
                activeAnim = clip.animationIn || 'none';
                progress = elapsed / 1000;
                params = clip.transitionInParams || {};
                isExit = false;
            } else if (elapsed < 2000) {
                // HOLD Phase
                activeAnim = 'none'; // No transition, just show B
                progress = 1;
                isExit = false;
            } else {
                // OUT Phase
                activeAnim = clip.animationOut || 'none';
                progress = (elapsed - 2000) / 1000; // 0 to 1
                params = clip.transitionOutParams || {};
                isExit = true;
            }

            // Draw B (The Clip)
            ctx.save();

            if (activeAnim !== 'none') {
                const t = getTransition(activeAnim);
                if (t) {
                    const ctxParams = {
                        ctx,
                        width: canvas.width,
                        height: canvas.height,
                        progress,
                        isExit,
                        params
                    };
                    const res = t.apply(ctxParams);

                    // Apply transforms
                    if (res.offsetX) ctx.translate(res.offsetX, 0);
                    if (res.offsetY) ctx.translate(0, res.offsetY);
                    if (res.scale) {
                        ctx.translate(canvas.width / 2, canvas.height / 2);
                        ctx.scale(res.scale, res.scale);
                        ctx.translate(-canvas.width / 2, -canvas.height / 2);
                    }
                    ctx.globalAlpha = res.opacity ?? 1;

                    // Overlay
                    if (res.overlayColor) {
                        // We apply overlay later
                    }

                    if (res.customDraw) {
                        ctx.save();
                        ctx.setTransform(1, 0, 0, 1, 0, 0);
                        try {
                            res.customDraw(ctx, canvas.width, canvas.height);
                        } catch (e) {
                            console.error("Preview customDraw error:", e);
                        }
                        ctx.restore();
                    }
                }
            } else if (elapsed < 2000) {
                // Hold phase or no transition - fully visible
                ctx.globalAlpha = 1;
            } else {
                // Out phase but no transition - fully visible
                ctx.globalAlpha = 1;
            }

            // Draw B Content
            ctx.fillStyle = '#4f46e5'; // Blue
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#fff';
            ctx.fillText("B", 10, 30);

            ctx.restore();

            demoReqRef.current = requestAnimationFrame(loop);
        };

        demoReqRef.current = requestAnimationFrame(loop);

        return () => {
            if (demoReqRef.current) cancelAnimationFrame(demoReqRef.current);
        };
    }, [isPlayingDemo, clip]);

    // Simplified UI for ANIMATION clips
    if (clip.type === MediaType.ANIMATION) {
        return (
            <div className="space-y-3">
                <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider flex items-center gap-2">
                    <Move size={12} /> Animation
                </label>

                <div className="p-3 rounded border bg-[#27272a] border-orange-500/30">
                    <div className="space-y-3">
                        {/* Animation Type (Read-only - set from FX panel) */}
                        <div className="space-y-1">
                            <label className="text-[10px] text-gray-400">Type</label>
                            <div className="w-full bg-[#09090b] border border-[#3f3f46] rounded px-3 py-2 text-xs text-gray-400 flex items-center gap-2">
                                <Move size={12} className="text-orange-400" />
                                <span>{getTransition(clip.animationType || 'none')?.name || clip.animationType || 'None'}</span>
                            </div>
                        </div>

                        {/* Duration */}
                        <div className="space-y-1">
                            <label className="text-[10px] text-gray-400">Duration (seconds)</label>
                            <div className="flex items-center gap-1 bg-[#09090b] border border-[#3f3f46] rounded px-2">
                                <Clock size={10} className="text-gray-500" />
                                <input
                                    type="number"
                                    step="0.1"
                                    min="0.1"
                                    value={clip.animationDuration || 1}
                                    onChange={(e) => onUpdate({ animationDuration: parseFloat(e.target.value) })}
                                    className="w-full bg-transparent py-1.5 text-xs text-white text-center focus:outline-none"
                                />
                            </div>
                        </div>

                        {/* Easing */}
                        <div className="space-y-1">
                            <label className="text-[10px] text-gray-400">Easing</label>
                            <select
                                value={clip.easing || 'ease-out'}
                                onChange={(e) => onUpdate({ easing: e.target.value as EasingType })}
                                className="w-full bg-[#09090b] border border-[#3f3f46] rounded px-2 py-1.5 text-xs text-white"
                            >
                                <option value="linear">Linear</option>
                                <option value="ease-in">Ease In</option>
                                <option value="ease-out">Ease Out</option>
                                <option value="ease-in-out">Ease In Out</option>
                            </select>
                        </div>

                        <div className="text-[9px] text-gray-500 italic pt-2 border-t border-[#3f3f46]/30">
                            Animation clips have a single effect. For In/Out transitions, use media clips (images/videos).
                        </div>

                        {/* Dynamic Variables for Animation Clips */}
                        {(() => {
                            const selectedTransition = getTransition(clip.animationType || 'none');
                            if (!selectedTransition) return null;

                            const updateParams = (key: string, value: any) => {
                                const currentParams = clip.transitionParams || {};
                                onUpdate({ transitionParams: { ...currentParams, [key]: value } });
                            };

                            const getParamValue = (key: string, defaultValue: any) => {
                                return clip.transitionParams?.[key] ?? defaultValue;
                            };

                            return (
                                <div className="space-y-2 border-t border-[#3f3f46]/30 pt-2">
                                    {selectedTransition.variables.map(v => (
                                        <div key={v.key} className="space-y-1">
                                            <label className="text-[10px] text-gray-400 block">{v.name}</label>
                                            {v.type === 'select' ? (
                                                <select
                                                    value={getParamValue(v.key, v.defaultValue)}
                                                    onChange={(e) => updateParams(v.key, e.target.value)}
                                                    className="w-full bg-[#09090b] border border-[#3f3f46] rounded px-2 py-1 text-xs text-white"
                                                >
                                                    {v.options?.map(o => <option key={o} value={o}>{o}</option>)}
                                                </select>
                                            ) : v.type === 'color' ? (
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="color"
                                                        value={getParamValue(v.key, v.defaultValue)}
                                                        onChange={(e) => updateParams(v.key, e.target.value)}
                                                        className="bg-transparent w-6 h-6 border-0 p-0"
                                                    />
                                                    <span className="text-xs text-gray-400">{getParamValue(v.key, v.defaultValue)}</span>
                                                </div>
                                            ) : v.type === 'number' ? (
                                                <input
                                                    type="number"
                                                    step={v.step || 0.1}
                                                    min={v.min}
                                                    max={v.max}
                                                    value={getParamValue(v.key, v.defaultValue)}
                                                    onChange={(e) => updateParams(v.key, parseFloat(e.target.value))}
                                                    className="w-full bg-[#09090b] border border-[#3f3f46] rounded px-2 py-1 text-xs text-white"
                                                />
                                            ) : v.type === 'boolean' ? (
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={!!getParamValue(v.key, v.defaultValue)}
                                                        onChange={(e) => updateParams(v.key, e.target.checked)}
                                                        className="w-4 h-4 bg-[#09090b] border border-[#3f3f46] rounded accent-blue-500"
                                                    />
                                                    <span className="text-xs text-gray-400">{v.name}</span>
                                                </div>
                                            ) : v.type === 'source' ? (
                                                <>
                                                    <select
                                                        value={getParamValue(v.key, '')}
                                                        onChange={(e) => updateParams(v.key, e.target.value)}
                                                        className="w-full bg-[#09090b] border border-[#3f3f46] rounded px-2 py-1 text-xs text-white"
                                                    >
                                                        <option value="">Select Source...</option>
                                                        <option value="__transparent__">Transparent</option>
                                                        <option value="__custom_fill__">Custom Fill</option>
                                                        {getOverlappingClips().map(c => (
                                                            <option key={c.id} value={c.id}>{c.name} (Track {c.trackId})</option>
                                                        ))}
                                                    </select>
                                                    {getParamValue(v.key, '') === '__custom_fill__' && (
                                                        <div className="flex items-center gap-2 mt-2">
                                                            <label className="text-[10px] text-gray-400">Fill Color:</label>
                                                            <input
                                                                type="color"
                                                                value={getParamValue(`${v.key}_color`, '#000000')}
                                                                onChange={(e) => updateParams(`${v.key}_color`, e.target.value)}
                                                                className="bg-transparent w-8 h-8 border border-[#3f3f46] rounded p-0"
                                                            />
                                                            <span className="text-xs text-gray-400">{getParamValue(`${v.key}_color`, '#000000')}</span>
                                                        </div>
                                                    )}
                                                </>
                                            ) : v.type === 'logo' ? (
                                                <input
                                                    type="text"
                                                    value={getParamValue(v.key, v.defaultValue)}
                                                    onChange={(e) => updateParams(v.key, e.target.value)}
                                                    placeholder="Logo URL or path"
                                                    className="w-full bg-[#09090b] border border-[#3f3f46] rounded px-2 py-1 text-xs text-white"
                                                />
                                            ) : v.type === 'link' ? (
                                                <input
                                                    type="url"
                                                    value={getParamValue(v.key, v.defaultValue)}
                                                    onChange={(e) => updateParams(v.key, e.target.value)}
                                                    placeholder="https://example.com"
                                                    className="w-full bg-[#09090b] border border-[#3f3f46] rounded px-2 py-1 text-xs text-white"
                                                />
                                            ) : null}

                                            {/* Special Case for Custom Code */}
                                            {v.key === 'code' && (
                                                <textarea
                                                    value={getParamValue(v.key, v.defaultValue)}
                                                    onChange={(e) => updateParams(v.key, e.target.value)}
                                                    className="w-full h-32 bg-[#09090b] border border-[#3f3f46] rounded p-2 text-[10px] font-mono text-green-400 focus:outline-none resize-none"
                                                    spellCheck={false}
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            );
                        })()}
                    </div>
                </div>
            </div>
        );
    }

    const renderTransitionControls = (type: 'in' | 'out') => {
        const currentAnim = type === 'in' ? clip.animationIn : clip.animationOut;
        const currentDuration = type === 'in' ? clip.animationInDuration : clip.animationOutDuration;
        const currentEasing = type === 'in' ? clip.animationInEasing : clip.animationOutEasing;

        const selectedTransition = getTransition(currentAnim || 'none');

        // Helper to update params
        const updateParams = (key: string, value: any) => {
            if (type === 'in') {
                const currentParams = clip.transitionInParams || {};
                onUpdate({ transitionInParams: { ...currentParams, [key]: value } });
            } else {
                const currentParams = clip.transitionOutParams || {};
                onUpdate({ transitionOutParams: { ...currentParams, [key]: value } });
            }
        };

        const getParamValue = (key: string, defaultValue: any) => {
            const params = type === 'in' ? clip.transitionInParams : clip.transitionOutParams;
            return params?.[key] ?? defaultValue;
        };

        return (
            <div className={`p-3 rounded border transition-colors ${currentAnim && currentAnim !== 'none' ? (type === 'in' ? 'bg-[#27272a] border-green-500/30' : 'bg-[#27272a] border-red-500/30') : 'bg-[#18181b] border-[#3f3f46]'}`}>
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        {type === 'in' ? <ArrowRightFromLine size={12} className="text-green-400" /> : <ArrowLeftFromLine size={12} className="text-red-400" />}
                        <span className="text-xs font-semibold text-gray-200">{type === 'in' ? 'Enter' : 'Exit'}</span>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <div className="col-span-2 flex gap-2">
                        <select
                            value={currentAnim || 'none'}
                            onChange={(e) => {
                                const val = e.target.value as AnimationType;
                                if (type === 'in') onUpdate({ animationIn: val });
                                else onUpdate({ animationOut: val });

                                if (val !== 'none') {
                                    if (type === 'in') focusStart(); else focusEnd();
                                }
                            }}
                            className="flex-1 bg-[#09090b] border border-[#3f3f46] rounded px-2 py-1.5 text-xs text-white"
                        >
                            <option value="none">None</option>
                            {transitions.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                        {currentAnim && currentAnim !== 'none' && selectedTransition && (
                            <button
                                onClick={() => {
                                    // Show transition code in alert
                                    const code = selectedTransition.apply.toString();
                                    alert(`${selectedTransition.name} Transition Code:\n\n${code}`);
                                }}
                                className="bg-[#09090b] border border-[#3f3f46] rounded px-2 py-1.5 text-xs text-purple-400 hover:text-purple-300 hover:border-purple-500/50"
                                title="View Transition Code"
                            >
                                <Code size={14} />
                            </button>
                        )}
                    </div>

                    {currentAnim && currentAnim !== 'none' && (
                        <>
                            <div className="flex items-center gap-1 bg-[#09090b] border border-[#3f3f46] rounded px-2">
                                <Clock size={10} className="text-gray-500" />
                                <input
                                    type="number" step="0.1" min="0.1"
                                    value={currentDuration || 1}
                                    onChange={(e) => {
                                        const val = parseFloat(e.target.value);
                                        if (type === 'in') onUpdate({ animationInDuration: val });
                                        else onUpdate({ animationOutDuration: val });
                                        if (type === 'in') focusStart(); else focusEnd();
                                    }}
                                    className="w-full bg-transparent py-1 text-xs text-white text-center focus:outline-none"
                                />
                            </div>
                            <select
                                value={currentEasing || 'ease-out'}
                                onChange={(e) => {
                                    const val = e.target.value as EasingType;
                                    if (type === 'in') onUpdate({ animationInEasing: val });
                                    else onUpdate({ animationOutEasing: val });
                                }}
                                className="w-full bg-[#09090b] border border-[#3f3f46] rounded px-1 py-1.5 text-[10px] text-white"
                            >
                                <option value="linear">Linear</option>
                                <option value="ease-in">Ease In</option>
                                <option value="ease-out">Ease Out</option>
                                <option value="ease-in-out">Ease In Out</option>
                            </select>

                            {/* Dynamic Variables */}
                            {selectedTransition && selectedTransition.variables.map(v => (
                                <div key={v.key} className="col-span-2 space-y-1 mt-2 border-t border-[#3f3f46]/30 pt-2">
                                    <label className="text-[10px] text-gray-400 block">{v.name}</label>
                                    {v.type === 'select' ? (
                                        <select
                                            value={getParamValue(v.key, v.defaultValue)}
                                            onChange={(e) => updateParams(v.key, e.target.value)}
                                            className="w-full bg-[#09090b] border border-[#3f3f46] rounded px-2 py-1 text-xs text-white"
                                        >
                                            {v.options?.map(o => <option key={o} value={o}>{o}</option>)}
                                        </select>
                                    ) : v.type === 'color' ? (
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="color"
                                                value={getParamValue(v.key, v.defaultValue)}
                                                onChange={(e) => updateParams(v.key, e.target.value)}
                                                className="bg-transparent w-6 h-6 border-0 p-0"
                                            />
                                            <span className="text-xs text-gray-400">{getParamValue(v.key, v.defaultValue)}</span>
                                        </div>
                                    ) : v.type === 'number' ? (
                                        <input
                                            type="number"
                                            step={v.step || 0.1}
                                            min={v.min}
                                            max={v.max}
                                            value={getParamValue(v.key, v.defaultValue)}
                                            onChange={(e) => updateParams(v.key, parseFloat(e.target.value))}
                                            className="w-full bg-[#09090b] border border-[#3f3f46] rounded px-2 py-1 text-xs text-white"
                                        />
                                    ) : v.type === 'boolean' ? (
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={!!getParamValue(v.key, v.defaultValue)}
                                                onChange={(e) => updateParams(v.key, e.target.checked)}
                                                className="w-4 h-4 bg-[#09090b] border border-[#3f3f46] rounded accent-blue-500"
                                            />
                                            <span className="text-xs text-gray-400">{v.name}</span>
                                        </div>
                                    ) : null}

                                    {/* Special Case for Custom Code */}
                                    {v.key === 'code' && (
                                        <textarea
                                            value={getParamValue(v.key, v.defaultValue)}
                                            onChange={(e) => updateParams(v.key, e.target.value)}
                                            className="w-full h-32 bg-[#09090b] border border-[#3f3f46] rounded p-2 text-[10px] font-mono text-green-400 focus:outline-none resize-none"
                                            spellCheck={false}
                                        />
                                    )}
                                </div>
                            ))}
                        </>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider flex items-center gap-2">Transitions (In/Out)</label>
                <button
                    onClick={() => setIsPlayingDemo(!isPlayingDemo)}
                    className={`p-1 rounded ${isPlayingDemo ? 'bg-blue-600 text-white' : 'bg-[#27272a] text-gray-400 hover:text-white'}`}
                    title="Preview Transition"
                >
                    <Play size={12} fill={isPlayingDemo ? "currentColor" : "none"} />
                </button>
            </div>

            {isPlayingDemo && (
                <div className="w-full h-24 bg-black rounded border border-[#3f3f46] mb-2 overflow-hidden relative">
                    <canvas ref={canvasRef} width={300} height={150} className="w-full h-full object-contain" />
                    <div className="absolute bottom-1 right-1 text-[9px] text-gray-500">Preview</div>
                </div>
            )}

            {renderTransitionControls('in')}
            {renderTransitionControls('out')}
        </div>
    );
};
