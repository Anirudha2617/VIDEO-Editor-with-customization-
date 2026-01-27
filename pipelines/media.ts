import { Asset, MediaType } from '../models/Asset';

/**
 * Interface definition for the Media Pipeline.
 * These are the functions exposed to the Scripting Environment.
 */
export interface MediaPipeline {
    /**
     * Get all assets in the library.
     */
    getAll: () => Asset[];

    /**
     * Get a specific asset by its ID.
     */
    getById: (id: string) => Asset | undefined;

    /**
     * Get a specific asset by its Name (fuzzy match).
     */
    getByName: (name: string) => Asset | undefined;

    /**
     * Rename an asset.
     */
    rename: (id: string, newName: string) => void;

    /**
     * Add a new asset from a URL.
     */
    addFromUrl: (url: string, name?: string) => Promise<Asset>;

    /**
     * Remove an asset from the library.
     */
    remove: (id: string) => void;
}

/**
 * Factory to create the Media Pipeline bound to the application state.
 */
export const createMediaPipeline = (
    assets: Asset[],
    onAddAsset: (asset: Asset) => void,
    onUpdateAsset: (id: string, updates: Partial<Asset>) => void,
    onRemoveAsset: (id: string) => void,
    runtimeAssetsCache: Asset[] = []
): MediaPipeline => {

    const helperFind = (idOrName: string): Asset | undefined => {
        return assets.find(a => a.id === idOrName) ||
            assets.find(a => a.name === idOrName) ||
            runtimeAssetsCache.find(a => a.id === idOrName || a.name === idOrName);
    };

    return {
        getAll: () => [...assets, ...runtimeAssetsCache],

        getById: (id: string) => helperFind(id),

        getByName: (name: string) => helperFind(name),

        rename: (id: string, newName: string) => {
            const asset = helperFind(id);
            if (asset) {
                onUpdateAsset(asset.id, { name: newName });
            } else {
                console.warn(`[MediaPipeline] Asset not found for rename: ${id}`);
            }
        },

        remove: (id: string) => {
            const asset = helperFind(id);
            if (asset) {
                onRemoveAsset(asset.id);
            }
        },

        addFromUrl: async (url: string, name?: string) => {
            // Logic moved from scriptExecutionContext or duplicated for now
            // Using simple fetch logic as placeholder or strictly coupled logic
            // Ideally we import the exact logic or reuse MediaLibraryEngine
            // But for now, we implement the core fetch as previously defined

            let response: Response;
            try {
                response = await fetch(url, { mode: "cors" });
            } catch {
                throw new Error("Download failed: Network or CORS error");
            }

            if (!response.ok) throw new Error(`Download failed: HTTP ${response.status}`);

            const blob = await response.blob();
            if (!blob || blob.size === 0) throw new Error("Download failed: Empty response");

            const objectUrl = URL.createObjectURL(blob);
            const type = blob.type.startsWith("video/") ? MediaType.VIDEO : MediaType.IMAGE;

            const asset: Asset = {
                id: crypto.randomUUID(),
                type,
                src: objectUrl,
                name: name || url.split("/").pop() || "Downloaded Asset",
            };

            onAddAsset(asset);
            return asset;
        }
    };
};
