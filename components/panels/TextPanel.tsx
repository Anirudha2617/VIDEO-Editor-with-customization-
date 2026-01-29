import React from 'react';
import { Asset, MediaType } from '../../models';
import { Type } from 'lucide-react';
import { LibraryPipeline } from '../../pipelines/library';

interface TextPanelProps {
    assets: Asset[];
    onDragStart: (e: React.DragEvent, item: any, type: string) => void;
    onAddText: (text: string, options?: any) => void;
    libraryPipeline?: LibraryPipeline;
}

const TextPanel: React.FC<TextPanelProps> = ({ assets, onDragStart, libraryPipeline }) => {
    const textPresets = libraryPipeline ? libraryPipeline.getItems('text') : [
        { id: 'txt_1', type: MediaType.TEXT, src: '', name: 'Basic Title' },
    ];

    return (
        <div className="h-full overflow-y-auto p-4 custom-scrollbar bg-[#18181b]">
            <div className="space-y-3">
                <p className="text-xs text-gray-500 mb-2">My Text Assets</p>
                {assets.filter(a => a.type === MediaType.TEXT).map(asset => (
                    <div
                        key={asset.id}
                        draggable
                        onDragStart={(e) => onDragStart(e, asset, 'asset')}
                        className="bg-[#27272a] hover:bg-[#3f3f46] p-2 rounded-md cursor-grab active:cursor-grabbing border border-[#3f3f46] flex items-center gap-3 transition-colors"
                    >
                        <Type className="w-4 h-4 text-blue-400" />
                        <span className="text-xs text-gray-200 truncate">{asset.name}</span>
                    </div>
                ))}

                <p className="text-xs text-gray-500 mb-2 mt-4">Presets</p>
                {textPresets.map(text => (
                    <div
                        key={text.id}
                        draggable
                        onDragStart={(e) => onDragStart(e, text, 'asset')}
                        className="bg-[#27272a] hover:bg-[#3f3f46] p-2 rounded-md cursor-grab active:cursor-grabbing border border-[#3f3f46] flex items-center gap-3 transition-colors"
                    >
                        <Type className="w-4 h-4 text-yellow-400" />
                        <span className="text-xs text-gray-200">{text.name}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TextPanel;
