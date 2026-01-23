import React from 'react';
import { Asset, MediaType } from '../../types';
import { Upload, Music, Image as ImageIcon, Video } from 'lucide-react';
import StockMediaBrowser from '../StockMediaBrowser';

interface MediaPanelProps {
    assets: Asset[];
    onAddAsset: (asset: Asset) => void;
    onDragStart: (e: React.DragEvent, item: any, type: string) => void;
}

const MediaPanel: React.FC<MediaPanelProps> = ({ assets, onAddAsset, onDragStart }) => {
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

    return (
        <div className="h-full overflow-y-auto p-4 custom-scrollbar bg-[#18181b]">
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
                                <span className="text-[10px] text-gray-400 truncate block px-1">{asset.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MediaPanel;
