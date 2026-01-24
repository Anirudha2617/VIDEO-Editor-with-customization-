import { Asset, Clip, Track, MediaType, Effect } from '../types';
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

    // Effect operations
    addEffect: (clipId: string, effect: Partial<Effect>) => void;

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

    // Helper to resolve asset ID from name or ID
    const resolveAssetId = (nameOrId: string): string => {
        return assetMap[nameOrId] || nameOrId;
    };

    const context: ScriptExecutionContext = {
        assets: assetMap,

        addClip: (assetIdOrName: string, config: ClipConfig) => {
            let assetId = resolveAssetId(assetIdOrName);
            let asset = assets.find(a => a.id === assetId);

            // If not found by ID/Map, try finding by Name directly
            if (!asset) {
                asset = assets.find(a => a.name === assetIdOrName);
            }

            // Handle Virtual Assets (Animation/Shape) if still not found
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

        addAssetFromUrl: async (url: string, name?: string) => {
            const response = await fetch(url);
            const blob = await response.blob();
            const objectUrl = URL.createObjectURL(blob);

            const type = blob.type.startsWith('image/') ? MediaType.IMAGE :
                blob.type.startsWith('video/') ? MediaType.VIDEO :
                    MediaType.IMAGE;

            const asset: Asset = {
                id: crypto.randomUUID(),
                type,
                src: objectUrl,
                name: name || url.split('/').pop() || 'Downloaded Asset'
            };

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
