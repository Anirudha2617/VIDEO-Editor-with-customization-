import { Asset, Clip, Track, MediaType, Effect, AnimationType, Transition, TransitionContext, TransitionResult } from '../models';
import { registerTransition } from '../transitions/registry';
import { MediaPipeline } from '../pipelines/media';
import { TimelinePipeline } from '../pipelines/timeline';
import { ProjectPipeline } from '../pipelines/project';


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

    // Asset creation (Delegated to Media Pipeline)
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

    // External resources (Delegated to Media Pipeline)
    addAssetFromUrl: (url: string, name?: string) => Promise<Asset>;

    // AI operations (Delegated to Media Pipeline)
    ai: {
        generateImage: (prompt: string) => Promise<Asset>;
    };

    // Custom transition registration
    registerTransition: (config: TransitionConfig) => void;

    // Utility
    display: (content: any) => void;
}

export const createExecutionContext = (
    clips: Clip[],
    tracks: Track[],
    mediaPipeline: MediaPipeline,
    onAddClip: (clip: Clip) => void,
    onUpdateClip: (id: string, updates: Partial<Clip>) => void,
    onRemoveClip: (id: string) => void,
    onDisplay: (content: any) => void
): ScriptExecutionContext => {

    // Create asset name map
    const assetMap: Record<string, string> = {};
    mediaPipeline.getAll().forEach(asset => {
        const safeName = asset.name.replace(/[^a-zA-Z0-9]/g, '_');
        assetMap[safeName] = asset.id;
    });

    const context: ScriptExecutionContext = {
        assets: assetMap,

        addClip: (assetIdOrName: string, config: ClipConfig) => {
            // Use Media Pipeline to find asset
            let asset = mediaPipeline.getById(assetIdOrName) || mediaPipeline.getByName(assetIdOrName);

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
                throw new Error(`Asset not found: ${assetIdOrName} `);
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
                throw new Error(`Clip not found: ${clipId} `);
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
            return mediaPipeline.addText(text, options);
        },

        addTransition: (clipId: string, type: 'in' | 'out', transition: AnimationType, duration = 1) => {
            const clip = clips.find(c => c.id === clipId);
            if (!clip) {
                throw new Error(`Clip not found: ${clipId} `);
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
            return mediaPipeline.addFromUrl(url, name);
        },

        ai: {
            generateImage: async (prompt: string) => {
                return mediaPipeline.ai.generateImage(prompt);
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

            registerTransition(transition);
            onDisplay(`✓ Registered transition: ${config.name} `);
        },

        display: (content: any) => {
            onDisplay(content);
        }
    };

    return context;
};
