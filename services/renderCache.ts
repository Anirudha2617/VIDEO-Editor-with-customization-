export class RenderCache {
    private cache: Map<string, ImageBitmap>;
    private maxCacheSize: number;

    constructor(maxCacheSize = 300) { // Default to ~300 frames (10s @ 30fps)
        this.cache = new Map();
        this.maxCacheSize = maxCacheSize;
    }

    // Generate a unique key for a frame based on its properties
    // "Dependency" is a rough hash of active clips/effects at that time
    private generateKey(time: number, dependencyHash: string): string {
        // Round time to nearest frame (assuming 30fps default for cache key stability)
        // For production, fps should be dynamic.
        const frameIndex = Math.floor(time * 30);
        return `${frameIndex}_${dependencyHash}`;
    }

    has(time: number, dependencyHash: string): boolean {
        return this.cache.has(this.generateKey(time, dependencyHash));
    }

    get(time: number, dependencyHash: string): ImageBitmap | undefined {
        return this.cache.get(this.generateKey(time, dependencyHash));
    }

    set(time: number, dependencyHash: string, bitmap: ImageBitmap) {
        // Evict oldest if full (simple LRU ish)
        if (this.cache.size >= this.maxCacheSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        this.cache.set(this.generateKey(time, dependencyHash), bitmap);
    }

    clear() {
        this.cache.clear();
    }

    // Invalidate a specific range (e.g., user edited a clip)
    // Since our keys are frame-based, we iterate and remove.
    // Note: This naive iteration is fine for 300 items. For 10,000 items, we need a better structure.
    invalidateRange(start: number, end: number) {
        const startFrame = Math.floor(start * 30);
        const endFrame = Math.ceil(end * 30);

        for (const key of this.cache.keys()) {
            const frameIndex = parseInt(key.split('_')[0]);
            if (frameIndex >= startFrame && frameIndex <= endFrame) {
                this.cache.delete(key);
            }
        }
    }
}

export const renderCache = new RenderCache();
