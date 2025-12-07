import { CodeAsset } from './codeAssetService';

const STORAGE_KEY = 'lumina_code_assets';

/**
 * Saves a code asset to localStorage
 */
export function saveCodeAsset(asset: CodeAsset): void {
    const saved = getCodeAssets();
    const existingIndex = saved.findIndex(a => a.id === asset.id);

    if (existingIndex >= 0) {
        saved[existingIndex] = asset;
    } else {
        saved.push(asset);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
}

/**
 * Retrieves all saved code assets
 */
export function getCodeAssets(): CodeAsset[] {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error('Failed to load code assets:', error);
        return [];
    }
}

/**
 * Deletes a code asset
 */
export function deleteCodeAsset(id: string): void {
    const saved = getCodeAssets().filter(a => a.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
}

/**
 * Updates a code asset
 */
export function updateCodeAsset(id: string, updates: Partial<CodeAsset>): void {
    const saved = getCodeAssets().map(a =>
        a.id === id ? { ...a, ...updates } : a
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
}

/**
 * Gets a single code asset by ID
 */
export function getCodeAssetById(id: string): CodeAsset | undefined {
    return getCodeAssets().find(a => a.id === id);
}
