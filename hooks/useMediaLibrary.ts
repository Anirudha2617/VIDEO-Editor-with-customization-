import React, { useState, useCallback } from 'react';
import { Asset } from '../models/Asset'; // Use new Model
import { MediaLibraryEngine } from '../engines/media/MediaLibraryEngine'; // Use new Engine

interface UseMediaLibraryReturn {
    assets: Asset[];
    isProcessing: boolean;
    importFiles: (files: File[]) => Promise<void>;
    removeAsset: (id: string) => void;
    updateAsset: (id: string, updates: Partial<Asset>) => void;
    setAssets: React.Dispatch<React.SetStateAction<Asset[]>>;
}

export const useMediaLibrary = (
    initialAssets: Asset[] = [],
    onAssetsChange?: (assets: Asset[]) => void
): UseMediaLibraryReturn => {
    const [assets, setAssetsInternal] = useState<Asset[]>(initialAssets);
    const [isProcessing, setIsProcessing] = useState(false);

    // Wrapper to sync with parent if needed
    const setAssets = useCallback((newAssetsOrUpdater: React.SetStateAction<Asset[]>) => {
        setAssetsInternal((prev) => {
            const next = typeof newAssetsOrUpdater === 'function'
                ? (newAssetsOrUpdater as any)(prev)
                : newAssetsOrUpdater;

            if (onAssetsChange) {
                setTimeout(() => onAssetsChange(next), 0);
            }
            return next;
        });
    }, [onAssetsChange]);

    const importFiles = useCallback(async (files: File[]) => {
        setIsProcessing(true);
        const newAssets: Asset[] = [];

        try {
            for (const file of files) {
                // Use Engine for logic
                const type = MediaLibraryEngine.detectMediaType(file);
                const src = MediaLibraryEngine.createBlobUrl(file);
                const metadata = await MediaLibraryEngine.getMediaMetadata(file, type);

                const asset: Asset = {
                    id: crypto.randomUUID(),
                    type,
                    src,
                    name: file.name,
                    // We can eventually store width/height in Asset interface
                };

                newAssets.push(asset);
            }

            setAssets(prev => [...prev, ...newAssets]);

        } catch (error) {
            console.error("MediaLibrary Error:", error);
        } finally {
            setIsProcessing(false);
        }
    }, [setAssets]);

    const removeAsset = useCallback((id: string) => {
        setAssets(prev => {
            const assetToRemove = prev.find(a => a.id === id);
            if (assetToRemove) {
                // Use Engine for cleanup
                MediaLibraryEngine.revokeMediaUrl(assetToRemove.src);
            }
            return prev.filter(a => a.id !== id);
        });
    }, [setAssets]);

    const updateAsset = useCallback((id: string, updates: Partial<Asset>) => {
        setAssets(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
    }, [setAssets]);

    return {
        assets,
        isProcessing,
        importFiles,
        removeAsset,
        updateAsset,
        setAssets
    };
};
