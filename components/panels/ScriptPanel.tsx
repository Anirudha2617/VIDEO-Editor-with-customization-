import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { Play, RefreshCw, Terminal, FileJson, GripVertical, Sparkles, Key, Loader } from 'lucide-react';
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

const ScriptPanel: React.FC<ScriptPanelProps> = ({
    tracks, clips, assets, onApplyScript, onAddClip, onUpdateClip, onRemoveClip, onAddAsset,
    selectedClipIds, onSelectClip
}) => {
    // Panel 1: Command Console
    const [consoleCode, setConsoleCode] = useState('');
    const [consoleOutputs, setConsoleOutputs] = useState<ConsoleOutput[]>([]);

    // Panel 2: Timeline State
    const [stateCode, setStateCode] = useState('');
    const [autoSelect, setAutoSelect] = useState(true);
    const editorRef = useRef<any>(null);
    const monacoRef = useRef<any>(null);
    const isSyncingSelection = useRef(false);

    // Panel 3: AI Assistant
    const [aiPrompt, setAiPrompt] = useState('');
    const [aiApiKey, setAiApiKey] = useState(getApiKey() || '');
    const [showApiKeyInput, setShowApiKeyInput] = useState(!hasApiKey());
    const [isGenerating, setIsGenerating] = useState(false);

    // UI State
    const [executing, setExecuting] = useState(false);
    const [dividerPos, setDividerPos] = useState(25); // Percentage - reduced to make room for AI
    const [isDragging, setIsDragging] = useState(false);
    const [divider2Pos, setDivider2Pos] = useState(55); // Second divider
    const [isDragging2, setIsDragging2] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);

    // Auto-update Panel 2 when timeline changes
    useEffect(() => {
        const newState = generateTimelineState(tracks, clips, assets);
        setStateCode(newState);
    }, [tracks, clips, assets]);

    // Timeline -> Editor Sync
    useEffect(() => {
        if (!autoSelect || !editorRef.current || selectedClipIds.length === 0 || isSyncingSelection.current) return;

        const selectedId = selectedClipIds[0];
        // Find line with this ID
        const code = editorRef.current.getValue();
        const lines = code.split('\n');

        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes(`"${selectedId}"`)) {
                editorRef.current.revealLineInCenter(i + 1);
                editorRef.current.setPosition({ lineNumber: i + 1, column: 1 });
                // Also highlight the block? For now just cursor
                break;
            }
        }
    }, [selectedClipIds, autoSelect]);

    // Editor -> Timeline Sync (handled in editor OnChangeCursor)
    const handleEditorDidMount = (editor: any, monaco: any) => {
        editorRef.current = editor;
        monacoRef.current = monaco;

        editor.onDidChangeCursorPosition((e: any) => {
            if (!autoSelect || isSyncingSelection.current) return;

            const position = e.position;
            const code = editor.getValue();
            const lines = code.split('\n');

            // Search upwards from cursor for an "id" field
            let foundId = null;
            let braceCount = 0;

            // Simple heuristic: Look upwards for "id": "..." 
            // verifying we haven't crossed a '},' that closes the object
            // This is basic but works for formatted JSON
            for (let i = position.lineNumber - 1; i >= 0; i--) {
                const line = lines[i];
                if (line.includes('},') || (line.trim() === '}' && i !== position.lineNumber - 1)) {
                    // We crossed a closing brace ABOVE us? That usually means we are between objects
                    // But if we are IN an object, we shouldn't see a closing brace of a sibling above us 
                    // unless we go past the start of our object.
                    // Actually, simpler: The first "id" we find moving UP is our ID, 
                    // UNLESS we hit a "{" that starts the object.
                    // The safest heuristic for this specific formatted output:
                    // Find the nearest "id": "..." above. 
                    // Check if there is a "}" between that line and our cursor.
                    break;
                }

                const idMatch = line.match(/"id":\s*"([^"]+)"/);
                if (idMatch) {
                    foundId = idMatch[1];
                    // Verify we haven't crossed a closing brace strictly between the found line and current pos
                    // (The loop check above handles most cases, but let's double check text range)
                    // ... actually for this feature, "nearest ID above" is 99% correct for user interaction
                    break;
                }
            }

            if (foundId) {
                isSyncingSelection.current = true;
                onSelectClip(foundId);
                // Debounce/reset flag
                setTimeout(() => { isSyncingSelection.current = false; }, 100);
            }
        });
    };

    // Generate TypeScript definitions for Monaco IntelliSense
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
        // Add type definitions for IntelliSense
        const defs = generateTypeDefinitions();
        monaco.languages.typescript.javascriptDefaults.addExtraLib(
            defs,
            'filename/lumina-context.d.ts'
        );

        // Enable suggestions
        monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
            target: monaco.languages.typescript.ScriptTarget.ES2020,
            allowNonTsExtensions: true,
            moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
            lib: ['es2020']
        });
    };

    // Handle divider drag
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();

            if (isDragging) {
                const newPos = ((e.clientY - rect.top) / rect.height) * 100;
                setDividerPos(Math.max(15, Math.min(40, newPos)));
            }

            if (isDragging2) {
                const newPos = ((e.clientY - rect.top) / rect.height) * 100;
                setDivider2Pos(Math.max(dividerPos + 15, Math.min(70, newPos)));
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            setIsDragging2(false);
        };

        if (isDragging || isDragging2) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, isDragging2, dividerPos]);

    // Handle AI script generation
    const handleGenerateAIScript = async () => {
        if (!aiPrompt.trim()) {
            addOutput('error', 'Please enter a prompt');
            return;
        }

        setIsGenerating(true);

        try {
            const code = await generateTimelineScript(aiPrompt, assets, clips, tracks);
            setConsoleCode(code);
            addOutput('info', '✨ AI script generated! Click "Run" to execute it.');
        } catch (e: any) {
            addOutput('error', `AI Generation failed: ${e.message}`);
        } finally {
            setIsGenerating(false);
        }
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

            // Create function with context + clips array
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

    // Apply state changes from Panel 2
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

    return (
        <div ref={containerRef} className="flex flex-col h-full bg-[#1e1e1e] text-gray-300">
            {/* Panel 0: AI Assistant (NEW) */}
            <div style={{ height: `${dividerPos}%` }} className="flex flex-col border-b border-[#444]">
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

                {/* API Key Input (Collapsible) */}
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
                <div className="flex-1 flex flex-col p-3 overflow-hidden">
                    <label className="text-[10px] text-gray-400 mb-1">Natural Language Prompt</label>
                    <textarea
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        className="flex-1 p-2 bg-[#2d2d2d] border border-[#444] rounded text-xs text-white resize-none outline-none focus:border-purple-500 font-mono"
                        placeholder="Example: Add all images from my media library with fade transitions, each lasting 3 seconds..."
                        onKeyDown={(e) => e.stopPropagation()}
                        onKeyUp={(e) => e.stopPropagation()}
                    />
                    <button
                        onClick={handleGenerateAIScript}
                        disabled={isGenerating || !hasApiKey()}
                        className="mt-2 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded text-xs font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
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
            </div>

            {/* Draggable Divider 1 */}
            <div
                className="h-2 bg-[#2d2d2d] hover:bg-purple-900/30 cursor-ns-resize flex items-center justify-center group transition-colors"
                onMouseDown={() => setIsDragging(true)}
            >
                <GripVertical size={14} className="text-gray-600 group-hover:text-purple-400" />
            </div>

            {/* Panel 1: Command Console */}
            <div style={{ height: `${divider2Pos - dividerPos - 0.5}%` }} className="flex flex-col border-b border-[#444]">
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

            {/* Draggable Divider 2 */}
            <div
                className="h-2 bg-[#2d2d2d] hover:bg-[#3d3d3d] cursor-ns-resize flex items-center justify-center group transition-colors"
                onMouseDown={() => setIsDragging2(true)}
            >
                <GripVertical size={14} className="text-gray-600 group-hover:text-gray-400" />
            </div>

            {/* Panel 2: Timeline State */}
            <div style={{ height: `${100 - divider2Pos - 0.5}%` }} className="flex flex-col">
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
        </div>
    );
};

export default ScriptPanel;
