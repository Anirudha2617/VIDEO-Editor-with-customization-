import React from 'react';
import { Asset } from '../../models';
import AudioBrowser from '../AudioBrowser';

import { MediaPipeline } from '../../pipelines/media';

interface AudioPanelProps {
    onAddAsset: (asset: Asset) => void;
    mediaPipeline: MediaPipeline;
}

const AudioPanel: React.FC<AudioPanelProps> = ({ onAddAsset, mediaPipeline }) => {
    return (
        <div className="h-full overflow-hidden bg-[#18181b]">
            <AudioBrowser onAddAsset={onAddAsset} mediaPipeline={mediaPipeline} />
        </div>
    );
};

export default AudioPanel;
