import React, { useState, useRef, useEffect } from 'react';
import { Asset, MediaType, Effect, AnimationType, EasingType } from '../models';
import { generateImageAsset, generateVideoAsset, generateScript, generateCSSFilter, generateTransitionSettings } from '../services/ai/GeminiProvider';
import { Search, Plus, Filter, Music, Type, Image as ImageIcon, Video, File, X, ChevronRight, Play, Loader2, Sparkles, Code, Shapes, Upload, Trash2, Square, Circle, ArrowRight, Star, Move, Wand2, Palette, FileText } from 'lucide-react';
import { validateTransitionCode, registerTransition, getTransition, getAllTransitions, subscribeToRegistry } from '../transitions/registry';
import AudioBrowser from './AudioBrowser';
import StockMediaBrowser from './StockMediaBrowser';
import CodeAssetBrowser from './CodeAssetBrowser';

interface AssetLibraryProps {
    assets: Asset[];
    onAddAsset: (asset: Asset) => void;
    onDragStart: (e: React.DragEvent, item: any) => void; // Generic item
}

const AssetLibrary: React.FC<AssetLibraryProps> = ({ assets, onAddAsset, onDragStart }) => {
    const [activeTab, setActiveTab] = useState<'media' | 'text' | 'fx' | 'elements' | 'ai' | 'audio' | 'code'>('media');

    // AI Inputs
    const [prompts, setPrompts] = useState({
        image: '',
        video: '',
        script: '',
        filter: '',
        transition: ''
    });

    const [loading, setLoading] = useState({
        image: false,
        video: false,
        script: false,
        filter: false,
        transition: false
    });

    const [generatedScript, setGeneratedScript] = useState('');

    const textPresets: Asset[] = [
        { id: 'txt_1', type: MediaType.TEXT, src: '', name: 'Basic Title' },
        { id: 'txt_2', type: MediaType.TEXT, src: '', name: 'Subtitle' },
        { id: 'txt_3', type: MediaType.TEXT, src: '', name: 'Credits' },
    ];

    const shapePresets = [
        { id: 'shape_rectangle', type: MediaType.SHAPE, shapeType: 'rectangle', name: 'Rectangle', icon: <Square size={16} /> },
        { id: 'shape_circle', type: MediaType.SHAPE, shapeType: 'circle', name: 'Circle', icon: <Circle size={16} /> },
        { id: 'shape_arrow', type: MediaType.SHAPE, shapeType: 'arrow', name: 'Arrow', icon: <ArrowRight size={16} /> },
        { id: 'shape_star', type: MediaType.SHAPE, shapeType: 'star', name: 'Star', icon: <Star size={16} /> },
    ];

    // Get transitions from registry (auto-syncs with library files)
    const [animationPresets, setAnimationPresets] = useState(() => {
        return getAllTransitions().map(t => ({
            type: t.id as AnimationType,
            name: t.name,
            icon: <Move size={16} />, // Generic icon for all transitions
            duration: 1,
            easing: 'ease-out' as EasingType
        }));
    });

    // Subscribe to registry updates to auto-refresh when new transitions are added
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

    // Custom Transition Modal State
    const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
    const [customName, setCustomName] = useState('');
    const [customCode, setCustomCode] = useState(`// Custom Transition
// Available: progress (0-1), isExit, width, height, ctx
// Return: { opacity, offsetX, offsetY, scale, rotation, overlayColor, customDraw }

if (isExit) {
    return { opacity: 1 - progress };
} else {
    return { opacity: progress };
}

/* Example with Custom Drawing (Overlay):
return {
    opacity: 1,
    customDraw: (ctx, width, height) => {
        ctx.fillStyle = 'red';
        ctx.fillRect(0, 0, width * progress, height);
    }
};
*/`);

    const handleCreateCustomTransition = () => {
        if (!customName) {
            alert("Please enter a name");
            return;
        }

        const validation = validateTransitionCode(customCode);
        if (!validation.valid) {
            alert(`Error in code: ${validation.error} `);
            return;
        }

        const id = `custom_${customName.toLowerCase().replace(/\s+/g, '_')}_${Date.now()} `;

        const newTransitionDef = {
            id: id,
            name: customName,
            description: 'Custom user transition',
            variables: [
                {
                    name: 'Intensity',
                    key: 'intensity',
                    type: 'number' as const,
                    defaultValue: 1.0,
                    min: 0,
                    max: 5,
                    step: 0.1
                },
                {
                    name: 'Base Scale',
                    key: 'baseScale',
                    type: 'number' as const,
                    defaultValue: 0.5,
                    min: 0,
                    max: 2,
                    step: 0.1
                },
                {
                    name: 'Overlay Color',
                    key: 'overlayColor',
                    type: 'color' as const,
                    defaultValue: '#ffffff'
                },
                {
                    name: 'Enable Blur',
                    key: 'enableBlur',
                    type: 'boolean' as const,
                    defaultValue: false
                },
                {
                    name: 'Direction',
                    key: 'direction',
                    type: 'select' as const,
                    defaultValue: 'Left',
                    options: ['Left', 'Right', 'Up', 'Down']
                }
            ],
            apply: (context: any) => {
                try {
                    const func = new Function('ctx', 'width', 'height', 'progress', 'isExit', 'params', customCode);
                    return func(context.ctx, context.width, context.height, context.progress, context.isExit, context.params || {}) || { opacity: 1 };
                } catch (e) {
                    console.error(`Transition ${customName} failed: `, e);
                    return { opacity: 1 };
                }
            }
        };

        registerTransition(newTransitionDef);

        const newPreset = {
            type: id as AnimationType,
            name: customName,
            duration: 1.5,
            easing: 'ease-in-out' as EasingType,
            icon: <Code size={16} className="text-green-400" />
        };
        setAnimationPresets(prev => [newPreset, ...prev]);
        setIsCustomModalOpen(false);
        setCustomName('');
    };

    // Preview State
    const [previewingTransition, setPreviewingTransition] = useState<any>(null);
    const previewCanvasRef = useRef<HTMLCanvasElement>(null);
    const previewAnimRef = useRef<number>();

    useEffect(() => {
        if (!previewingTransition || !previewCanvasRef.current) return;

        const canvas = previewCanvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let startTime = performance.now();
        const duration = 3000; // 3s loop

        const loop = (time: number) => {
            const elapsed = (time - startTime) % duration;
            const progress = elapsed / duration;

            // Clear
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Map animation type to transition ID and params
            let transitionId = previewingTransition.type;
            let params: any = {};

            // Handle legacy animation types that map to parameterized transitions
            if (transitionId.startsWith('slide-')) {
                const direction = transitionId.replace('slide-', '');
                transitionId = 'slide';
                params = { direction };
            } else if (transitionId.startsWith('zoom-')) {
                const direction = transitionId.replace('zoom-', '');
                transitionId = 'zoom';
                params = { direction };
            }

            // Get transition
            const transition = getTransition(transitionId);

            if (transition) {
                // Determine if we're in exit phase (second half of animation)
                const isExit = progress > 0.5;
                const adjustedProgress = isExit ? (progress - 0.5) * 2 : progress * 2;

                const ctxParams = {
                    ctx,
                    width: canvas.width,
                    height: canvas.height,
                    progress: adjustedProgress,
                    isExit: isExit,
                    params: params
                };

                const res = transition.apply(ctxParams);

                // Save context state
                ctx.save();

                // Apply transform-based effects (opacity, offset, scale)
                if (res.offsetX !== undefined || res.offsetY !== undefined) {
                    ctx.translate(res.offsetX || 0, res.offsetY || 0);
                }
                if (res.scale !== undefined) {
                    ctx.translate(canvas.width / 2, canvas.height / 2);
                    ctx.scale(res.scale, res.scale);
                    ctx.translate(-canvas.width / 2, -canvas.height / 2);
                }
                if (res.opacity !== undefined) {
                    ctx.globalAlpha = res.opacity;
                }

                // Draw sample content (gradient background)
                const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
                gradient.addColorStop(0, '#4f46e5');
                gradient.addColorStop(1, '#7c3aed');
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                // Draw text
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 24px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('PREVIEW', canvas.width / 2, canvas.height / 2);

                ctx.restore();

                // Apply customDraw if present (overlay effects)
                if (res.customDraw) {
                    ctx.save();
                    ctx.setTransform(1, 0, 0, 1, 0, 0);
                    try {
                        res.customDraw(ctx, canvas.width, canvas.height);
                    } catch (e) {
                        console.error('Preview customDraw error:', e);
                    }
                    ctx.restore();
                }
            } else {
                // Fallback if transition not found
                const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
                gradient.addColorStop(0, '#4f46e5');
                gradient.addColorStop(1, '#7c3aed');
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                ctx.fillStyle = '#fff';
                ctx.font = 'bold 24px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('PREVIEW', canvas.width / 2, canvas.height / 2);

                // Show error message
                ctx.fillStyle = '#ff6b6b';
                ctx.font = '10px Arial';
                ctx.fillText(`Transition "${previewingTransition.type}" not found`, canvas.width / 2, canvas.height / 2 + 30);
            }

            previewAnimRef.current = requestAnimationFrame(loop);
        };

        previewAnimRef.current = requestAnimationFrame(loop);

        return () => {
            if (previewAnimRef.current) cancelAnimationFrame(previewAnimRef.current);
        };
    }, [previewingTransition]);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const url = URL.createObjectURL(file);
        let type = MediaType.IMAGE;

        if (file.type.startsWith('video')) {
            type = MediaType.VIDEO;
        } else if (file.type.startsWith('audio')) {
            type = MediaType.AUDIO;
        } else if (file.type.startsWith('image')) {
            type = MediaType.IMAGE;
        }

        const newAsset: Asset = {
            id: crypto.randomUUID(),
            type,
            src: url,
            name: file.name,
            // Placeholders, ideally we'd use MediaLibraryEngine here too
            width: 0,
            height: 0,
            duration: type === MediaType.VIDEO || type === MediaType.AUDIO ? 0 : undefined
        };
        onAddAsset(newAsset);
    };

    const handleDragStartInternal = (e: React.DragEvent, item: any, type: 'asset' | 'effect' | 'animation' | 'shape') => {
        console.log('[AssetLibrary] Drag started:', { type, item });

        // Set parent data
        if (type === 'asset') {
            onDragStart(e, item);
        } else if (type === 'effect') {
            e.dataTransfer.setData('dragType', 'effect');
            e.dataTransfer.setData('effectData', JSON.stringify(item));
        } else if (type === 'animation') {
            e.dataTransfer.setData('dragType', 'animation');
            e.dataTransfer.setData('animationType', item.type);
            if (item.duration || item.easing) {
                e.dataTransfer.setData('animationData', JSON.stringify(item));
            }
        } else if (type === 'shape') {
            console.log('[AssetLibrary] Setting shape drag data:', item);
            e.dataTransfer.setData('dragType', 'shape');
            // Only serialize necessary data (exclude icon which has circular refs)
            const shapeData = {
                id: item.id,
                type: item.type,
                shapeType: item.shapeType,
                name: item.name
            };
            e.dataTransfer.setData('text/plain', JSON.stringify(shapeData));
        }

        const img = new Image();
        img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
        e.dataTransfer.setDragImage(img, 0, 0);
    };

    const [status, setStatus] = useState<Record<string, { type: 'info' | 'success' | 'error', message: string } | null>>({});

    const generate = async (type: 'image' | 'video' | 'script' | 'filter' | 'transition') => {
        const prompt = prompts[type];
        if (!prompt) return;

        setLoading(prev => ({ ...prev, [type]: true }));
        setStatus(prev => ({ ...prev, [type]: { type: 'info', message: 'Generating...' } }));
        setGeneratedScript('');

        try {
            if (type === 'image') {
                const url = await generateImageAsset(prompt);
                onAddAsset({ id: crypto.randomUUID(), type: MediaType.IMAGE, src: url, name: `AI: ${prompt.slice(0, 15)}...` });
                setStatus(prev => ({ ...prev, [type]: { type: 'success', message: 'Image added to Media tab' } }));
            } else if (type === 'video') {
                const url = await generateVideoAsset(prompt);
                onAddAsset({ id: crypto.randomUUID(), type: MediaType.VIDEO, src: url, name: `Veo: ${prompt.slice(0, 15)}...` });
                setStatus(prev => ({ ...prev, [type]: { type: 'success', message: 'Video added to Media tab' } }));
            } else if (type === 'script') {
                const script = await generateScript(prompt);
                setGeneratedScript(script);
                setStatus(prev => ({ ...prev, [type]: { type: 'success', message: 'Script generated below' } }));
            } else if (type === 'filter') {
                const filterStr = await generateCSSFilter(prompt);
                const newEffect: Effect = {
                    id: `fx_ai_${Date.now()} `,
                    name: `AI: ${prompt.slice(0, 10)} `,
                    type: 'filter',
                    value: filterStr,
                    kind: 'custom',
                    param: 100
                };
                setFilterPresets(prev => [newEffect, ...prev]);
                setStatus(prev => ({ ...prev, [type]: { type: 'success', message: `Added "${newEffect.name}" to FX tab` } }));
            } else if (type === 'transition') {
                const config = await generateTransitionSettings(prompt);
                if (config) {
                    const newTransition = {
                        type: config.animationType as AnimationType,
                        name: `AI: ${prompt.slice(0, 10)} `,
                        duration: config.duration,
                        easing: config.easing as EasingType,
                        icon: <Sparkles size={16} className="text-orange-400" />
                    };
                    setAnimationPresets(prev => [newTransition, ...prev]);
                    setStatus(prev => ({ ...prev, [type]: { type: 'success', message: `Added "${newTransition.name}" to FX tab` } }));
                } else {
                    throw new Error("Failed to generate transition config");
                }
            }
        } catch (err: any) {
            setStatus(prev => ({ ...prev, [type]: { type: 'error', message: `Failed: ${err.message} ` } }));
        } finally {
            setLoading(prev => ({ ...prev, [type]: false }));
        }
    };

    const renderStatus = (type: string) => {
        const s = status[type];
        if (!s && !loading[type as keyof typeof loading]) return null;

        return (
            <div className="mt-2">
                {loading[type as keyof typeof loading] && (
                    <div className="w-full bg-[#27272a] rounded-full h-1 mb-2 overflow-hidden">
                        <div className="bg-blue-500 h-full w-1/3 animate-[shimmer_1s_infinite_linear]" style={{ animation: 'shimmer 1s infinite linear', backgroundImage: 'linear-gradient(to right, transparent, rgba(255,255,255,0.5), transparent)' }}></div>
                    </div>
                )}
                {s && (
                    <div className={`text - [10px] ${s.type === 'error' ? 'text-red-400' : s.type === 'success' ? 'text-green-400' : 'text-blue-400'} flex items - center gap - 1`}>
                        {s.type === 'success' && <Sparkles size={10} />}
                        {s.message}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full bg-[var(--bg-panel)] border-r border-[var(--border-base)] w-full">
            {/* Tabs */}
            <div className="flex border-b border-[var(--border-base)] overflow-x-auto scrollbar-hide">
                <button onClick={() => setActiveTab('media')} className={`flex-1 min-w-[70px] py-3 text-xs font-medium transition-colors ${activeTab === 'media' ? 'text-[var(--accent-primary)] border-b-2 border-[var(--accent-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>Media</button>
                <button onClick={() => setActiveTab('audio')} className={`flex-1 min-w-[70px] py-3 text-xs font-medium transition-colors ${activeTab === 'audio' ? 'text-pink-400 border-b-2 border-pink-400' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}><Music className="w-3.5 h-3.5 inline mr-1" />Audio</button>
                <button onClick={() => setActiveTab('code')} className={`flex-1 min-w-[70px] py-3 text-xs font-medium transition-colors ${activeTab === 'code' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}><Code className="w-3.5 h-3.5 inline mr-1" />Code</button>
                <button onClick={() => setActiveTab('text')} className={`flex-1 min-w-[70px] py-3 text-xs font-medium transition-colors ${activeTab === 'text' ? 'text-yellow-400 border-b-2 border-yellow-400' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>Text</button>
                <button onClick={() => setActiveTab('elements')} className={`flex-1 min-w-[70px] py-3 text-xs font-medium transition-colors ${activeTab === 'elements' ? 'text-orange-400 border-b-2 border-orange-400' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}><Shapes className="w-3.5 h-3.5 inline mr-1" />Shapes</button>
                <button onClick={() => setActiveTab('fx')} className={`flex-1 min-w-[70px] py-3 text-xs font-medium transition-colors ${activeTab === 'fx' ? 'text-green-400 border-b-2 border-green-400' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>FX</button>
                <button onClick={() => setActiveTab('ai')} className={`flex-1 min-w-[70px] py-3 text-xs font-medium transition-colors ${activeTab === 'ai' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}><Sparkles className="w-3.5 h-3.5 inline mr-1" /> AI</button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {activeTab === 'media' && (
                    <div className="space-y-4">
                        <label className="flex flex-col items-center justify-center w-full h-24 border border-dashed border-[var(--border-light)] rounded-lg cursor-pointer hover:border-[#52525b] hover:bg-[var(--bg-hover)] transition-colors">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <Upload className="w-5 h-5 text-gray-400 mb-1" />
                                <p className="text-[10px] text-gray-500">Upload Media</p>
                            </div>
                            <input type="file" className="hidden" onChange={handleFileUpload} accept="image/*,video/*,audio/*" />
                        </label>

                        {/* Stock Media Browser */}
                        <div className="mb-4">
                            <h3 className="text-xs font-medium text-gray-400 mb-2">Stock Images</h3>
                            <StockMediaBrowser onAddMedia={onAddAsset} />
                        </div>


                        {/* Uploaded Media */}
                        <div>
                            <h3 className="text-xs font-medium text-gray-400 mb-2">Your Media</h3>
                            <div className="grid grid-cols-2 gap-2">
                                {assets.filter(a => [MediaType.VIDEO, MediaType.IMAGE, MediaType.AUDIO].includes(a.type)).map(asset => (
                                    <div
                                        key={asset.id}
                                        draggable
                                        onDragStart={(e) => handleDragStartInternal(e, asset, 'asset')}
                                        className="bg-[var(--bg-item)] hover:bg-[var(--bg-hover)] p-2 rounded cursor-grab active:cursor-grabbing border border-[var(--border-base)] transition relative group"
                                    >
                                        {asset.type === MediaType.VIDEO && (
                                            <video src={asset.src} className="w-full h-20 object-cover rounded mb-1 bg-black" />
                                        )}
                                        {asset.type === MediaType.AUDIO && (
                                            <div className="w-full h-20 flex items-center justify-center bg-[#111] rounded mb-1">
                                                <Music className="w-6 h-6 text-pink-400" />
                                            </div>
                                        )}
                                        {asset.type === MediaType.IMAGE && (
                                            <img src={asset.src} alt={asset.name} className="w-full h-20 object-cover rounded mb-1 bg-black" />
                                        )}
                                        <span className="text-[10px] text-[var(--text-secondary)] truncate block px-1">{asset.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'audio' && (
                    <AudioBrowser onAddAsset={onAddAsset} />
                )}


                {activeTab === 'code' && (
                    <CodeAssetBrowser onAddAsset={onAddAsset} />
                )}

                {activeTab === 'text' && (
                    <div className="space-y-3">
                        <p className="text-xs text-gray-500 mb-2">My Text Assets</p>
                        {assets.filter(a => a.type === MediaType.TEXT).map(asset => (
                            <div
                                key={asset.id}
                                draggable
                                onDragStart={(e) => handleDragStartInternal(e, asset, 'asset')}
                                className="bg-[var(--bg-item)] hover:bg-[var(--bg-hover)] p-2 rounded-md cursor-grab active:cursor-grabbing border border-[var(--border-base)] flex items-center gap-3 transition-colors"
                            >
                                <Type className="w-4 h-4 text-blue-400" />
                                <span className="text-xs text-[var(--text-primary)] truncate">{asset.name}</span>
                            </div>
                        ))}

                        <p className="text-xs text-gray-500 mb-2 mt-4">Presets</p>
                        {textPresets.map(text => (
                            <div
                                key={text.id}
                                draggable
                                onDragStart={(e) => handleDragStartInternal(e, text, 'asset')}
                                className="bg-[var(--bg-item)] hover:bg-[var(--bg-hover)] p-2 rounded-md cursor-grab active:cursor-grabbing border border-[var(--border-base)] flex items-center gap-3 transition-colors"
                            >
                                <Type className="w-4 h-4 text-yellow-400" />
                                <span className="text-xs text-[var(--text-primary)]">{text.name}</span>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'elements' && (
                    <div>
                        <h3 className="text-xs font-bold text-gray-400 uppercase mb-3 flex items-center gap-2">
                            <Shapes size={12} /> Shapes
                        </h3>
                        <div className="grid grid-cols-2 gap-2">
                            {shapePresets.map((shape) => (
                                <div
                                    key={shape.id}
                                    draggable
                                    onDragStart={(e) => handleDragStartInternal(e, shape, 'shape')}
                                    className="bg-[#27272a] hover:bg-[#3f3f46] p-4 rounded cursor-grab active:cursor-grabbing border border-[#3f3f46] flex flex-col items-center justify-center gap-2 transition text-gray-300 hover:text-white"
                                >
                                    {shape.icon}
                                    <span className="text-xs">{shape.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'fx' && (
                    <div className="space-y-6">
                        {/* Animations */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-xs font-bold text-gray-400 uppercase flex items-center gap-2">
                                    <Wand2 size={12} /> Transitions / Animations
                                </h3>
                                <button
                                    onClick={() => setIsCustomModalOpen(true)}
                                    className="text-[10px] bg-purple-600 hover:bg-purple-500 text-white px-2 py-1 rounded flex items-center gap-1"
                                    title="Create New Transition"
                                >
                                    <Plus size={10} />
                                    New
                                </button>
                            </div>

                            {/* Custom Transition Modal */}
                            {isCustomModalOpen && (
                                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                                    <div className="bg-[#18181b] border border-[#3f3f46] rounded-lg w-full max-w-2xl p-4 space-y-4 shadow-xl">
                                        <div className="flex justify-between items-center">
                                            <h3 className="text-sm font-bold text-white">Create Custom Transition</h3>
                                            <button onClick={() => setIsCustomModalOpen(false)} className="text-gray-400 hover:text-white">✕</button>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs text-gray-400">Name</label>
                                            <input
                                                type="text"
                                                value={customName}
                                                onChange={(e) => setCustomName(e.target.value)}
                                                className="w-full bg-[#09090b] border border-[#3f3f46] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                                                placeholder="e.g., Honeycomb"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs text-gray-400">JavaScript Code</label>
                                            <textarea
                                                value={customCode}
                                                onChange={(e) => setCustomCode(e.target.value)}
                                                className="w-full h-64 bg-[#09090b] border border-[#3f3f46] rounded p-3 text-xs font-mono text-green-400 focus:outline-none focus:border-purple-500 resize-none"
                                                spellCheck={false}
                                            />
                                        </div>

                                        <div className="flex justify-end gap-2 pt-2">
                                            <button
                                                onClick={() => setIsCustomModalOpen(false)}
                                                className="px-3 py-1.5 rounded text-xs text-gray-300 hover:bg-[#27272a]"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleCreateCustomTransition}
                                                className="px-3 py-1.5 rounded text-xs bg-purple-600 text-white hover:bg-purple-500"
                                            >
                                                Create Transition
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Preview Canvas */}
                            {previewingTransition && (
                                <div className="mb-3 p-3 bg-[#18181b] border border-purple-500/30 rounded-lg">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs text-purple-400 font-semibold">Preview: {previewingTransition.name}</span>
                                        <button
                                            onClick={() => setPreviewingTransition(null)}
                                            className="text-xs text-gray-400 hover:text-white"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                    <canvas
                                        ref={previewCanvasRef}
                                        width={300}
                                        height={150}
                                        className="w-full h-auto bg-black rounded border border-[#3f3f46]"
                                    />
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-2">
                                {animationPresets.map((anim, idx) => (
                                    <div
                                        key={idx}
                                        draggable
                                        onDragStart={(e) => handleDragStartInternal(e, anim, 'animation')}
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
                                        {/* Preview Button */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setPreviewingTransition(anim);
                                            }}
                                            className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 bg-purple-600 hover:bg-purple-500 p-1 rounded transition-opacity"
                                            title="Preview transition"
                                        >
                                            <Play size={10} fill="white" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Filters */}
                        <div>
                            <h3 className="text-xs font-bold text-gray-400 uppercase mb-3 flex items-center gap-2">
                                <Sparkles size={12} /> Filters
                            </h3>
                            <div className="space-y-2">
                                {filterPresets.map((effect) => (
                                    <div
                                        key={effect.id}
                                        draggable
                                        onDragStart={(e) => handleDragStartInternal(e, effect, 'effect')}
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
                )}

                {activeTab === 'ai' && (
                    <div className="space-y-8">

                        {/* 1. Image Generator */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-blue-400 uppercase flex items-center gap-2"><ImageIcon size={12} /> Image Generator</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={prompts.image}
                                    onChange={(e) => setPrompts({ ...prompts, image: e.target.value })}
                                    placeholder="e.g. Cyberpunk city"
                                    className="flex-1 bg-[#27272a] border border-[#3f3f46] rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                                />
                                <button onClick={() => generate('image')} disabled={loading.image || !prompts.image} className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded disabled:opacity-50">
                                    {loading.image ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                                </button>
                            </div>
                            {renderStatus('image')}
                        </div>

                        {/* 2. Veo Video Generator */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-purple-400 uppercase flex items-center gap-2"><Video size={12} /> Veo Video Generator</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={prompts.video}
                                    onChange={(e) => setPrompts({ ...prompts, video: e.target.value })}
                                    placeholder="e.g. Drone shot of forest"
                                    className="flex-1 bg-[#27272a] border border-[#3f3f46] rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                                />
                                <button onClick={() => generate('video')} disabled={loading.video || !prompts.video} className="bg-purple-600 hover:bg-purple-500 text-white p-2 rounded disabled:opacity-50">
                                    {loading.video ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                                </button>
                            </div>
                            {renderStatus('video')}
                        </div>

                        {/* 3. Filter Generator */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-pink-400 uppercase flex items-center gap-2"><Palette size={12} /> Filter Generator</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={prompts.filter}
                                    onChange={(e) => setPrompts({ ...prompts, filter: e.target.value })}
                                    placeholder="e.g. 80s vintage horror"
                                    className="flex-1 bg-[#27272a] border border-[#3f3f46] rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-pink-500"
                                />
                                <button onClick={() => generate('filter')} disabled={loading.filter || !prompts.filter} className="bg-pink-600 hover:bg-pink-500 text-white p-2 rounded disabled:opacity-50">
                                    {loading.filter ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                                </button>
                            </div>
                            {renderStatus('filter')}
                        </div>

                        {/* 4. Transition Generator */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-orange-400 uppercase flex items-center gap-2"><Move size={12} /> Transition Generator</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={prompts.transition}
                                    onChange={(e) => setPrompts({ ...prompts, transition: e.target.value })}
                                    placeholder="e.g. slow dramatic fade"
                                    className="flex-1 bg-[#27272a] border border-[#3f3f46] rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                                />
                                <button onClick={() => generate('transition')} disabled={loading.transition || !prompts.transition} className="bg-orange-600 hover:bg-orange-500 text-white p-2 rounded disabled:opacity-50">
                                    {loading.transition ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                                </button>
                            </div>
                            {renderStatus('transition')}
                        </div>

                        {/* 5. Script Writer */}
                        <div className="space-y-2 border-t border-[#3f3f46] pt-4">
                            <label className="text-xs font-bold text-gray-400 uppercase flex items-center gap-2"><FileText size={12} /> Script Writer</label>
                            <textarea
                                value={prompts.script}
                                onChange={(e) => setPrompts({ ...prompts, script: e.target.value })}
                                placeholder="e.g. Coffee commercial, romantic sunset scene, action movie trailer"
                                className="w-full bg-[#27272a] border border-[#3f3f46] rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-gray-500 min-h-[60px] resize-none"
                            />
                            <button onClick={() => generate('script')} disabled={loading.script || !prompts.script} className="w-full bg-gray-600 hover:bg-gray-500 text-white p-2 rounded disabled:opacity-50 font-medium text-sm flex items-center justify-center gap-2">
                                {loading.script ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                                {loading.script ? 'Generating...' : 'Generate Script'}
                            </button>
                            {renderStatus('script')}
                            {generatedScript && (
                                <div className="bg-[#27272a] p-3 rounded-lg border border-[#3f3f46] mt-2">
                                    <p className="text-[10px] text-gray-400 mb-2 font-semibold">Generated Script:</p>
                                    <pre className="text-[10px] text-gray-300 whitespace-pre-wrap font-mono max-h-40 overflow-y-auto">{generatedScript}</pre>
                                </div>
                            )}
                        </div>

                        {/* 6. Smart AI Timeline Generator */}
                        <div className="space-y-3 border-t border-[#3f3f46] pt-4 bg-gradient-to-br from-purple-900/10 to-blue-900/10 p-4 rounded-lg">
                            <label className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400 uppercase flex items-center gap-2">
                                <Sparkles size={14} /> Smart Timeline Generator
                            </label>
                            <p className="text-[10px] text-gray-400">Coming Soon - Auto-generate timeline from your assets</p>
                            <button
                                disabled
                                className="w-full bg-gray-600/50 text-gray-400 py-3 px-4 rounded-lg font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Sparkles size={16} />
                                Feature Coming Soon
                            </button>
                        </div>

                    </div>
                )}
            </div>
        </div>
    );
};

export default AssetLibrary;
