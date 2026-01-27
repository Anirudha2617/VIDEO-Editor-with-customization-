import { Clip, MediaType } from '../../types';

export class TimelineEngine {
    static SIDEBAR_WIDTH = 200;
    static TRACK_HEIGHT = 64;
    static TRACK_PADDING_Y = 6;
    static CLIP_HEIGHT = 64 - 6 * 2;
    static SNAP_INTERVAL = 0.1;

    /**
     * Converts a screen X coordinate to timeline time (seconds).
     */
    static pixelToTime(x: number, zoom: number, scrollLeft: number, sidebarWidth: number = TimelineEngine.SIDEBAR_WIDTH): number {
        const relativeX = x + scrollLeft - sidebarWidth;
        return Math.max(0, relativeX / zoom);
    }

    /**
     * Converts time (seconds) to pixel position.
     */
    static timeToPixel(time: number, zoom: number): number {
        return time * zoom;
    }

    /**
     * Snaps a time value to the nearest interval.
     */
    static snapTime(time: number, snap: number = TimelineEngine.SNAP_INTERVAL): number {
        return Math.round(time / snap) * snap;
    }

    /**
     * Formats seconds into HH:MM:SS.ms based on zoom level.
     */
    static formatTime(seconds: number, zoom: number): string {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        const ms3 = Math.floor((seconds % 1) * 1000);

        if (zoom > 500) {
            return `${m}:${s.toString().padStart(2, '0')}.${ms3.toString().padStart(3, '0')}`;
        }
        return `${m}:${s.toString().padStart(2, '0')}.${ms3.toString().padStart(2, '0').slice(0, 2)}`;
    }

    /**
     * Determines which clips should be affected by a transform (move/resize).
     * Handles group selection logic.
     */
    static getTransformTargets(targetClip: Clip, allClips: Clip[], currentSelection: string[]): Clip[] {
        const targets: Clip[] = [];
        const processedIds = new Set<string>();

        // 1. Add the interacted clip
        targets.push(targetClip);
        processedIds.add(targetClip.id);

        // 2. If it's part of a group, add all group members
        if (targetClip.groupId) {
            allClips.forEach(c => {
                if (c.groupId === targetClip.groupId && !processedIds.has(c.id)) {
                    targets.push(c);
                    processedIds.add(c.id);
                }
            });
        }

        // 3. Add any other selected clips (and their groups)
        currentSelection.forEach(id => {
            if (!processedIds.has(id)) {
                const clip = allClips.find(c => c.id === id);
                if (clip) {
                    targets.push(clip);
                    processedIds.add(clip.id);

                    // Add group members of this selected clip
                    if (clip.groupId) {
                        allClips.forEach(g => {
                            if (g.groupId === clip.groupId && !processedIds.has(g.id)) {
                                targets.push(g);
                                processedIds.add(g.id);
                            }
                        });
                    }
                }
            }
        });

        return targets;
    }

    /**
     * Generates ruler ticks for rendering.
     * Returns an array of time markers.
     */
    static getRulerTicks(duration: number, zoom: number): { time: number; type: 'major' | 'minor' }[] {
        const ticks: { time: number; type: 'major' | 'minor' }[] = [];

        let labelInterval = 1;
        if (zoom >= 200) labelInterval = 0.5;
        else if (zoom >= 100) labelInterval = 1;
        else if (zoom >= 50) labelInterval = 2;
        else if (zoom >= 20) labelInterval = 5;
        else if (zoom >= 10) labelInterval = 10;
        else if (zoom >= 5) labelInterval = 15;
        else labelInterval = 30;

        let minorStep = labelInterval / 5;
        if (minorStep < 0.1) minorStep = 0.1;

        for (let i = 0; i <= duration; i += minorStep) {
            const time = Math.round(i * 100) / 100;
            const isLabel = Math.abs(time % labelInterval) < 0.01 || Math.abs(labelInterval - (time % labelInterval)) < 0.01;

            ticks.push({
                time,
                type: isLabel ? 'major' : 'minor'
            });
        }
        return ticks;
    }
}
