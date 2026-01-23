import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Play, RefreshCw, Save, HelpCircle, AlertCircle, CheckCircle } from 'lucide-react';
import { Clip, Track, Asset } from '../../types';
import { generateScript, parseScript } from '../../services/timelineScriptService';

interface ScriptPanelProps {
    tracks: Track[];
    clips: Clip[];
    assets: Asset[];
    onApplyScript: (clips: Clip[]) => void;
}

const ScriptPanel: React.FC<ScriptPanelProps> = ({ tracks, clips, assets, onApplyScript }) => {
    const [script, setScript] = useState('');
    const [status, setStatus] = useState<{ type: 'idle' | 'success' | 'error', message: string }>({ type: 'idle', message: 'Ready' });
    const [showHelp, setShowHelp] = useState(false);

    // Initial load
    useEffect(() => {
        handleRefresh();
    }, []); // Only run once on mount? Or maybe we want to keep it in sync? 
    // If we utilize "Refresh" button manually, we avoid overwriting user's work while they type.

    const handleRefresh = () => {
        const newScript = generateScript(tracks, clips, assets);
        setScript(newScript);
        setStatus({ type: 'idle', message: 'Script generated from timeline' });
    };

    const handleApply = () => {
        try {
            const result = parseScript(script, assets, tracks);
            if (result.clips.length > 0) {
                onApplyScript(result.clips);
                setStatus({ type: 'success', message: 'Timeline updated successfully' });
            } else {
                setStatus({ type: 'error', message: 'No valid clips found in script' });
            }
        } catch (e: any) {
            setStatus({ type: 'error', message: 'Parse error: ' + e.message });
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#1e1e1e] text-gray-300">
            {/* Toolbar */}
            <div className="flex items-center justify-between p-2 border-b border-[#333]">
                <div className="flex items-center gap-1">
                    <button
                        onClick={handleApply}
                        className="flex items-center gap-1 px-3 py-1 bg-green-700 hover:bg-green-600 text-white rounded text-xs font-semibold transition"
                        title="Apply Script to Timeline"
                    >
                        <Play size={14} /> Apply
                    </button>
                    <button
                        onClick={handleRefresh}
                        className="flex items-center gap-1 px-3 py-1 bg-[#333] hover:bg-[#444] text-white rounded text-xs transition"
                        title="Regenerate Script from Timeline (Discards changes)"
                    >
                        <RefreshCw size={14} /> Refresh
                    </button>
                </div>
                <div>
                    <button
                        onClick={() => setShowHelp(!showHelp)}
                        className={`p-1.5 rounded hover:bg-[#333] transition ${showHelp ? 'text-blue-400' : 'text-gray-500'}`}
                        title="Syntax Help"
                    >
                        <HelpCircle size={16} />
                    </button>
                </div>
            </div>

            {/* Help Section */}
            {showHelp && (
                <div className="bg-[#252526] p-4 text-xs border-b border-[#333] text-gray-400">
                    <h4 className="font-bold text-gray-200 mb-2">Lumina Script Syntax</h4>
                    <ul className="space-y-1 list-disc pl-4 font-mono">
                        <li><span className="text-pink-400">clip</span> "AssetName" track:1 start:0s duration:5s</li>
                        <li><span className="text-blue-400">set</span> scale: 1.5</li>
                        <li><span className="text-blue-400">set</span> position: 100, 200</li>
                        <li><span className="text-blue-400">set</span> opacity: 0.5</li>
                        <li><span className="text-yellow-400">animate</span> in: fade duration:1s</li>
                        <li><span className="text-yellow-400">animate</span> out: slide-left duration:0.5s</li>
                    </ul>
                </div>
            )}

            {/* Editor */}
            <div
                className="flex-1 overflow-hidden"
                onKeyDown={(e) => e.stopPropagation()}
                onKeyUp={(e) => e.stopPropagation()}
                onKeyPress={(e) => e.stopPropagation()}
                onPaste={(e) => e.stopPropagation()}
                onCopy={(e) => e.stopPropagation()}
                onCut={(e) => e.stopPropagation()}
            >
                <Editor
                    height="100%"
                    defaultLanguage="yaml" // YAML provides decent highlighting for this custom DSL
                    value={script}
                    onChange={(value) => setScript(value || '')}
                    theme="vs-dark"
                    options={{
                        minimap: { enabled: false },
                        fontSize: 13,
                        lineNumbers: 'on',
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                    }}
                />
            </div>

            {/* Status Bar */}
            <div className={`h-6 px-2 flex items-center text-[10px] border-t border-[#333] ${status.type === 'error' ? 'bg-red-900/30 text-red-400' :
                status.type === 'success' ? 'bg-green-900/30 text-green-400' :
                    'bg-[#007acc] text-white'
                }`}>
                {status.type === 'error' && <AlertCircle size={10} className="mr-1" />}
                {status.type === 'success' && <CheckCircle size={10} className="mr-1" />}
                <span>{status.message}</span>
            </div>
        </div>
    );
};

export default ScriptPanel;
