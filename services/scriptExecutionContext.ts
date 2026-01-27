import { Asset, Clip, Track, MediaType, Effect, AnimationType } from '../types';
import { generateImageAsset } from './geminiService';
import { registerTransition as registerTransitionInRegistry } from '../transitions/registry';
import { Transition, TransitionContext, TransitionResult } from '../transitions/types';

export interface ClipConfig {
    track: number;
    start: number;
    duration?: number;
    scale?: number;
    opacity?: number;
    x?: number;
    y?: number;
}

export interface TransitionConfig {
    id: string;
    name: string;
    fromDegree: number;
    toDegree: number;
    description?: string;
}

export interface ScriptExecutionContext {
    // Asset references (auto-injected)
    assets: Record<string, string>;

    // Timeline operations
    addClip: (assetIdOrName: string, config: ClipConfig) => { id: string };
    removeClip: (id: string) => void;
    updateClip: (id: string, updates: Partial<Clip>) => void;
    getClip: (id: string) => Clip | undefined;

    // Asset creation
    addTextAsset: (text: string, options?: {
        fontSize?: number;
        fontColor?: string;
        fontFamily?: string;
        isBold?: boolean;
        backgroundColor?: string;
        borderRadius?: number;
        padding?: number;
    }) => Asset;

    // Effect operations
    addEffect: (clipId: string, effect: Partial<Effect>) => void;

    // Transition operations
    addTransition: (clipId: string, type: 'in' | 'out', transition: AnimationType, duration?: number) => void;

    // External resources
    addAssetFromUrl: (url: string, name?: string) => Promise<Asset>;

    // AI operations
    ai: {
        generateImage: (prompt: string) => Promise<Asset>;
    };

    // Custom transition registration
    registerTransition: (config: TransitionConfig) => void;

    // Utility
    display: (content: any) => void;
}

export const createExecutionContext = (
    assets: Asset[],
    clips: Clip[],
    tracks: Track[],
    onAddClip: (clip: Clip) => void,
    onUpdateClip: (id: string, updates: Partial<Clip>) => void,
    onRemoveClip: (id: string) => void,
    onAddAsset: (asset: Asset) => void,
    onDisplay: (content: any) => void
): ScriptExecutionContext => {

    // Create asset name map
    const assetMap: Record<string, string> = {};
    assets.forEach(asset => {
        const safeName = asset.name.replace(/[^a-zA-Z0-9]/g, '_');
        assetMap[safeName] = asset.id;
    });

    // Runtime cache for newly created assets (fixes race condition)
    const runtimeAssets: Asset[] = [];

    // Helper to resolve asset ID from name or ID
    const resolveAssetId = (nameOrId: string): string => {
        return assetMap[nameOrId] || nameOrId;
    };

    // Helper to find asset (checks runtime cache first)
    const findAsset = (assetIdOrName: string): Asset | undefined => {
        let assetId = resolveAssetId(assetIdOrName);

        // Check runtime cache first (newly created assets)
        let asset = runtimeAssets.find(a => a.id === assetId || a.name === assetIdOrName);

        // Then check original assets array
        if (!asset) {
            asset = assets.find(a => a.id === assetId);
        }

        // Try finding by name directly
        if (!asset) {
            asset = assets.find(a => a.name === assetIdOrName) ||
                runtimeAssets.find(a => a.name === assetIdOrName);
        }

        return asset;
    };

    const context: ScriptExecutionContext = {
        assets: assetMap,

        addClip: (assetIdOrName: string, config: ClipConfig) => {
            let asset = findAsset(assetIdOrName);

            // Handle Virtual Assets (Animation/Shape/Effect) if still not found
            if (!asset) {
                if (assetIdOrName.startsWith('anim_')) {
                    const animType = assetIdOrName.replace('anim_', '');
                    asset = {
                        id: assetIdOrName,
                        name: animType.charAt(0).toUpperCase() + animType.slice(1),
                        type: MediaType.ANIMATION,
                        src: '',
                        subtype: 'animation'
                    };
                } else if (assetIdOrName.startsWith('shape_')) {
                    const shapeType = assetIdOrName.replace('shape_', '');
                    asset = {
                        id: assetIdOrName,
                        name: shapeType.charAt(0).toUpperCase() + shapeType.slice(1),
                        type: MediaType.SHAPE,
                        src: '',
                        subtype: 'animation'
                    };
                } else if (assetIdOrName.startsWith('fx_')) {
                    const effectType = assetIdOrName.replace('fx_', '');
                    asset = {
                        id: assetIdOrName,
                        name: effectType.charAt(0).toUpperCase() + effectType.slice(1),
                        type: MediaType.EFFECT,
                        src: '',
                        subtype: 'filter'
                    };
                }
            }

            if (!asset) {
                throw new Error(`Asset not found: ${assetIdOrName}`);
            }

            const trackId = tracks[config.track - 1]?.id || tracks[0]?.id;
            if (!trackId) {
                throw new Error(`Track ${config.track} not found`);
            }

            const newClip: Clip = {
                id: crypto.randomUUID(),
                assetId: asset.id,
                trackId,
                start: config.start,
                duration: config.duration || 5,
                offset: 0,
                name: asset.name,
                type: asset.type,
                src: asset.src,
                scale: config.scale || 1,
                opacity: config.opacity || 1,
                x: config.x || 0,
                y: config.y || 0,
                rotation: 0,
                effects: [],
                animationDuration: 0.5
            };

            // Set animation type for virtual animation clips
            if (asset.type === MediaType.ANIMATION) {
                newClip.animationType = asset.id.replace('anim_', '') as any;
            }
            // Set shape type for virtual shape clips
            if (asset.type === MediaType.SHAPE) {
                newClip.shapeType = asset.id.replace('shape_', '') as any;
                newClip.fillColor = '#3b82f6';
                newClip.strokeColor = '#ffffff';
                newClip.strokeWidth = 2;
            }
            // Apply text properties for text clips
            if (asset.type === MediaType.TEXT && (asset as any).textProps) {
                const textProps = (asset as any).textProps;
                newClip.text = textProps.text;
                newClip.fontSize = textProps.fontSize;
                newClip.fontColor = textProps.fontColor;
                newClip.fontFamily = textProps.fontFamily;
                newClip.isBold = textProps.isBold;
                newClip.backgroundColor = textProps.backgroundColor;
                newClip.borderRadius = textProps.borderRadius;
                newClip.padding = textProps.padding;
            }

            onAddClip(newClip);
            return { id: newClip.id };
        },

        removeClip: (id: string) => {
            onRemoveClip(id);
        },

        updateClip: (id: string, updates: Partial<Clip>) => {
            onUpdateClip(id, updates);
        },

        getClip: (id: string) => {
            return clips.find(c => c.id === id);
        },

        addEffect: (clipId: string, effect: Partial<Effect>) => {
            const clip = clips.find(c => c.id === clipId);
            if (!clip) {
                throw new Error(`Clip not found: ${clipId}`);
            }

            const newEffect: Effect = {
                id: crypto.randomUUID(),
                name: effect.name || 'effect',
                type: 'filter',
                value: effect.value || '',
                ...effect
            };

            onUpdateClip(clipId, {
                effects: [...(clip.effects || []), newEffect]
            });
        },

        addTextAsset: (text: string, options = {}) => {
            const asset: Asset = {
                id: crypto.randomUUID(),
                type: MediaType.TEXT,
                src: '', // Text assets don't need a source file
                name: text.substring(0, 30) || 'Text'
            };

            // Store text properties that will be used when creating clips
            (asset as any).textProps = {
                text,
                fontSize: options.fontSize || 48,
                fontColor: options.fontColor || '#ffffff',
                fontFamily: options.fontFamily || 'Arial',
                isBold: options.isBold || false,
                backgroundColor: options.backgroundColor,
                borderRadius: options.borderRadius || 0,
                padding: options.padding || 10
            };

            // Add to runtime cache FIRST (fixes race condition)
            runtimeAssets.push(asset);

            // Then notify React state
            onAddAsset(asset);
            return asset;
        },

        addTransition: (clipId: string, type: 'in' | 'out', transition: AnimationType, duration = 1) => {
            const clip = clips.find(c => c.id === clipId);
            if (!clip) {
                throw new Error(`Clip not found: ${clipId}`);
            }

            const updates: Partial<Clip> = {};
            if (type === 'in') {
                updates.animationIn = transition;
                updates.animationInDuration = duration;
                updates.animationInEasing = 'ease-in-out';
            } else {
                updates.animationOut = transition;
                updates.animationOutDuration = duration;
                updates.animationOutEasing = 'ease-in-out';
            }

            onUpdateClip(clipId, updates);
        },

        addAssetFromUrl: async (url: string, name?: string) => {
            let response: Response;

            try {
                response = await fetch(url, { mode: "cors" });
            } catch {
                throw new Error("Download failed: Network or CORS error");
            }

            if (!response.ok) {
                throw new Error(`Download failed: HTTP ${response.status}`);
            }

            const blob = await response.blob();

            // 🚨 CRITICAL: CORS-blocked responses often return 0-byte blobs
            if (!blob || blob.size === 0) {
                throw new Error("Download failed: Empty response (likely CORS blocked)");
            }

            // Extra safety: verify it's actually an image/video
            if (!blob.type.startsWith("image/") && !blob.type.startsWith("video/")) {
                throw new Error(`Download failed: Unsupported MIME type ${blob.type}`);
            }

            const objectUrl = URL.createObjectURL(blob);

            const type = blob.type.startsWith("video/")
                ? MediaType.VIDEO
                : MediaType.IMAGE;

            const asset: Asset = {
                id: crypto.randomUUID(),
                type,
                src: objectUrl,
                name: name || url.split("/").pop() || "Downloaded Asset",
            };

            runtimeAssets.push(asset);
            onAddAsset(asset);
            return asset;
        },


        ai: {
            generateImage: async (prompt: string) => {
                const imageUrl = await generateImageAsset(prompt);

                const asset: Asset = {
                    id: crypto.randomUUID(),
                    type: MediaType.IMAGE,
                    src: imageUrl,
                    name: prompt.slice(0, 30)
                };

                onAddAsset(asset);
                return asset;
            }
        },

        registerTransition: (config: TransitionConfig) => {
            if (!config.id || !config.name) {
                throw new Error('Transition must have id and name');
            }

            const transition: Transition = {
                id: config.id,
                name: config.name,
                description: config.description || `Rotates from ${config.fromDegree}° to ${config.toDegree}°`,
                variables: [
                    {
                        name: 'From Degree',
                        key: 'fromDegree',
                        type: 'number',
                        defaultValue: config.fromDegree,
                        min: 0,
                        max: 360
                    },
                    {
                        name: 'To Degree',
                        key: 'toDegree',
                        type: 'number',
                        defaultValue: config.toDegree,
                        min: 0,
                        max: 360
                    }
                ],
                apply: (context: TransitionContext): TransitionResult => {
                    const { progress, isExit, params } = context;
                    const fromDeg = params.fromDegree ?? config.fromDegree;
                    const toDeg = params.toDegree ?? config.toDegree;

                    let rotation: number;
                    if (isExit) {
                        // Exit: animate from toDegree back to fromDegree
                        rotation = toDeg + (fromDeg - toDeg) * progress;
                    } else {
                        // Enter: animate from fromDegree to toDegree
                        rotation = fromDeg + (toDeg - fromDeg) * progress;
                    }

                    return { rotation };
                }
            };

            registerTransitionInRegistry(transition);
            onDisplay(`✓ Registered transition: ${config.name}`);
        },

        display: (content: any) => {
            onDisplay(content);
        }
    };

    return context;
};
