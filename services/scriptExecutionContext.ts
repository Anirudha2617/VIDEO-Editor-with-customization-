import { Asset, Clip, Track, MediaType, Effect, AnimationType, Transition, TransitionContext, TransitionResult } from '../models';
import { registerTransition } from '../transitions/registry';
import { registerEffect } from '../effects/registry';
import { EffectDefinition } from '../models/Effect';
import { MediaPipeline } from '../pipelines/media';
import { TimelinePipeline } from '../pipelines/timeline';
import { ProjectPipeline } from '../pipelines/project';
import { LibraryPipeline } from '../pipelines/library';


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
    assets: Record<string, Asset>;

    // Timeline operations
    addClip: (assetIdOrName: string, config: ClipConfig) => { id: string };
    addRawClip: (clip: Clip) => { id: string };
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

    // Selected Clips
    selectedClipIds: string[];

    // Unified Library Access
    libraryPipeline: LibraryPipeline;

    // Custom transition registration
    registerTransition: (config: TransitionConfig | Transition) => void;
    registerEffect: (config: EffectDefinition) => void;

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

    onDisplay: (content: any) => void,
    libraryPipeline: LibraryPipeline, // New dependency
    selectedClipIds: string[] = []
): ScriptExecutionContext => {

    // Runtime cache for clips created DURING this script execution
    const runtimeClips: Clip[] = [];

    const findClip = (id: string): Clip | undefined => {
        return clips.find(c => c.id === id) || runtimeClips.find(c => c.id === id);
    };

    // Create asset name map
    const assetMap: Record<string, Asset> = {}; // Changed to Asset object for better utility
    mediaPipeline.getAll().forEach(asset => {
        const safeName = asset.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
        assetMap[safeName] = asset;
        assetMap[asset.id] = asset; // Also map ID
    });

    const context: ScriptExecutionContext = {
        assets: assetMap,
        selectedClipIds,
        libraryPipeline,

        addClip: (assetIdOrName: string, config: ClipConfig) => {
            // Find asset using our enhanced map or fallback to pipeline
            let asset = assetMap[assetIdOrName.toLowerCase()] || assetMap[assetIdOrName];

            if (!asset) {
                // Try finding by raw ID or name in pipeline if map failed
                asset = mediaPipeline.getById(assetIdOrName) || mediaPipeline.getByName(assetIdOrName);
            }

            // Handle Virtual Assets (Animation/Shape/Effect)
            if (!asset) {
                if (assetIdOrName.startsWith('anim_')) {
                    const animType = assetIdOrName.replace('anim_', '');
                    asset = {
                        id: assetIdOrName,
                        name: animType.charAt(0).toUpperCase() + animType.slice(1),
                        type: MediaType.ANIMATION,
                        src: '',
                        subtype: 'animation'
                    } as Asset;
                } else if (assetIdOrName.startsWith('shape_')) {
                    const shapeType = assetIdOrName.replace('shape_', '');
                    asset = {
                        id: assetIdOrName,
                        name: shapeType.charAt(0).toUpperCase() + shapeType.slice(1),
                        type: MediaType.SHAPE,
                        src: '',
                        subtype: 'animation'
                    } as Asset;
                } else if (assetIdOrName.startsWith('fx_')) {
                    const effectType = assetIdOrName.replace('fx_', '');
                    asset = {
                        id: assetIdOrName,
                        name: effectType.charAt(0).toUpperCase() + effectType.slice(1),
                        type: MediaType.EFFECT,
                        src: '',
                        subtype: 'filter'
                    } as Asset;
                }
            }

            if (!asset) {
                throw new Error(`Asset not found: ${assetIdOrName}`);
            }

            const trackId = config.track ? (typeof config.track === 'string' ? config.track : `t${config.track}`) : 't1';

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

            runtimeClips.push(newClip); // Add to local cache
            onAddClip(newClip);
            return { id: newClip.id };
        },
        removeClip: (id: string) => {
            onRemoveClip(id);
            const idx = runtimeClips.findIndex(c => c.id === id);
            if (idx !== -1) runtimeClips.splice(idx, 1);
        },
        updateClip: (id: string, updates: Partial<Clip>) => {
            onUpdateClip(id, updates);
            // Update local cache if exists
            const localClip = runtimeClips.find(c => c.id === id);
            if (localClip) {
                Object.assign(localClip, updates);
            }
        },
        getClip: (id: string) => findClip(id),

        addTextAsset: (text, options) => mediaPipeline.addText(text, options),

        addEffect: (clipId, effect) => {
            const clip = findClip(clipId);
            if (clip) {
                const newEffect = {
                    id: crypto.randomUUID(),
                    name: 'Effect', // Prevent crash in renderer
                    kind: 'custom',
                    ...effect
                } as Effect;
                const newEffects = [...(clip.effects || []), newEffect];

                onUpdateClip(clipId, { effects: newEffects });

                // Update local cache
                if (runtimeClips.includes(clip)) {
                    clip.effects = newEffects;
                }
            }
        },

        addTransition: (clipId, type, transition, duration) => {
            const clip = findClip(clipId);
            if (clip) {
                const updates: Partial<Clip> = {};
                if (type === 'in') {
                    updates.animationIn = transition;
                    if (duration) updates.animationDuration = duration;
                } else {
                    updates.animationOut = transition;
                    // Note: Clip model might need animationOutDuration if different,
                    // but usually animationDuration is shared or specific to 'in'.
                    // For now assuming shared or 'animationDuration' applies.
                }
                onUpdateClip(clipId, updates);

                // Update local cache
                if (runtimeClips.includes(clip)) {
                    Object.assign(clip, updates);
                }

                onDisplay(`Added ${type}-transition '${transition}' to ${clip.name}`);
            }
        },

        addRawClip: (clip: Clip) => {
            runtimeClips.push(clip);
            onAddClip(clip);
            return { id: clip.id };
        },

        addAssetFromUrl: (url, name) => mediaPipeline.addFromUrl(url, name),

        ai: {
            generateImage: (prompt) => mediaPipeline.ai.generateImage(prompt)
        },

        registerTransition: (config: TransitionConfig | Transition) => {
            let transition: Transition;

            // Check if it's a full Transition object (has apply function)
            if ('apply' in config && typeof config.apply === 'function') {
                transition = config as Transition;
            } else {
                // Legacy Config Pattern (Rotation only)
                const c = config as TransitionConfig;
                if (!c.id || !c.name) {
                    throw new Error('Transition must have id and name');
                }
                transition = {
                    id: c.id,
                    name: c.name,
                    description: c.description || `Rotates from ${c.fromDegree}° to ${c.toDegree}°`,
                    variables: [
                        { name: 'From Degree', key: 'fromDegree', type: 'number', defaultValue: c.fromDegree, min: 0, max: 360 },
                        { name: 'To Degree', key: 'toDegree', type: 'number', defaultValue: c.toDegree, min: 0, max: 360 }
                    ],
                    apply: (context: TransitionContext): TransitionResult => {
                        const { progress, isExit, params } = context;
                        const fromDeg = params.fromDegree ?? c.fromDegree;
                        const toDeg = params.toDegree ?? c.toDegree;
                        return {
                            rotation: isExit ? toDeg + (fromDeg - toDeg) * progress : fromDeg + (toDeg - fromDeg) * progress
                        };
                    }
                };
            }

            registerTransition(transition);
            registerTransition(transition);
            onDisplay(`✓ Registered transition: ${transition.name} `);
        },
        registerEffect: (config: EffectDefinition) => {
            registerEffect(config);
            onDisplay(`✓ Registered effect: ${config.name}`);
        },
        display: (content: any) => {
            onDisplay(content);
        }
    };

    return context;
};
