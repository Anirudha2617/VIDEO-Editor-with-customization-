import React from 'react';
import { Asset } from '../../models';
import CodeAssetBrowser from '../CodeAssetBrowser';

interface CodePanelProps {
    onAddAsset: (asset: Asset) => void;
    assets: Asset[];
}

const CodePanel: React.FC<CodePanelProps> = ({ onAddAsset, assets }) => {
    return (
        <div className="h-full overflow-hidden bg-[#18181b]">
            <CodeAssetBrowser onAddAsset={onAddAsset} assets={assets} />
        </div>
    );
};

export default CodePanel;
