import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { Play, RefreshCw, Terminal, FileJson, GripVertical } from 'lucide-react';
import { Clip, Track, Asset } from '../../types';
import { createExecutionContext } from '../../services/scriptExecutionContext';
import { generateTimelineState, parseTimelineState } from '../../services/timelineStateGenerator';

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

    // UI State
    const [executing, setExecuting] = useState(false);
    const [dividerPos, setDividerPos] = useState(40); // Percentage
    const [isDragging, setIsDragging] = useState(false);

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

// Effect Operations
declare function addEffect(clipId: string, effect: {
    name: string;
    type?: string;
    value?: string;
    effectParams?: any;
}): void;

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
            if (!isDragging || !containerRef.current) return;

            const rect = containerRef.current.getBoundingClientRect();
            const newPos = ((e.clientY - rect.top) / rect.height) * 100;
            setDividerPos(Math.max(20, Math.min(80, newPos)));
        };

        const handleMouseUp = () => setIsDragging(false);

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

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
            {/* Panel 1: Command Console */}
            <div style={{ height: `${dividerPos}%` }} className="flex flex-col border-b border-[#444]">
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

            {/* Draggable Divider */}
            <div
                className="h-2 bg-[#2d2d2d] hover:bg-[#3d3d3d] cursor-ns-resize flex items-center justify-center group transition-colors"
                onMouseDown={() => setIsDragging(true)}
            >
                <GripVertical size={14} className="text-gray-600 group-hover:text-gray-400" />
            </div>

            {/* Panel 2: Timeline State */}
            <div style={{ height: `${100 - dividerPos - 0.5}%` }} className="flex flex-col">
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
