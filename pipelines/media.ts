import { Asset, MediaType } from '../models/Asset';
import { generateImageAsset, generateVideoAsset, generateAudioAsset, generateTTSAsset } from '../services/ai/GeminiProvider';
import { MediaLibraryEngine } from '../engines/media/MediaLibraryEngine';

/**
 * Interface definition for the Media Pipeline.
 * These are the functions exposed to the Scripting Environment and UI.
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
     * Add a fully formed asset directly.
     */
    addAsset: (asset: Asset) => void;

    /**
     * Add a new asset from a URL.
     */
    addFromUrl: (url: string, name?: string) => Promise<Asset>;

    /**
     * Remove an asset from the library.
     */
    remove: (id: string) => void;

    /**
     * Create and add a text asset.
     */
    addText: (text: string, options?: TextOptions) => Asset;

    /**
     * Add a local file asset.
     */
    addFile: (file: File) => Promise<Asset>;

    /**
     * AI Generation Tools
     */
    ai: {
        generateImage: (prompt: string) => Promise<Asset>;
        generateVideo: (prompt: string) => Promise<Asset>;
        generateAudio: (prompt: string, type: 'sfx' | 'music') => Promise<Asset>;
        generateTTS: (text: string, voice: string) => Promise<Asset>;
    };
}

export interface TextOptions {
    fontSize?: number;
    fontColor?: string;
    fontFamily?: string;
    isBold?: boolean;
    backgroundColor?: string;
    borderRadius?: number;
    padding?: number;
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

    const addToCacheAndState = (asset: Asset) => {
        runtimeAssetsCache.push(asset);
        onAddAsset(asset);
        return asset;
    };

    return {
        getAll: () => [...assets, ...runtimeAssetsCache],

        getById: (id: string) => helperFind(id),

        getByName: (name: string) => helperFind(name),

        rename: (id: string, newName: string) => {
            const asset = helperFind(id);
            if (asset) {
                if (asset.name === newName) return;

                // Unique Name Logic (excluding current asset from check is implicit as uniqueName logic handles "name" exists)
                // But wait, if I rename "A" to "B" and "B" exists, I want "B (1)".
                // If I rename "A" to "A", I returned early above.
                // So checking against ALL assets is safe.
                const existingNames = [...assets, ...runtimeAssetsCache].map(a => a.name);
                const uniqueName = MediaLibraryEngine.getUniqueName(newName, existingNames);

                onUpdateAsset(asset.id, { name: uniqueName });
            } else {
                console.warn(`[MediaPipeline] Asset not found for rename: ${id}`);
            }
        },

        addAsset: (asset: Asset) => {
            onAddAsset(asset);
        },

        remove: (id: string) => {
            const asset = helperFind(id);
            if (asset) {
                onRemoveAsset(asset.id);
            }
        },


        addFromUrl: async (url: string, name?: string) => {
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
            const type = blob.type.startsWith("video/") ? MediaType.VIDEO :
                blob.type.startsWith("audio/") ? MediaType.AUDIO :
                    MediaType.IMAGE;

            // Extract metadata
            const file = new File([blob], name || "downloaded", { type: blob.type });
            const metadata = await MediaLibraryEngine.getMediaMetadata(file, type);

            // Unique Name Logic
            const existingNames = [...assets, ...runtimeAssetsCache].map(a => a.name);
            const baseName = name || url.split("/").pop() || "Downloaded Asset";
            const uniqueName = MediaLibraryEngine.getUniqueName(baseName, existingNames);

            let asset: Asset;
            const common = {
                id: crypto.randomUUID(),
                src: objectUrl,
                name: uniqueName,
            };

            if (type === MediaType.VIDEO) {
                asset = {
                    ...common,
                    type: MediaType.VIDEO,
                    duration: metadata.duration || 0,
                    width: metadata.width || 0,
                    height: metadata.height || 0
                };
            } else if (type === MediaType.AUDIO) {
                asset = {
                    ...common,
                    type: MediaType.AUDIO,
                    duration: metadata.duration || 0
                };
            } else {
                asset = {
                    ...common,
                    type: MediaType.IMAGE,
                    width: metadata.width || 0,
                    height: metadata.height || 0
                };
            }

            return addToCacheAndState(asset);
        },

        addText: (text: string, options = {}) => {
            const existingNames = [...assets, ...runtimeAssetsCache].map(a => a.name);
            const baseName = text.substring(0, 30) || 'Text';
            const uniqueName = MediaLibraryEngine.getUniqueName(baseName, existingNames);

            const asset: Asset = {
                id: crypto.randomUUID(),
                type: MediaType.TEXT,
                src: '', // Text assets don't need a source file
                name: uniqueName
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

            return addToCacheAndState(asset);
        },

        addFile: async (file: File) => {
            const objectUrl = URL.createObjectURL(file);
            const type = MediaLibraryEngine.detectMediaType(file);
            const metadata = await MediaLibraryEngine.getMediaMetadata(file, type);

            // Unique Name Logic
            const existingNames = [...assets, ...runtimeAssetsCache].map(a => a.name);
            const uniqueName = MediaLibraryEngine.getUniqueName(file.name, existingNames);

            let asset: Asset;
            const common = {
                id: crypto.randomUUID(),
                src: objectUrl,
                name: uniqueName
            };

            if (type === MediaType.VIDEO) {
                asset = {
                    ...common,
                    type: MediaType.VIDEO,
                    duration: metadata.duration || 0,
                    width: metadata.width || 0,
                    height: metadata.height || 0
                };
            } else if (type === MediaType.AUDIO) {
                asset = {
                    ...common,
                    type: MediaType.AUDIO,
                    duration: metadata.duration || 0
                };
            } else {
                asset = {
                    ...common,
                    type: MediaType.IMAGE,
                    width: metadata.width || 0,
                    height: metadata.height || 0
                };
            }
            return addToCacheAndState(asset);
        },

        ai: {
            generateImage: async (prompt: string) => {
                const imageUrl = await generateImageAsset(prompt);
                const existingNames = [...assets, ...runtimeAssetsCache].map(a => a.name);
                const uniqueName = MediaLibraryEngine.getUniqueName(prompt.slice(0, 30) || 'AI Image', existingNames);

                const asset: Asset = {
                    id: crypto.randomUUID(),
                    type: MediaType.IMAGE,
                    src: imageUrl,
                    name: uniqueName,
                    width: 1024,
                    height: 1024
                };
                return addToCacheAndState(asset);
            },
            generateVideo: async (prompt: string) => {
                const videoUrl = await generateVideoAsset(prompt);
                const existingNames = [...assets, ...runtimeAssetsCache].map(a => a.name);
                const uniqueName = MediaLibraryEngine.getUniqueName(prompt.slice(0, 30) || 'AI Video', existingNames);

                const asset: Asset = {
                    id: crypto.randomUUID(),
                    type: MediaType.VIDEO,
                    src: videoUrl,
                    name: uniqueName,
                    duration: 5,
                    width: 1024,
                    height: 576
                };
                return addToCacheAndState(asset);
            },
            generateAudio: async (prompt: string, type: 'sfx' | 'music') => {
                const audioUrl = await generateAudioAsset(prompt, type);
                const existingNames = [...assets, ...runtimeAssetsCache].map(a => a.name);
                const uniqueName = MediaLibraryEngine.getUniqueName(prompt.slice(0, 30) || 'AI Audio', existingNames);

                const asset: Asset = {
                    id: crypto.randomUUID(),
                    type: MediaType.AUDIO,
                    src: audioUrl,
                    name: uniqueName,
                    duration: 5
                };
                return addToCacheAndState(asset);
            },
            generateTTS: async (text: string, voice: string) => {
                const audioUrl = await generateTTSAsset(text, voice);
                const existingNames = [...assets, ...runtimeAssetsCache].map(a => a.name);
                const uniqueName = MediaLibraryEngine.getUniqueName('TTS: ' + text.slice(0, 15), existingNames);

                const asset: Asset = {
                    id: crypto.randomUUID(),
                    type: MediaType.AUDIO,
                    src: audioUrl,
                    name: uniqueName,
                    duration: 5
                };
                return addToCacheAndState(asset);
            }
        }
    };
};
