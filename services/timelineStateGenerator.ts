import { Clip, Track, Asset } from '../types';

export interface TimelineState {
    clips: Array<{
        id: string;
        asset: string;
        track: number;
        start: number;
        duration: number;
        scale?: number;
        opacity?: number;
        x?: number;
        y?: number;
        rotation?: number;
        effects?: Array<{
            type: string;
            [key: string]: any;
        }>;
    }>;
}

export const generateTimelineState = (
    tracks: Track[],
    clips: Clip[],
    assets: Asset[]
): string => {
    // Create asset name map (ID -> safe name)
    const assetNames: Record<string, string> = {};
    assets.forEach(asset => {
        assetNames[asset.id] = asset.name.replace(/[^a-zA-Z0-9]/g, '_');
    });

    // Sort clips by Track index then Start time
    const sortedClips = [...clips].sort((a, b) => {
        const trackA = tracks.findIndex(t => t.id === a.trackId);
        const trackB = tracks.findIndex(t => t.id === b.trackId);
        if (trackA !== trackB) return trackA - trackB;
        return a.start - b.start;
    });

    let code = 'timeline = {\n  "clips": [\n';
    let currentTrackId = '';

    sortedClips.forEach((clip, index) => {
        const trackIndex = tracks.findIndex(t => t.id === clip.trackId) + 1;
        const assetName = assetNames[clip.assetId] || clip.assetId;

        // Grouping Comment
        if (clip.trackId !== currentTrackId) {
            const track = tracks.find(t => t.id === clip.trackId);
            const trackName = track ? track.name : `Track ${trackIndex}`;
            code += `\n    // === ${trackName} (Track ${trackIndex}) ===\n`;
            currentTrackId = clip.trackId;
        }

        const clipData: any = {
            id: clip.id,
            asset: assetName,
            track: trackIndex,
            start: parseFloat(clip.start.toFixed(2)),
            duration: parseFloat(clip.duration.toFixed(2))
        };

        // Add optional properties only if they differ from defaults
        if (clip.scale !== undefined && clip.scale !== 1) {
            clipData.scale = clip.scale;
        }
        if (clip.opacity !== undefined && clip.opacity !== 1) {
            clipData.opacity = clip.opacity;
        }
        if (clip.x !== undefined && clip.x !== 0) {
            clipData.x = clip.x;
        }
        if (clip.y !== undefined && clip.y !== 0) {
            clipData.y = clip.y;
        }
        if (clip.rotation !== undefined && clip.rotation !== 0) {
            clipData.rotation = clip.rotation;
        }
        if (clip.transitionParams && Object.keys(clip.transitionParams).length > 0) {
            clipData.transitionParams = clip.transitionParams;
        }

        // Add effects if any
        if (clip.effects && clip.effects.length > 0) {
            clipData.effects = clip.effects.map(e => ({
                type: e.name,
                value: e.value,
                ...e.effectParams
            }));
        }

        // Stringify and indent
        const json = JSON.stringify(clipData, null, 2).replace(/\n/g, '\n    ');
        code += `    ${json}${index < sortedClips.length - 1 ? ',' : ''}\n`;
    });

    code += '  ]\n};\n';
    return code;
};

export const parseTimelineState = (
    code: string,
    assets: Asset[],
    tracks: Track[]
): { clips: Clip[] } => {
    // Create reverse asset map (safe name -> ID)
    const assetIds: Record<string, string> = {};
    assets.forEach(asset => {
        const safeName = asset.name.replace(/[^a-zA-Z0-9]/g, '_');
        assetIds[safeName] = asset.id;
    });

    try {
        // Extract the timeline object
        const match = code.match(/timeline\s*=\s*({[\s\S]*});?/);
        if (!match) {
            throw new Error('Invalid timeline format');
        }

        // Strip comments before parsing
        const jsonContent = match[1].replace(/\/\/.*$/gm, '');
        const state = JSON.parse(jsonContent) as TimelineState;

        // Convert back to Clip objects
        const clips: Clip[] = state.clips.map(clipData => {
            const assetId = assetIds[clipData.asset] || clipData.asset;
            let asset = assets.find(a => a.id === assetId);
            const trackId = tracks[clipData.track - 1]?.id || tracks[0]?.id;

            // Handle virtual assets (Animations, Shapes) that aren't in the library
            if (!asset) {
                if (assetId.startsWith('anim_')) {
                    // Create virtual animation asset
                    asset = {
                        id: assetId,
                        name: clipData.asset,
                        type: 'animation' as any, // MediaType.ANIMATION
                        src: '',
                        subtype: 'animation'
                    };
                } else if (assetId.startsWith('shape_')) {
                    // Create virtual shape asset
                    asset = {
                        id: assetId,
                        name: clipData.asset,
                        type: 'shape' as any, // MediaType.SHAPE
                        src: '',
                        subtype: 'animation' // shapes are often handled via animation path or similar
                    };
                } else if (assetId.startsWith('fx_')) {
                    // Create virtual effect asset
                    asset = {
                        id: assetId,
                        name: clipData.asset,
                        type: 'effect' as any, // MediaType.EFFECT
                        src: '',
                        subtype: 'filter'
                    };
                } else if (clipData.asset.startsWith('anim_')) {
                    // Fallback if ID was passed directly as name
                    asset = {
                        id: clipData.asset,
                        name: clipData.asset,
                        type: 'animation' as any,
                        src: '',
                        subtype: 'animation'
                    };
                }
            }

            if (!asset) {
                // One last try - maybe it's a built-in shape or effect we missed
                if (['rectangle', 'circle', 'arrow', 'star'].includes(clipData.asset)) {
                    asset = {
                        id: crypto.randomUUID(),
                        name: clipData.asset,
                        type: 'shape' as any,
                        src: ''
                    };
                    // Update clipData shape type
                    (clipData as any).shapeType = clipData.asset;
                } else {
                    throw new Error(`Asset not found: ${clipData.asset}`);
                }
            }

            const clip: Clip = {
                id: clipData.id,
                assetId: asset.id,
                trackId,
                start: clipData.start,
                duration: clipData.duration,
                offset: 0,
                name: asset.name,
                type: asset.type,
                src: asset.src,
                scale: clipData.scale || 1,
                opacity: clipData.opacity || 1,
                x: clipData.x || 0,
                y: clipData.y || 0,
                rotation: clipData.rotation || 0,
                effects: clipData.effects?.map(e => ({
                    id: crypto.randomUUID(),
                    name: e.type,
                    type: 'filter',
                    value: e.value || '',
                    effectParams: e
                })) || [],
                animationDuration: 0.5
            };

            // Restore special properties if they exist in clipData
            if (asset.type === 'animation' as any) {
                clip.animationType = asset.id.replace('anim_', '') as any;
                // Try to restore params if they were saved in the JSON (not standard but possible)
                if ((clipData as any).transitionParams) {
                    clip.transitionParams = (clipData as any).transitionParams;
                }
            }

            return clip;
        });

        return { clips };
    } catch (e: any) {
        throw new Error(`Failed to parse timeline state: ${e.message}`);
    }
};
