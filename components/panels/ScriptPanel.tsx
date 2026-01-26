import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { Play, RefreshCw, Terminal, FileJson, Sparkles, Key, Loader, Copy, Check } from 'lucide-react';
import { Clip, Track, Asset } from '../../types';
import { createExecutionContext } from '../../services/scriptExecutionContext';
import { generateTimelineState, parseTimelineState } from '../../services/timelineStateGenerator';
import { getApiKey, setApiKey, hasApiKey } from '../../services/apiKeyService';
import { generateTimelineScript } from '../../services/geminiService';

interface ScriptPanelProps {
    tracks: Track[];
    clips: Clip[];
    assets: Asset[];
    onApplyScript: (clips: Clip[]) => void;
    onAddClip: (clip: Clip) => void;
    onUpdateClip: (id: string, updates: Partial<Clip>) => void;
    onRemoveClip: (id: string) => void;
    onAddAsset: (asset: Asset) => void;
    selectedClipIds: string[];
    onSelectClip: (id: string) => void;
}

interface ConsoleOutput {
    id: string;
    type: 'result' | 'error' | 'info';
    content: any;
}

type TabType = 'ai' | 'console' | 'state';

const ScriptPanel: React.FC<ScriptPanelProps> = ({
    tracks, clips, assets, onApplyScript, onAddClip, onUpdateClip, onRemoveClip, onAddAsset,
    selectedClipIds, onSelectClip
}) => {
    // Tab State
    const [activeTab, setActiveTab] = useState<TabType>('ai');

    // Command Console
    const [consoleCode, setConsoleCode] = useState('');
    const [consoleOutputs, setConsoleOutputs] = useState<ConsoleOutput[]>([]);

    // Timeline State
    const [stateCode, setStateCode] = useState('');
    const [autoSelect, setAutoSelect] = useState(true);
    const editorRef = useRef<any>(null);
    const monacoRef = useRef<any>(null);
    const isSyncingSelection = useRef(false);

    // AI Assistant
    const [aiPrompt, setAiPrompt] = useState('');
    const [aiGeneratedCode, setAiGeneratedCode] = useState('');
    const [aiApiKey, setAiApiKey] = useState(getApiKey() || '');
    const [showApiKeyInput, setShowApiKeyInput] = useState(!hasApiKey());
    const [isGenerating, setIsGenerating] = useState(false);
    const [copied, setCopied] = useState(false);

    // UI State
    const [executing, setExecuting] = useState(false);

    // Auto-update Timeline State when timeline changes
    useEffect(() => {
        const newState = generateTimelineState(tracks, clips, assets);
        setStateCode(newState);
    }, [tracks, clips, assets]);

    // Timeline -> Editor Sync
    useEffect(() => {
        if (!autoSelect || !editorRef.current || selectedClipIds.length === 0 || isSyncingSelection.current) return;

        const selectedId = selectedClipIds[0];
        const code = editorRef.current.getValue();
        const lines = code.split('\n');

        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes(`"${selectedId}"`)) {
                editorRef.current.revealLineInCenter(i + 1);
                editorRef.current.setPosition({ lineNumber: i + 1, column: 1 });
                break;
            }
        }
    }, [selectedClipIds, autoSelect]);

    // Editor -> Timeline Sync
    const handleEditorDidMount = (editor: any, monaco: any) => {
        editorRef.current = editor;
        monacoRef.current = monaco;

        editor.onDidChangeCursorPosition((e: any) => {
            if (!autoSelect || isSyncingSelection.current) return;

            const position = e.position;
            const code = editor.getValue();
            const lines = code.split('\n');

            let foundId = null;
            for (let i = position.lineNumber - 1; i >= 0; i--) {
                const line = lines[i];
                if (line.includes('},') || (line.trim() === '}' && i !== position.lineNumber - 1)) {
                    break;
                }

                const idMatch = line.match(/"id":\s*"([^"]+)"/);
                if (idMatch) {
                    foundId = idMatch[1];
                    break;
                }
            }

            if (foundId) {
                isSyncingSelection.current = true;
                onSelectClip(foundId);
                setTimeout(() => { isSyncingSelection.current = false; }, 100);
            }
        });
    };

    // TypeScript definitions for Monaco
    const generateTypeDefinitions = () => {
        const assetDefs = assets.map(asset => {
            const safeName = asset.name.replace(/[^a-zA-Z0-9]/g, '_');
            return `declare const ${safeName}: string;`;
        }).join('\n');

        const apiDefs = `
// Timeline Operations
declare function addClip(assetIdOrName: string, config: {
    track: number;
    start: number;
    duration?: number;
    scale?: number;
    opacity?: number;
    x?: number;
    y?: number;
}): { id: string };

declare function removeClip(id: string): void;
declare function updateClip(id: string, updates: any): void;
declare function getClip(id: string): any;

// Text Asset Creation
declare function addTextAsset(text: string, options?: {
    fontSize?: number;
    fontColor?: string;
    fontFamily?: string;
    isBold?: boolean;
    backgroundColor?: string;
    borderRadius?: number;
    padding?: number;
}): { id: string; name: string; type: string };

// Effect Operations
declare function addEffect(clipId: string, effect: {
    name: string;
    type?: string;
    value?: string;
    effectParams?: any;
}): void;

// Transition Operations
declare function addTransition(
    clipId: string, 
    type: 'in' | 'out', 
    transition: 'fade' | 'wipe' | 'slide-left' | 'slide-right' | 'slide-up' | 'slide-down' | 'zoom-in' | 'zoom-out', 
    duration?: number
): void;

// External Resources
declare function addAssetFromUrl(url: string, name?: string): Promise<any>;

// AI Operations
declare const ai: {
    generateImage(prompt: string): Promise<any>;
};

// Utility
declare function display(content: any): void;

// Asset References
declare const assets: Record<string, string>;

// Clips Array
declare const clips: any[];
`;

        return assetDefs + '\n' + apiDefs;
    };

    // Handle Monaco editor mount for Command Console
    const handleConsoleEditorMount = (editor: any, monaco: any) => {
        const defs = generateTypeDefinitions();
        monaco.languages.typescript.javascriptDefaults.addExtraLib(
            defs,
            'filename/lumina-context.d.ts'
        );

        monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
            target: monaco.languages.typescript.ScriptTarget.ES2020,
            allowNonTsExtensions: true,
            moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
            lib: ['es2020']
        });
    };

    // Handle AI script generation
    const handleGenerateAIScript = async () => {
        if (!aiPrompt.trim()) {
            addOutput('error', 'Please enter a prompt');
            return;
        }

        setIsGenerating(true);

        try {
            const code = await generateTimelineScript(aiPrompt, assets, clips, tracks);
            setAiGeneratedCode(code);
            addOutput('info', '✨ AI script generated! Review it in the AI Assistant tab.');
        } catch (e: any) {
            addOutput('error', `AI Generation failed: ${e.message}`);
        } finally {
            setIsGenerating(false);
        }
    };

    // Execute AI-generated code
    const handleExecuteAICode = async () => {
        setExecuting(true);
        setActiveTab('console'); // Switch to console tab to see output

        try {
            const context = createExecutionContext(
                assets,
                clips,
                tracks,
                onAddClip,
                onUpdateClip,
                onRemoveClip,
                onAddAsset,
                (content) => {
                    addOutput('result', content);
                }
            );

            const contextWithClips = { ...context, clips };
            const func = new Function(...Object.keys(contextWithClips), aiGeneratedCode);
            const result = await func(...Object.values(contextWithClips));

            if (result !== undefined) {
                addOutput('result', result);
            } else {
                addOutput('info', '✓ AI script executed successfully');
            }
        } catch (e: any) {
            addOutput('error', e.message);
        } finally {
            setExecuting(false);
        }
    };

    // Copy AI code to clipboard
    const handleCopyAICode = () => {
        navigator.clipboard.writeText(aiGeneratedCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Save API key
    const handleSaveApiKey = () => {
        if (aiApiKey.trim()) {
            setApiKey(aiApiKey.trim());
            setShowApiKeyInput(false);
            addOutput('info', '✓ API Key saved');
        }
    };

    // Execute console command
    const handleExecuteConsole = async () => {
        setExecuting(true);

        try {
            const context = createExecutionContext(
                assets,
                clips,
                tracks,
                onAddClip,
                onUpdateClip,
                onRemoveClip,
                onAddAsset,
                (content) => {
                    addOutput('result', content);
                }
            );

            const contextWithClips = { ...context, clips };
            const func = new Function(...Object.keys(contextWithClips), consoleCode);
            const result = await func(...Object.values(contextWithClips));

            if (result !== undefined) {
                addOutput('result', result);
            } else {
                addOutput('info', '✓ Executed successfully');
            }
        } catch (e: any) {
            addOutput('error', e.message);
        } finally {
            setExecuting(false);
        }
    };

    // Apply state changes
    const handleApplyState = () => {
        try {
            const parsed = parseTimelineState(stateCode, assets, tracks);
            onApplyScript(parsed.clips);
            addOutput('info', '✓ Timeline updated from state');
        } catch (e: any) {
            addOutput('error', `Parse error: ${e.message}`);
        }
    };

    const addOutput = (type: ConsoleOutput['type'], content: any) => {
        setConsoleOutputs(prev => [...prev, {
            id: Date.now().toString(),
            type,
            content
        }]);
    };

    const renderOutput = (output: ConsoleOutput) => {
        const bgColor = output.type === 'error' ? 'bg-red-900/20' :
            output.type === 'info' ? 'bg-blue-900/20' :
                'bg-green-900/20';

        const textColor = output.type === 'error' ? 'text-red-400' :
            output.type === 'info' ? 'text-blue-400' :
                'text-green-400';

        return (
            <div key={output.id} className={`${bgColor} ${textColor} p-2 rounded text-xs font-mono mb-2`}>
                {typeof output.content === 'object' ? JSON.stringify(output.content, null, 2) : String(output.content)}
            </div>
        );
    };

    // Tab button component
    const TabButton = ({ tab, icon: Icon, label }: { tab: TabType; icon: any; label: string }) => {
        const isActive = activeTab === tab;
        return (
            <button
                onClick={() => setActiveTab(tab)}
                className={`
                    flex items-center gap-2 px-4 py-2 text-xs font-medium transition-all
                    border-b-2 relative cursor-pointer
                    ${isActive
                        ? 'text-white border-blue-500 bg-[#1e1e1e]'
                        : 'text-gray-400 border-transparent hover:text-gray-200 hover:border-gray-600 bg-[#2d2d2d]'
                    }
                `}
                style={{ pointerEvents: 'auto' }}
            >
                <Icon size={14} />
                {label}
                {isActive && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />}
            </button>
        );
    };

    return (
        <div className="flex flex-col h-full bg-[#1e1e1e] text-gray-300">
            {/* Chrome-style Tabs */}
            <div className="flex border-b border-[#444] bg-[#2d2d2d]">
                <TabButton tab="ai" icon={Sparkles} label="AI Assistant" />
                <TabButton tab="console" icon={Terminal} label="Command Console" />
                <TabButton tab="state" icon={FileJson} label="Timeline State" />
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-hidden">

                {/* Tab 1: AI Assistant */}
                {activeTab === 'ai' && (
                    <div className="h-full flex flex-col">
                        {/* Header */}
                        <div className="flex items-center justify-between p-2 border-b border-[#333] bg-gradient-to-r from-[#2a2d3a] to-[#252526]">
                            <div className="flex items-center gap-2">
                                <Sparkles size={14} className="text-purple-400" />
                                <span className="text-xs font-semibold">AI Script Assistant</span>
                                {hasApiKey() && <span className="text-[9px] text-green-400">● Connected</span>}
                            </div>
                            <button
                                onClick={() => setShowApiKeyInput(!showApiKeyInput)}
                                className="flex items-center gap-1 px-2 py-1 bg-[#333] hover:bg-[#444] text-white rounded text-xs transition"
                                title="Manage API Key"
                            >
                                <Key size={12} />
                            </button>
                        </div>

                        {/* API Key Input */}
                        {showApiKeyInput && (
                            <div className="p-3 bg-[#1a1a1a] border-b border-[#333]">
                                <label className="text-[10px] text-gray-400 mb-1 block">Gemini API Key</label>
                                <div className="flex gap-2">
                                    <input
                                        type="password"
                                        value={aiApiKey}
                                        onChange={(e) => setAiApiKey(e.target.value)}
                                        className="flex-1 px-2 py-1 bg-[#2d2d2d] border border-[#444] rounded text-xs text-white outline-none focus:border-blue-500"
                                        placeholder="AIzaSy..."
                                    />
                                    <button
                                        onClick={handleSaveApiKey}
                                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold transition"
                                    >
                                        Save
                                    </button>
                                </div>
                                <p className="text-[9px] text-gray-500 mt-1">Get your API key from Google AI Studio</p>
                            </div>
                        )}

                        {/* Prompt Input */}
                        <div className="p-3 border-b border-[#333]">
                            <label className="text-[10px] text-gray-400 mb-1 block">Natural Language Prompt</label>
                            <textarea
                                value={aiPrompt}
                                onChange={(e) => setAiPrompt(e.target.value)}
                                className="w-full h-20 p-2 bg-[#2d2d2d] border border-[#444] rounded text-xs text-white resize-none outline-none focus:border-purple-500 font-mono"
                                placeholder="Example: Add all images from my media library with fade transitions, each lasting 3 seconds..."
                                onKeyDown={(e) => e.stopPropagation()}
                                onKeyUp={(e) => e.stopPropagation()}
                            />
                            <button
                                onClick={handleGenerateAIScript}
                                disabled={isGenerating || !hasApiKey()}
                                className="mt-2 w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded text-xs font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader size={12} className="animate-spin" />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={12} />
                                        Generate Script
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Generated Code Preview */}
                        {aiGeneratedCode && (
                            <div className="flex-1 flex flex-col overflow-hidden">
                                <div className="flex items-center justify-between p-2 bg-[#252526] border-b border-[#333]">
                                    <span className="text-xs text-gray-400">Generated Code Preview</span>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleCopyAICode}
                                            className="flex items-center gap-1 px-2 py-1 bg-[#333] hover:bg-[#444] text-white rounded text-xs transition"
                                        >
                                            {copied ? <Check size={12} /> : <Copy size={12} />}
                                            {copied ? 'Copied!' : 'Copy'}
                                        </button>
                                        <button
                                            onClick={handleExecuteAICode}
                                            disabled={executing}
                                            className="flex items-center gap-1 px-3 py-1 bg-green-700 hover:bg-green-600 text-white rounded text-xs font-semibold transition disabled:opacity-50"
                                        >
                                            <Play size={12} /> Execute
                                        </button>
                                    </div>
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <Editor
                                        height="100%"
                                        language="javascript"
                                        value={aiGeneratedCode}
                                        theme="vs-dark"
                                        options={{
                                            readOnly: true,
                                            minimap: { enabled: false },
                                            fontSize: 12,
                                            lineNumbers: 'on',
                                            scrollBeyondLastLine: false,
                                            automaticLayout: true,
                                        }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Empty State */}
                        {!aiGeneratedCode && (
                            <div className="flex-1 flex items-center justify-center text-center p-8">
                                <div>
                                    <Sparkles size={48} className="text-purple-400 mx-auto mb-4 opacity-50" />
                                    <h3 className="text-sm font-semibold text-gray-300 mb-2">AI Script Generator</h3>
                                    <p className="text-xs text-gray-500 max-w-xs mx-auto">
                                        Enter a natural language prompt above and click "Generate Script" to create timeline automation code.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Tab 2: Command Console */}
                {activeTab === 'console' && (
                    <div className="h-full flex flex-col">
                        {/* Header */}
                        <div className="flex items-center justify-between p-2 border-b border-[#333] bg-[#252526]">
                            <div className="flex items-center gap-2">
                                <Terminal size={14} className="text-yellow-400" />
                                <span className="text-xs font-semibold">Command Console</span>
                            </div>
                            <button
                                onClick={handleExecuteConsole}
                                disabled={executing}
                                className="flex items-center gap-1 px-3 py-1 bg-green-700 hover:bg-green-600 text-white rounded text-xs font-semibold transition disabled:opacity-50"
                            >
                                <Play size={12} /> Run
                            </button>
                        </div>

                        {/* Editor */}
                        <div
                            className="flex-1 overflow-hidden"
                            onKeyDown={(e) => e.stopPropagation()}
                            onKeyUp={(e) => e.stopPropagation()}
                        >
                            <Editor
                                height="100%"
                                language="javascript"
                                value={consoleCode}
                                onChange={(value) => setConsoleCode(value || '')}
                                onMount={handleConsoleEditorMount}
                                theme="vs-dark"
                                options={{
                                    minimap: { enabled: false },
                                    fontSize: 12,
                                    lineNumbers: 'on',
                                    scrollBeyondLastLine: false,
                                    automaticLayout: true,
                                }}
                            />
                        </div>

                        {/* Output */}
                        {consoleOutputs.length > 0 && (
                            <div className="h-32 overflow-y-auto p-2 bg-[#1a1a1a] border-t border-[#333] custom-scrollbar">
                                {consoleOutputs.map(renderOutput)}
                            </div>
                        )}
                    </div>
                )}

                {/* Tab 3: Timeline State */}
                {activeTab === 'state' && (
                    <div className="h-full flex flex-col">
                        {/* Header */}
                        <div className="flex items-center justify-between p-2 border-b border-[#333] bg-[#252526]">
                            <div className="flex items-center gap-2">
                                <FileJson size={14} className="text-blue-400" />
                                <span className="text-xs font-semibold">Timeline State</span>
                                <span className="text-[9px] text-gray-500">(editable)</span>
                            </div>
                            <div className="flex gap-1">
                                <button
                                    onClick={() => setStateCode(generateTimelineState(tracks, clips, assets))}
                                    className="flex items-center gap-1 px-2 py-1 bg-[#333] hover:bg-[#444] text-white rounded text-xs transition"
                                    title="Refresh from timeline"
                                >
                                    <RefreshCw size={12} />
                                </button>
                                <button
                                    onClick={() => setAutoSelect(!autoSelect)}
                                    className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition border ${autoSelect
                                        ? 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                                        : 'bg-[#333] text-gray-400 border-transparent hover:bg-[#444]'
                                        }`}
                                    title="Auto-select clip from timeline/cursor"
                                >
                                    <span className="text-[10px] font-bold">◉</span> Sync
                                </button>
                                <button
                                    onClick={handleApplyState}
                                    className="flex items-center gap-1 px-3 py-1 bg-blue-700 hover:bg-blue-600 text-white rounded text-xs font-semibold transition"
                                >
                                    <Play size={12} /> Apply
                                </button>
                            </div>
                        </div>

                        {/* Editor */}
                        <div
                            className="flex-1 overflow-hidden"
                            onKeyDown={(e) => e.stopPropagation()}
                            onKeyUp={(e) => e.stopPropagation()}
                        >
                            <Editor
                                height="100%"
                                language="javascript"
                                value={stateCode}
                                onChange={(value) => setStateCode(value || '')}
                                onMount={handleEditorDidMount}
                                theme="vs-dark"
                                options={{
                                    minimap: { enabled: false },
                                    fontSize: 12,
                                    lineNumbers: 'on',
                                    scrollBeyondLastLine: false,
                                    automaticLayout: true,
                                }}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ScriptPanel;
