import React, { useState } from 'react';
import { Asset, MediaType } from '../../types';
import { Upload, Music, Image as ImageIcon, Video, Edit2, FileEdit, Trash2 } from 'lucide-react';
import StockMediaBrowser from '../StockMediaBrowser';
import ImageEditor from '../ImageEditor';

// NOTE: We now rely on the parent (App -> useMediaLibrary) for the heavy lifting.
// MediaUtils import is removed.

interface MediaPanelProps {
    assets: Asset[];
    onAddAsset: (asset: Asset) => void;
    onImportFiles?: (files: File[]) => Promise<void>; // New Prop for bulk import
    onUpdateAsset?: (assetId: string, updates: Partial<Asset>) => void;
    onRemoveAsset?: (assetId: string) => void;
    onDragStart: (e: React.DragEvent, item: any, type: string) => void;
}

const MediaPanel: React.FC<MediaPanelProps> = ({
    assets,
    onAddAsset,
    onImportFiles,
    onUpdateAsset,
    onRemoveAsset,
    onDragStart
}) => {
    const [isProcessing, setIsProcessing] = useState(false);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        // If onImportFiles is provided (New Architecture), use it.
        if (onImportFiles) {
            setIsProcessing(true);
            try {
                // Convert FileList to Array
                await onImportFiles(Array.from(files));
            } catch (error) {
                console.error("Import failed:", error);
            } finally {
                setIsProcessing(false);
                e.target.value = '';
            }
            return;
        }

        // Fallback for Legacy (Should not be hit if App.tsx is updated)
        console.warn("MediaPanel: onImportFiles prop missing, upload disabled.");
        setIsProcessing(false);
    };

    const [editingAsset, setEditingAsset] = React.useState<Asset | null>(null);
    const [contextMenu, setContextMenu] = React.useState<{ x: number; y: number; asset: Asset } | null>(null);
    const [renamingAssetId, setRenamingAssetId] = React.useState<string | null>(null);
    const [renameValue, setRenameValue] = React.useState('');

    const handleContextMenu = (e: React.MouseEvent, asset: Asset) => {
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY, asset });
    };

    const handleEditImage = () => {
        if (contextMenu) {
            setEditingAsset(contextMenu.asset);
            setContextMenu(null);
        }
    };

    const handleDeleteAsset = (assetId: string) => {
        if (onRemoveAsset) {
            onRemoveAsset(assetId);
        }
        setContextMenu(null);
    };

    const handleSaveEditedImage = (newSrc: string) => {
        if (editingAsset) {
            const newAsset: Asset = {
                ...editingAsset,
                id: crypto.randomUUID(),
                name: `Edited - ${editingAsset.name}`,
                src: newSrc
            };
            onAddAsset(newAsset);
            setEditingAsset(null);
        }
    };

    const handleRenameStart = () => {
        if (contextMenu) {
            setRenamingAssetId(contextMenu.asset.id);
            setRenameValue(contextMenu.asset.name);
            setContextMenu(null);
        }
    };

    const handleRenameComplete = (assetId: string) => {
        if (renameValue.trim() && onUpdateAsset) {
            onUpdateAsset(assetId, { name: renameValue.trim() });
        }
        setRenamingAssetId(null);
        setRenameValue('');
    };

    const handleRenameKeyDown = (e: React.KeyboardEvent, assetId: string) => {
        if (e.key === 'Enter') {
            handleRenameComplete(assetId);
        } else if (e.key === 'Escape') {
            setRenamingAssetId(null);
            setRenameValue('');
        }
    };

    // Close context menu on click elsewhere
    React.useEffect(() => {
        const handleClick = () => setContextMenu(null);
        window.addEventListener('click', handleClick);
        return () => window.removeEventListener('click', handleClick);
    }, []);

    return (
        <div className="h-full overflow-y-auto p-4 custom-scrollbar bg-[#18181b] relative">
            {editingAsset && (
                <ImageEditor
                    src={editingAsset.src}
                    onSave={handleSaveEditedImage}
                    onCancel={() => setEditingAsset(null)}
                />
            )}

            {contextMenu && (
                <div
                    className="fixed z-[999999] bg-[#27272a] border border-[#3f3f46] rounded shadow-xl py-1 min-w-[140px]"
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                >
                    <button
                        onClick={(e) => { e.stopPropagation(); handleEditImage(); }}
                        className="w-full text-left px-3 py-1.5 text-xs text-gray-200 hover:bg-[#3f3f46] flex items-center gap-2"
                    >
                        <Edit2 size={12} /> Edit Image
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); handleRenameStart(); }}
                        className="w-full text-left px-3 py-1.5 text-xs text-gray-200 hover:bg-[#3f3f46] flex items-center gap-2"
                    >
                        <FileEdit size={12} /> Rename
                    </button>
                    {onRemoveAsset && (
                        <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteAsset(contextMenu.asset.id); }}
                            className="w-full text-left px-3 py-1.5 text-xs text-red-400 hover:bg-[#3f3f46] flex items-center gap-2"
                        >
                            <Trash2 size={12} /> Delete
                        </button>
                    )}
                </div>
            )}

            <div className="space-y-4">
                {/* Handle File Upload  */}
                <label className={`flex flex-col items-center justify-center w-full h-24 border border-dashed border-[#3f3f46] rounded-lg cursor-pointer hover:border-[#52525b] hover:bg-[#27272a] transition-colors ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}>
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        {isProcessing ? (
                            <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mb-1"></div>
                        ) : (
                            <Upload className="w-5 h-5 text-gray-400 mb-1" />
                        )}
                        <p className="text-[10px] text-gray-500">{isProcessing ? 'Processing...' : 'Upload Media'}</p>
                    </div>
                    <input type="file" className="hidden" onChange={handleFileUpload} accept="image/*,video/*,audio/*" multiple />
                </label>

                {/* Stock Media Browser */}
                <div className="mb-4">
                    <h3 className="text-xs font-medium text-gray-400 mb-2">Stock Images</h3>
                    <StockMediaBrowser onAddMedia={onAddAsset} />
                </div>

                {/* Uploaded Media */}
                <div>
                    <h3 className="text-xs font-medium text-gray-400 mb-2">Your Media</h3>
                    <div className="grid grid-cols-2 gap-2">
                        {assets.filter(a => [MediaType.VIDEO, MediaType.IMAGE, MediaType.AUDIO].includes(a.type)).map(asset => (
                            <div
                                key={asset.id}
                                draggable
                                onDragStart={(e) => onDragStart(e, asset, 'asset')}
                                onContextMenu={(e) => handleContextMenu(e, asset)}
                                className="bg-[#27272a] hover:bg-[#3f3f46] p-2 rounded cursor-grab active:cursor-grabbing border border-[#3f3f46] transition relative group"
                            >
                                {asset.type === MediaType.VIDEO && (
                                    <div className="relative w-full h-20 mb-1 bg-black rounded overflow-hidden">
                                        <video src={asset.src} className="w-full h-full object-cover" />
                                        <div className="absolute bottom-1 right-1 bg-black/70 px-1 rounded text-[8px] text-white">
                                            {/* We could display duration here if we stored it */}
                                            Video
                                        </div>
                                    </div>
                                )}
                                {asset.type === MediaType.AUDIO && (
                                    <div className="w-full h-20 flex items-center justify-center bg-[#111] rounded mb-1 relative">
                                        <Music className="w-6 h-6 text-pink-400" />
                                        <div className="absolute bottom-1 right-1 bg-black/70 px-1 rounded text-[8px] text-white">Audio</div>
                                    </div>
                                )}
                                {asset.type === MediaType.IMAGE && (
                                    <div className="relative w-full h-20 mb-1 bg-black rounded overflow-hidden">
                                        <img src={asset.src} alt={asset.name} className="w-full h-full object-cover" />
                                    </div>
                                )}
                                {renamingAssetId === asset.id ? (
                                    <input
                                        type="text"
                                        value={renameValue}
                                        onChange={(e) => setRenameValue(e.target.value)}
                                        onBlur={() => handleRenameComplete(asset.id)}
                                        onKeyDown={(e) => handleRenameKeyDown(e, asset.id)}
                                        className="text-[10px] bg-[#18181b] border border-blue-500 rounded px-1 py-0.5 text-white w-full outline-none"
                                        autoFocus
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                ) : (
                                    <span className="text-[10px] text-gray-400 truncate block px-1" title={asset.name}>{asset.name}</span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MediaPanel;
