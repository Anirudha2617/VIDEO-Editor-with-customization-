import React from 'react';
import { Asset, MediaType } from '../../types';
import { Upload, Music, Image as ImageIcon, Video, Edit2, FileEdit } from 'lucide-react';
import StockMediaBrowser from '../StockMediaBrowser';
import ImageEditor from '../ImageEditor';

interface MediaPanelProps {
    assets: Asset[];
    onAddAsset: (asset: Asset) => void;
    onUpdateAsset?: (assetId: string, updates: Partial<Asset>) => void;
    onDragStart: (e: React.DragEvent, item: any, type: string) => void;
}

const MediaPanel: React.FC<MediaPanelProps> = ({ assets, onAddAsset, onUpdateAsset, onDragStart }) => {
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const url = URL.createObjectURL(file);
        let type = MediaType.IMAGE;

        if (file.type.startsWith('video')) {
            type = MediaType.VIDEO;
        } else if (file.type.startsWith('audio')) {
            type = MediaType.AUDIO;
        } else if (file.type.startsWith('image')) {
            type = MediaType.IMAGE;
        }

        const newAsset: Asset = {
            id: crypto.randomUUID(),
            type,
            src: url,
            name: file.name,
        };
        onAddAsset(newAsset);
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
                </div>
            )}

            <div className="space-y-4">
                <label className="flex flex-col items-center justify-center w-full h-24 border border-dashed border-[#3f3f46] rounded-lg cursor-pointer hover:border-[#52525b] hover:bg-[#27272a] transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-5 h-5 text-gray-400 mb-1" />
                        <p className="text-[10px] text-gray-500">Upload Media</p>
                    </div>
                    <input type="file" className="hidden" onChange={handleFileUpload} accept="image/*,video/*,audio/*" />
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
                                    <video src={asset.src} className="w-full h-20 object-cover rounded mb-1 bg-black" />
                                )}
                                {asset.type === MediaType.AUDIO && (
                                    <div className="w-full h-20 flex items-center justify-center bg-[#111] rounded mb-1">
                                        <Music className="w-6 h-6 text-pink-400" />
                                    </div>
                                )}
                                {asset.type === MediaType.IMAGE && (
                                    <img src={asset.src} alt={asset.name} className="w-full h-20 object-cover rounded mb-1 bg-black" />
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
                                    <span className="text-[10px] text-gray-400 truncate block px-1">{asset.name}</span>
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
