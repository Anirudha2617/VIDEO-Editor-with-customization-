import React, { useState, useCallback } from 'react';
import { Asset, MediaType } from '../models/Asset'; // Use new Model
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
            // Track names to handle duplicates within the same batch upload
            const currentNames = assets.map(a => a.name);

            for (const file of files) {
                // Use Engine for logic
                const type = MediaLibraryEngine.detectMediaType(file);
                const src = MediaLibraryEngine.createBlobUrl(file);
                const metadata = await MediaLibraryEngine.getMediaMetadata(file, type);

                const uniqueName = MediaLibraryEngine.getUniqueName(file.name, currentNames);
                currentNames.push(uniqueName); // Add to local list for next iteration checks

                let asset: Asset;
                const common = {
                    id: crypto.randomUUID(),
                    src,
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
