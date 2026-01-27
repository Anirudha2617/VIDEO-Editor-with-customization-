import { Clip, Track, Asset, MediaType } from '../../types';

export interface ParseResult {
    clips: Clip[];
    error?: string;
}

export class CommandPlanner {
    static generateScript(tracks: Track[], clips: Clip[], assets: Asset[]): string {
        let script = '# Lumina Timeline Script\n\n';

        // Helper to find asset name
        const getAssetName = (id: string) => assets.find(a => a.id === id)?.name || id;
        const getTrackIndex = (id: string) => tracks.findIndex(t => t.id === id) + 1;

        // Sort clips by start time
        const sortedClips = [...clips].sort((a, b) => a.start - b.start);

        sortedClips.forEach(clip => {
            const assetName = getAssetName(clip.assetId);
            const trackIdx = getTrackIndex(clip.trackId);

            script += `clip "${assetName}" track:${trackIdx} start:${clip.start.toFixed(2)}s duration:${clip.duration.toFixed(2)}s\n`;

            // Properties
            if (clip.x || clip.y) script += `  set position: ${clip.x || 0}, ${clip.y || 0}\n`;
            if (clip.scale !== undefined && clip.scale !== 1) script += `  set scale: ${clip.scale}\n`;
            if (clip.opacity !== undefined && clip.opacity !== 1) script += `  set opacity: ${clip.opacity}\n`;
            if (clip.rotation) script += `  set rotation: ${clip.rotation}\n`;

            // Text specific
            if (clip.type === MediaType.TEXT) {
                if (clip.text) script += `  set text: "${clip.text}"\n`;
                if (clip.fontSize) script += `  set fontSize: ${clip.fontSize}\n`;
                if (clip.fontColor) script += `  set color: ${clip.fontColor}\n`;
            }

            // Animation In
            if (clip.animationIn) {
                script += `  animate in: ${clip.animationIn} duration:${clip.animationDuration}s\n`;
            }

            // Animation Out
            if (clip.animationOut) {
                script += `  animate out: ${clip.animationOut} duration:${clip.animationDuration}s\n`;
            }

            script += '\n';
        });

        return script;
    }

    static parseScript(script: string, currentAssets: Asset[], currentTracks: Track[]): ParseResult {
        const lines = script.split('\n');
        const newClips: Clip[] = [];
        let currentClip: Partial<Clip> | null = null;

        // Track mapping (1-based index -> ID)
        const getTrackId = (idx: number) => currentTracks[idx - 1]?.id || currentTracks[0]?.id || 't1';
        // Asset mapping (Name -> ID)
        // We'll try to find exact match first, then case-insensitive
        const findAsset = (name: string) => {
            const cleanName = name.replace(/"/g, '');
            return currentAssets.find(a => a.name === cleanName) ||
                currentAssets.find(a => a.name.toLowerCase() === cleanName.toLowerCase());
        };

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line || line.startsWith('#')) continue;

            // PARSE CLIP DEFINITION
            // clip "Name" track:1 start:0s duration:5s
            if (line.startsWith('clip ')) {
                if (currentClip) {
                    // validate and push previous
                    if (currentClip.assetId && currentClip.trackId) {
                        newClips.push(currentClip as Clip);
                    }
                }

                const nameMatch = line.match(/clip\s+"([^"]+)"/);
                const trackMatch = line.match(/track:(\d+)/);
                const startMatch = line.match(/start:([\d.]+)s?/);
                const durMatch = line.match(/duration:([\d.]+)s?/);

                if (nameMatch) {
                    const asset = findAsset(nameMatch[1]);
                    const trackId = trackMatch ? getTrackId(parseInt(trackMatch[1])) : getTrackId(1);
                    const start = startMatch ? parseFloat(startMatch[1]) : 0;
                    const duration = durMatch ? parseFloat(durMatch[1]) : 5;

                    if (asset) {
                        currentClip = {
                            id: crypto.randomUUID(),
                            assetId: asset.id,
                            trackId: trackId,
                            start,
                            duration,
                            offset: 0,
                            name: asset.name,
                            type: asset.type,
                            src: asset.src,
                            effects: [],
                            animationDuration: 0.5,
                            // Default visuals
                            scale: 1,
                            opacity: 1,
                            rotation: 0,
                            x: 0,
                            y: 0
                        };
                    } else {
                        // Placeholder if asset not found? Or skip?
                        // For now we skip but maybe we should error?
                        console.warn(`Asset not found: ${nameMatch[1]}`);
                        currentClip = null;
                    }
                }
            }
            // PARSE PROPERTIES
            else if (currentClip && line.startsWith('set ')) {
                // set property: value
                const parts = line.substring(4).split(':');
                if (parts.length >= 2) {
                    const prop = parts[0].trim();
                    const val = parts.slice(1).join(':').trim(); // join back in case value has :

                    if (prop === 'scale') currentClip.scale = parseFloat(val);
                    else if (prop === 'opacity') currentClip.opacity = parseFloat(val);
                    else if (prop === 'rotation') currentClip.rotation = parseFloat(val);
                    else if (prop === 'text') currentClip.text = val.replace(/"/g, '');
                    else if (prop === 'fontSize') currentClip.fontSize = parseFloat(val);
                    else if (prop === 'color') currentClip.fontColor = val;
                    else if (prop === 'position') {
                        const [x, y] = val.split(',').map(n => parseFloat(n));
                        currentClip.x = x;
                        currentClip.y = y;
                    }
                }
            }
            // PARSE ANIMATION
            else if (currentClip && line.startsWith('animate ')) {
                // animate in: fade duration:1s
                const typeMatch = line.match(/animate\s+(in|out):\s*(\w+)/);
                const durMatch = line.match(/duration:([\d.]+)s?/);

                if (typeMatch) {
                    const direction = typeMatch[1]; // in or out
                    const type = typeMatch[2]; // fade, wipe, etc
                    const duration = durMatch ? parseFloat(durMatch[1]) : 1;

                    if (direction === 'in') {
                        (currentClip as any).animationIn = type;
                        currentClip.animationDuration = duration;
                    } else {
                        (currentClip as any).animationOut = type;
                    }
                }
            }
        }

        // Push last one
        if (currentClip && currentClip.assetId) {
            newClips.push(currentClip as Clip);
        }

        return { clips: newClips };
    }
}
