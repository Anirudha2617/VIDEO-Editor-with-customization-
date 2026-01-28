
import { Project, Asset, MediaType } from '../models';

/**
 * Converts a Blob to a Base64 string.
 */
const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            // Remove data URL prefix (e.g., "data:image/png;base64,") if present, 
            // but actually keeping it makes it easier to use directly. 
            // However, for pure storage efficiency we might want to split, but let's keep full Data URL for simplicity.
            resolve(base64String);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

/**
 * Converts a Base64 Data URL back to a Blob.
 */
const base64ToBlob = async (dataUrl: string): Promise<Blob> => {
    const res = await fetch(dataUrl);
    return await res.blob();
};

/**
 * Serializes an asset by converting blob URLs to embedded Base64 data.
 */
/**
 * Serializes an asset by converting blob URLs AND external URLs to embedded Base64 data.
 */
const serializeAsset = async (asset: Asset): Promise<Asset> => {
    // 1. Local Blob URLs
    if (asset.src.startsWith('blob:')) {
        try {
            const response = await fetch(asset.src);
            const blob = await response.blob();
            const base64 = await blobToBase64(blob);
            return { ...asset, src: base64 };
        } catch (e) {
            console.warn(`[Persistence] Failed to serialize blob asset ${asset.id}:`, e);
            return asset;
        }
    }

    // 2. External HTTP/HTTPS URLs (freeze dynamic assets like Picsum)
    if (asset.src.startsWith('http://') || asset.src.startsWith('https://')) {
        try {
            // Attempt to fetch the external resource
            const response = await fetch(asset.src, { mode: 'cors' }); // Ensure CORS
            if (!response.ok) throw new Error(`Fetch failed: ${response.statusText}`);

            const blob = await response.blob();
            const base64 = await blobToBase64(blob);
            return { ...asset, src: base64 };
        } catch (e) {
            // If CORS fails or fetch errors, fallback to original URL (better than losing it)
            // But warn the user/console.
            console.warn(`[Persistence] Could not embed external asset ${asset.id} (${asset.src}). It may strictly enforce CORS or be unreachable. Saving as reference URL instead.`, e);
            return asset;
        }
    }

    // 3. Already Data URL or other
    return asset;
};

/**
 * Deserializes an asset by converting data URLs back to blob URLs for better performance.
 * (Browser handles blob: URLs better than massive data: URLs for video tags)
 */
const deserializeAsset = async (asset: Asset): Promise<Asset> => {
    if (asset.src.startsWith('data:')) {
        try {
            const blob = await base64ToBlob(asset.src);
            const newUrl = URL.createObjectURL(blob);
            return {
                ...asset,
                src: newUrl
            };
        } catch (e) {
            console.warn(`[Persistence] Failed to deserialize asset ${asset.id}:`, e);
            return asset;
        }
    }
    return asset;
};

export const saveProjectToFile = async (project: Project): Promise<void> => {
    // 1. Serialize Assets (Deep clone to avoid mutating active state)
    const serializedAssets = await Promise.all(project.state.assets.map(serializeAsset));

    // 2. Serialize Custom Fonts
    const serializedFonts = project.state.customFonts ? await Promise.all(project.state.customFonts.map(async (font) => {
        if (font.src.startsWith('blob:')) {
            try {
                const response = await fetch(font.src);
                const blob = await response.blob();
                const base64 = await blobToBase64(blob);
                return { ...font, src: base64 };
            } catch (e) { return font; }
        }
        return font;
    })) : [];

    const serializedProject: Project = {
        ...project,
        state: {
            ...project.state,
            assets: serializedAssets,
            customFonts: serializedFonts
        }
    };

    // 3. Create JSON Blob
    const fileContent = JSON.stringify(serializedProject, null, 2);
    const fileBlob = new Blob([fileContent], { type: 'application/json' });

    // 4. Trigger Download
    const url = URL.createObjectURL(fileBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name}-${new Date().toISOString().slice(0, 10)}.lumina`;
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 1000); // Longer timeout for safety
};

export const loadProjectFromFile = async (file: File): Promise<Project> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const content = e.target?.result as string;
                const rawProject = JSON.parse(content) as Project;

                // Validation
                if (!rawProject.state || !Array.isArray(rawProject.state.assets)) {
                    throw new Error('Invalid project structure');
                }

                // Deserialize Assets (Convert Data URLs back to Blob URLs)
                const deserializedAssets = await Promise.all(rawProject.state.assets.map(deserializeAsset));

                // Deserialize Fonts
                const deserializedFonts = rawProject.state.customFonts ? await Promise.all(rawProject.state.customFonts.map(async (font) => {
                    if (font.src.startsWith('data:')) {
                        try {
                            const blob = await base64ToBlob(font.src);
                            return { ...font, src: URL.createObjectURL(blob) };
                        } catch { return font; }
                    }
                    return font;
                })) : [];

                // Return Rehydrated Project
                resolve({
                    ...rawProject,
                    state: {
                        ...rawProject.state,
                        assets: deserializedAssets,
                        customFonts: deserializedFonts
                    }
                });

            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = reject;
        reader.readAsText(file);
    });
};
