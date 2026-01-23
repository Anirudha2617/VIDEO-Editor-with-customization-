import React from 'react';
import { Asset } from '../../types';
import AudioBrowser from '../AudioBrowser';

interface AudioPanelProps {
    onAddAsset: (asset: Asset) => void;
}

const AudioPanel: React.FC<AudioPanelProps> = ({ onAddAsset }) => {
    return (
        <div className="h-full overflow-hidden bg-[#18181b]">
            <AudioBrowser onAddAsset={onAddAsset} />
        </div>
    );
};

export default AudioPanel;
