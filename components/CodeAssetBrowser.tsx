import React, { useState, useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Code, Image as ImageIcon, Video, Type, Save, Trash2, Edit2, Loader2, Download, Sparkles, Plus, ImagePlus, Bot, Maximize2, Minimize2 } from 'lucide-react';
import { Asset, MediaType, Clip } from '../models';
import {
    CodeAsset,
    analyzeCodeType,
    renderCodeToImage,
    renderCodeToVideo,
    createAssetFromCode,
    createTextClipFromCode,
} from '../services/codeAssetService';
import {
    saveCodeAsset,
    getCodeAssets,
    deleteCodeAsset,
} from '../services/codeAssetStorage';
import {
    generateCodeSnippet
} from '../services/ai/GeminiProvider';
import { codeTemplates, CodeTemplate } from '../services/codeTemplates';
import { registerTransition } from '../transitions/registry';
import { registerEffect } from '../effects/registry';

interface CodeAssetBrowserProps {
    onAddAsset: (asset: Asset) => void;
    onAddTextClip?: (clip: Partial<Clip>) => void;
    assets?: Asset[];
}

const CodeAssetBrowser: React.FC<CodeAssetBrowserProps> = ({ onAddAsset, onAddTextClip, assets = [] }) => {
    const [activeTab, setActiveTab] = useState<'create' | 'saved'>('create');
    const [codeTab, setCodeTab] = useState<'html' | 'css' | 'js'>('html');
    const [showAssetSidebar, setShowAssetSidebar] = useState(true);

    // Code state
    const [html, setHtml] = useState('<div class="container">\n  <h1>Hello World</h1>\n</div>');
    const [css, setCss] = useState(`.container {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

h1 {
  font-size: 48px;
  color: #00ffff;
  font-family: Arial, sans-serif;
  text-shadow: 0 0 10px #00ffff;
}`);
    const [js, setJs] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [renderType, setRenderType] = useState<'auto' | 'image' | 'video' | 'text' | 'transition' | 'animation' | 'filter'>('auto');

    const detectedType = analyzeCodeType(html, css, js);

    // Settings
    const [assetName, setAssetName] = useState('My Code Asset');
    const [width, setWidth] = useState(1920);
    const [height, setHeight] = useState(1080);
    const [duration, setDuration] = useState(3);
    const [fps, setFps] = useState(30);
    const [transparentBg, setTransparentBg] = useState(true);

    // State
    const [rendering, setRendering] = useState(false);
    const [renderProgress, setRenderProgress] = useState(0);
    const [savedAssets, setSavedAssets] = useState<CodeAsset[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<string>('');
    const [previewKey, setPreviewKey] = useState(0);
    const [isMaximized, setIsMaximized] = useState(false);
    const [isAiGenerating, setIsAiGenerating] = useState(false);

    const editorRef = useRef<any>(null);

    const previewIframeRef = useRef<HTMLIFrameElement>(null);
    const lastAssetsRef = useRef<Asset[]>([]);

    // Load saved assets
    useEffect(() => {
        setSavedAssets(getCodeAssets());
    }, []);

    // Update preview with assets logic
    useEffect(() => {
        const timer = setTimeout(() => {
            updatePreview();
        }, 500); // Debounced

        return () => clearTimeout(timer);
    }, [html, css, js, transparentBg, assets]); // Re-run if assets change

    const updatePreview = () => {
        const iframe = previewIframeRef.current;
        if (!iframe) return;

        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!doc) return;

        // Generate script variables for assets
        // We create a global object 'assets' map: { [id]: url }
        // And also pre-load images/videos if needed?
        // Simple way: expose `getAssetUrl(name)` helper.

        const assetMap = assets.reduce((acc, a) => {
            acc[a.name] = a.src;
            acc[a.id] = a.src; // Support ID lookups too
            return acc;
        }, {} as Record<string, string>);

        doc.open();
        doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            * { box-sizing: border-box; }
            html, body {
              margin: 0;
              padding: 0;
              background-color: ${transparentBg ? 'transparent' : '#ffffff'} !important;
              background: ${transparentBg ? 'transparent' : '#ffffff'} !important;
              width: 100%;
              height: 100%;
              overflow: hidden;
            }
            ${css}
          </style>
        </head>
        <body>
          ${html}
          <script>
             // Injected Asset Helper
             const _assetMap = ${JSON.stringify(assetMap)};
             
             // Global helper functions
             window.getAssetUrl = (nameOrId) => {
                 return _assetMap[nameOrId] || '';
             };

             window.createImage = (nameOrId) => {
                 const img = new Image();
                 img.crossOrigin = "anonymous";
                 img.src = getAssetUrl(nameOrId);
                 return img;
             };

             window.createVideo = (nameOrId) => {
                const vid = document.createElement('video');
                vid.crossOrigin = "anonymous";
                vid.src = getAssetUrl(nameOrId);
                vid.loop = true;
                vid.muted = true;
                return vid;
             };

            try {
              // DETECT IF THIS IS A SCRIPT (Transition/Effect)
              const userCode = \`${js.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`;
              
              if (userCode.includes('return {') && (userCode.includes('apply:') || userCode.includes('id:'))) {
                 // Script Mode Preview Harness
                 console.log('Running Script Preview Mode');
                 
                 // 1. Eval the object
                 const createObj = new Function(userCode);
                 const def = createObj();
                 
                 if (def.apply) {
                     // 2. Setup Canvas if not exists
                     let canvas = document.querySelector('canvas');
                     if (!canvas) {
                         canvas = document.createElement('canvas');
                         canvas.width = window.innerWidth;
                         canvas.height = window.innerHeight;
                         document.body.appendChild(canvas);
                     }
                     const ctx = canvas.getContext('2d');
                     
                     // 3. Animation Loop for Transition
                     let progress = 0;
                     let dir = 1;
                     
                     if (def.type === 'filter' || !userCode.includes('ctx')) {
                         // Effect Preview (Use an image)
                         const img = new Image();
                         img.src = "https://picsum.photos/800/600";
                         img.onload = () => {
                             function render() {
                                 ctx.clearRect(0,0, canvas.width, canvas.height);
                                 
                                 // Draw Image
                                 ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                                 
                                 // Apply Effect
                                 const res = def.apply({ ctx, width: canvas.width, height: canvas.height, params: { intensity: (Math.sin(Date.now()/1000)+1)/2 } });
                                 
                                 if (res.filter) {
                                     canvas.style.filter = res.filter;
                                 }
                                 requestAnimationFrame(render);
                             }
                             render();
                         };
                     } else {
                         // Transition Preview
                         function render() {
                             ctx.clearRect(0,0, canvas.width, canvas.height);
                             
                             // Simulate "From" and "To" clips
                             ctx.fillStyle = '#111';
                             ctx.fillRect(0,0,canvas.width, canvas.height);
                             
                             // Draw Transition content
                             const res = def.apply({ 
                                 ctx, 
                                 width: canvas.width, 
                                 height: canvas.height, 
                                 progress: progress, 
                                 isExit: false, 
                                 params: { color: '#ff0055' } 
                             });
                             
                             // If overlay color returned (typical for wipe)
                             if (res.overlayColor) {
                                 ctx.fillStyle = res.overlayColor.style;
                                 ctx.globalAlpha = res.overlayColor.opacity;
                                 ctx.fillRect(0,0, canvas.width, canvas.height);
                                 ctx.globalAlpha = 1;
                             }
                             
                             progress += 0.01 * dir;
                             if (progress >= 1 || progress <= 0) dir *= -1;
                             
                             requestAnimationFrame(render);
                         }
                         render();
                     }
                 }
              } else {
                  // Standard Mode
                  ${js}
              }
            } catch (e) {
              console.error('Preview error:', e);
            }
          </script>
        </body>
      </html>
    `);
        doc.close();
    };

    const injectAssetCode = (asset: Asset) => {
        // Switch to JS tab if not already
        setCodeTab('js');

        const cleanName = asset.name.replace(/[^a-zA-Z0-9]/g, '_');

        let snippet = '';
        if (asset.type === MediaType.IMAGE) {
            snippet = `
// Load Image: ${asset.name}
const img_${cleanName} = createImage("${asset.name}");
// Example usage:
// img_${cleanName}.onload = () => {
//   const canvas = document.querySelector('canvas'); // assume canvas exists
//   const ctx = canvas.getContext('2d');
//   ctx.drawImage(img_${cleanName}, 0, 0, 200, 200);
// };
`;
        } else if (asset.type === MediaType.VIDEO) {
            snippet = `
// Load Video: ${asset.name}
const vid_${cleanName} = createVideo("${asset.name}");
// Example usage:
// vid_${cleanName}.onloadedmetadata = () => {
//   vid_${cleanName}.play();
//   // In your animation loop:
//   // ctx.drawImage(vid_${cleanName}, 0, 0, 300, 200);
// };
`;
        }

        setJs(prev => prev + snippet);
    };

    const handleRender = async () => {
        setRendering(true);
        setRenderProgress(0);

        try {
            // Map UI render types to core types (video/image/text)
            let coreType: 'image' | 'video' | 'text' = 'image';
            let subtype: 'transition' | 'animation' | 'filter' | undefined = undefined;

            if (renderType === 'auto') {
                coreType = analyzeCodeType(html, css, js);
            } else if (['transition', 'animation', 'filter', 'video'].includes(renderType)) {
                if (renderType === 'transition') {
                    // Check if it looks like a script (no HTML/CSS)
                    if (html.length < 50 && css.length < 50 && js.includes('return {')) {
                        // specialized Transition Script
                        coreType = 'text';
                        subtype = 'transition';
                    } else {
                        // Rendered Video Transition
                        coreType = 'video';
                        subtype = 'transition';
                    }
                } else if (renderType === 'filter') {
                    if (html.length < 50 && css.length < 50 && js.includes('return {')) {
                        coreType = 'text';
                        subtype = 'filter' as any; // Using 'filter' as subtype for effect scripts
                    } else {
                        coreType = 'video';
                        subtype = 'filter';
                    }
                } else {
                    coreType = 'video';
                    if (renderType !== 'video') subtype = renderType as any;
                }
            } else {
                coreType = renderType as any;
            }

            const codeAsset: CodeAsset = {
                id: `code_${Date.now()}`,
                name: assetName,
                html,
                css,
                js,
                width,
                height,
                type: coreType,
                subtype: subtype,
                duration: coreType === 'video' ? duration : undefined,
                fps: coreType === 'video' ? fps : undefined,
                createdAt: Date.now(),
            };

            if (coreType === 'text' && onAddTextClip) {
                // Create as editable text clip
                const textClip = createTextClipFromCode(codeAsset);
                onAddTextClip({
                    ...textClip,
                    id: crypto.randomUUID(),
                    assetId: '',
                    trackId: '',
                    start: 0,
                    duration: 5,
                    offset: 0,
                    name: assetName,
                    type: MediaType.TEXT,
                    src: '',
                    effects: [],
                    animationDuration: 0.5,
                });

                saveCodeAsset(codeAsset);
                setSavedAssets(getCodeAssets());
                alert(`✅ Created editable text element: "${assetName}"`);

            } else if (coreType === 'video') {
                // Render as video (handles Transition/Animation/Filter subtypes)
                const videoBlob = await renderCodeToVideo(codeAsset, (progress) => {
                    setRenderProgress(progress);
                });

                const videoUrl = URL.createObjectURL(videoBlob);
                const asset = createAssetFromCode(codeAsset, videoUrl, MediaType.VIDEO, subtype);

                onAddAsset(asset);
                saveCodeAsset({ ...codeAsset, thumbnail: videoUrl });
                setSavedAssets(getCodeAssets());

                const typeLabel = subtype ? subtype.charAt(0).toUpperCase() + subtype.slice(1) : 'Video';
                alert(`✅ ${typeLabel} asset created: "${assetName}"`);
            } else if (coreType === 'text' && (subtype === 'transition' || subtype === 'filter')) {
                // Handle SCRIPT registration
                try {
                    // 1. Compile the JS
                    const createObj = new Function(js);
                    const result = createObj();

                    if (!result || typeof result.apply !== 'function' || !result.id || !result.name) {
                        throw new Error("Script must return an object with { id, name, apply } properties.");
                    }

                    // 2. Register
                    if (subtype === 'transition') {
                        registerTransition(result);
                        alert(`✅ Registered Custom Transition: "${result.name}"`);
                    } else {
                        registerEffect(result);
                        alert(`✅ Registered Custom Effect: "${result.name}"`);
                    }

                    // 3. Save as Code Asset
                    saveCodeAsset(codeAsset);
                    setSavedAssets(getCodeAssets());

                } catch (e: any) {
                    throw new Error(`Script Error: ${e.message}`);
                }

            } else {
                // Render as image
                const imageUrl = await renderCodeToImage(codeAsset);
                const asset = createAssetFromCode(codeAsset, imageUrl, MediaType.IMAGE);

                onAddAsset(asset);
                saveCodeAsset({ ...codeAsset, thumbnail: imageUrl });
                setSavedAssets(getCodeAssets());

                alert(`✅ Image asset created: "${assetName}"`);
            }
        } catch (error: any) {
            console.error('Rendering error:', error);
            alert(`❌ Rendering failed: ${error.message}`);
        } finally {
            setRendering(false);
            setRenderProgress(0);
        }
    };

    const loadTemplate = (template: CodeTemplate) => {
        setHtml(template.html);
        setCss(template.css);
        setJs(template.js);
        setAssetName(template.name);
        setPreviewKey(prev => prev + 1);
    };

    const loadSavedAsset = (asset: CodeAsset) => {
        setHtml(asset.html);
        setCss(asset.css);
        setJs(asset.js);
        setAssetName(asset.name);
        setWidth(asset.width);
        setHeight(asset.height);
        if (asset.duration) setDuration(asset.duration);
        if (asset.fps) setFps(asset.fps);
        setActiveTab('create');
        setPreviewKey(prev => prev + 1);
    };

    const handleDeleteAsset = (id: string) => {
        if (confirm('Delete this code asset?')) {
            deleteCodeAsset(id);
            setSavedAssets(getCodeAssets());
        }
    };

    const handleAutoFormat = () => {
        if (editorRef.current) {
            editorRef.current.getAction('editor.action.formatDocument').run();
        }
    };

    const handleAiWrite = async () => {
        const userPrompt = prompt(`What ${codeTab.toUpperCase()} code should I write?`);
        if (!userPrompt) return;

        setIsAiGenerating(true);
        try {
            const code = await generateCodeSnippet(userPrompt, codeTab);
            if (code) {
                if (codeTab === 'html') setHtml(prev => prev + '\n' + code);
                else if (codeTab === 'css') setCss(prev => prev + '\n' + code);
                else setJs(prev => prev + '\n' + code);

                // Trigger auto-format after insertion
                setTimeout(() => handleAutoFormat(), 100);
            }
        } catch (err) {
            alert('Failed to generate code');
        } finally {
            setIsAiGenerating(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#18181b]">
            {/* Main Content Area */}
            <div className="flex-1 flex overflow-hidden">

                {/* Editor Column */}
                <div className="flex-1 flex flex-col h-full overflow-hidden">
                    {/* Tabs Header */}
                    <div className="flex items-center justify-between border-b border-[#27272a] pr-2">
                        <div className="flex">
                            <button
                                onClick={() => setActiveTab('create')}
                                className={`px-4 py-2 text-xs font-medium border-r border-[#27272a] ${activeTab === 'create' ? 'text-cyan-400 bg-[#27272a]' : 'text-gray-400 hover:text-white'}`}
                            >
                                <Code className="w-4 h-4 inline mr-1" /> Create
                            </button>
                            <button
                                onClick={() => setActiveTab('saved')}
                                className={`px-4 py-2 text-xs font-medium border-r border-[#27272a] ${activeTab === 'saved' ? 'text-cyan-400 bg-[#27272a]' : 'text-gray-400 hover:text-white'}`}
                            >
                                <Save className="w-4 h-4 inline mr-1" /> Saved ({savedAssets.length})
                            </button>
                        </div>
                        {activeTab === 'create' && (
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={handleAiWrite}
                                    disabled={isAiGenerating}
                                    className={`text-xs p-1 rounded hover:bg-[#3f3f46] ${isAiGenerating ? 'text-purple-400 animate-pulse' : 'text-purple-500'}`}
                                    title="AI Write Code"
                                >
                                    {isAiGenerating ? <Loader2 size={16} className="animate-spin" /> : <Bot size={16} />}
                                </button>
                                <button
                                    onClick={handleAutoFormat}
                                    className="text-xs p-1 rounded hover:bg-[#3f3f46] text-yellow-500"
                                    title="Auto Format"
                                >
                                    <Sparkles size={16} />
                                </button>
                                <button
                                    onClick={() => setShowAssetSidebar(!showAssetSidebar)}
                                    className={`text-xs p-1 rounded ${showAssetSidebar ? 'text-cyan-400 bg-cyan-950' : 'text-gray-400'}`}
                                    title="Toggle Asset Sidebar"
                                >
                                    <ImagePlus size={16} />
                                </button>
                                <button
                                    onClick={() => setIsMaximized(!isMaximized)}
                                    className={`text-xs p-1 rounded hover:bg-[#3f3f46] ${isMaximized ? 'text-blue-400' : 'text-gray-400'}`}
                                    title={isMaximized ? "Restore View" : "Maximize Editor"}
                                >
                                    {isMaximized ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-4">
                        {activeTab === 'create' ? (
                            <>
                                {/* Template & Name Row - Hide when maximized */}
                                {!isMaximized && (
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[10px] uppercase text-gray-500 font-bold mb-1 block">Template</label>
                                            <select
                                                value={selectedTemplate}
                                                onChange={(e) => {
                                                    setSelectedTemplate(e.target.value);
                                                    const template = codeTemplates.find(t => t.name === e.target.value);
                                                    if (template) loadTemplate(template);
                                                }}
                                                className="w-full bg-[#27272a] border border-[#3f3f46] rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                                            >
                                                <option value="">-- Load Template --</option>
                                                {codeTemplates.map(t => (
                                                    <option key={t.name} value={t.name}>{t.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] uppercase text-gray-500 font-bold mb-1 block">Asset Name</label>
                                            <input
                                                type="text"
                                                value={assetName}
                                                onChange={(e) => setAssetName(e.target.value)}
                                                className="w-full bg-[#27272a] border border-[#3f3f46] rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Editor Section */}
                                <div className={`border border-[#3f3f46] rounded-md overflow-hidden flex flex-col ${isMaximized ? 'flex-1' : 'h-[280px]'}`}>
                                    <div className="flex bg-[#27272a] border-b border-[#3f3f46]">
                                        <button onClick={() => setCodeTab('html')} className={`px-4 py-1.5 text-xs ${codeTab === 'html' ? 'text-orange-400 bg-[#3f3f46]' : 'text-gray-400 hover:text-white'}`}>HTML</button>
                                        <button onClick={() => setCodeTab('css')} className={`px-4 py-1.5 text-xs ${codeTab === 'css' ? 'text-blue-400 bg-[#3f3f46]' : 'text-gray-400 hover:text-white'}`}>CSS</button>
                                        <button onClick={() => setCodeTab('js')} className={`px-4 py-1.5 text-xs ${codeTab === 'js' ? 'text-yellow-400 bg-[#3f3f46]' : 'text-gray-400 hover:text-white'}`}>JS</button>
                                    </div>
                                    <div className="flex-1 bg-[#1e1e1e]"
                                        onKeyDown={(e) => e.stopPropagation()}
                                        onKeyUp={(e) => e.stopPropagation()}
                                        onPaste={(e) => e.stopPropagation()}
                                        onCopy={(e) => e.stopPropagation()}
                                        onCut={(e) => e.stopPropagation()}
                                    >
                                        <Editor
                                            height="100%"
                                            language={codeTab === 'html' ? 'html' : codeTab === 'css' ? 'css' : 'javascript'}
                                            value={codeTab === 'html' ? html : codeTab === 'css' ? css : js}
                                            onChange={(value) => {
                                                if (codeTab === 'html') setHtml(value || '');
                                                else if (codeTab === 'css') setCss(value || '');
                                                else setJs(value || '');
                                            }}
                                            theme="vs-dark"
                                            options={{
                                                minimap: { enabled: false },
                                                fontSize: 12,
                                                lineNumbers: 'off',
                                                padding: { top: 10 },
                                                scrollBeyondLastLine: false,
                                                overviewRulerLanes: 0,
                                                renderLineHighlight: 'none',
                                                contextmenu: true,
                                                readOnly: false,
                                                automaticLayout: true,
                                            }}
                                            onMount={(editor) => {
                                                editorRef.current = editor;
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* Preview & Output Config - Hide when maximized */}
                                {!isMaximized && (
                                    <>
                                        <div className="grid grid-cols-2 gap-3 h-[180px]">
                                            {/* Preview */}
                                            <div className="flex flex-col">
                                                <label className="text-[10px] uppercase text-gray-500 font-bold mb-1 flex justify-between">
                                                    <span>Preview</span>
                                                    <span className="text-[9px] font-normal cursor-pointer hover:text-white" onClick={() => setPreviewKey(k => k + 1)}>Reload</span>
                                                </label>
                                                <div className="flex-1 relative border border-[#3f3f46] rounded overflow-hidden bg-[#09090b]">
                                                    {transparentBg && <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#4b5563 1px, transparent 1px)', backgroundSize: '10px 10px' }} />}
                                                    <iframe
                                                        key={previewKey}
                                                        ref={previewIframeRef}
                                                        className="absolute inset-0 w-full h-full"
                                                        sandbox="allow-scripts allow-same-origin"
                                                    />
                                                </div>
                                            </div>

                                            {/* Config */}
                                            <div className="space-y-3">
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                        <label className="text-[10px] uppercase text-gray-500 font-bold block">W</label>
                                                        <input type="number" value={width} onChange={e => setWidth(parseInt(e.target.value))} className="w-full bg-[#27272a] border border-[#3f3f46] rounded px-1 py-1 text-xs text-white" />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] uppercase text-gray-500 font-bold block">H</label>
                                                        <input type="number" value={height} onChange={e => setHeight(parseInt(e.target.value))} className="w-full bg-[#27272a] border border-[#3f3f46] rounded px-1 py-1 text-xs text-white" />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                        <label className="text-[10px] uppercase text-gray-500 font-bold block">Duration</label>
                                                        <input type="number" value={duration} onChange={e => setDuration(parseInt(e.target.value))} className="w-full bg-[#27272a] border border-[#3f3f46] rounded px-1 py-1 text-xs text-white" />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] uppercase text-gray-500 font-bold block">FPS</label>
                                                        <select value={fps} onChange={e => setFps(parseInt(e.target.value))} className="w-full bg-[#27272a] border border-[#3f3f46] rounded px-1 py-1 text-xs text-white">
                                                            <option value={24}>24</option>
                                                            <option value={30}>30</option>
                                                            <option value={60}>60</option>
                                                        </select>
                                                    </div>
                                                </div>

                                                <div className="border border-[#3f3f46] rounded p-2 bg-[#27272a]">
                                                    <div className="text-[10px] text-gray-400 mb-1">Detected Type:</div>
                                                    <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                                        {detectedType === 'text' && <Type className="w-3 h-3 text-yellow-400" />}
                                                        {detectedType === 'image' && <ImageIcon className="w-3 h-3 text-blue-400" />}
                                                        {detectedType === 'video' && <Video className="w-3 h-3 text-purple-400" />}
                                                        {detectedType}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="pt-2">
                                            <div className="flex bg-[#27272a] rounded overflow-hidden border border-[#3f3f46]">
                                                <select
                                                    className="bg-transparent text-xs text-white px-2 py-1 outline-none border-r border-[#3f3f46]"
                                                    value={renderType}
                                                    onChange={(e) => setRenderType(e.target.value as any)}
                                                >
                                                    <option value="auto">Auto Detect</option>
                                                    <option value="image">Image (PNG)</option>
                                                    <option value="video">Video (WebM)</option>
                                                    <option value="text">Editable Text</option>
                                                    <option value="transition">Transition</option>
                                                    <option value="animation">Animation</option>
                                                    <option value="filter">Filter / Overlay</option>
                                                </select>
                                                <button
                                                    onClick={() => handleRender()}
                                                    disabled={rendering}
                                                    className="px-3 py-1 flex items-center gap-1.5 hover:bg-[#3f3f46] transition-colors disabled:opacity-50 disabled:cursor-wait"
                                                >
                                                    {rendering ? <Loader2 size={13} className="animate-spin text-blue-400" /> : <Download size={13} className="text-blue-400" />}
                                                    <span className="text-xs font-medium">Bake Asset</span>
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </>
                        ) : (
                            <div className="grid grid-cols-2 gap-2">
                                {savedAssets.map(asset => (
                                    <div key={asset.id} className="relative group border border-[#3f3f46] rounded overflow-hidden aspect-video bg-black">
                                        <img src={asset.thumbnail} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition" />
                                        <div className="absolute inset-x-0 bottom-0 bg-black/80 p-1 text-[10px] truncate">{asset.name}</div>
                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition">
                                            <button onClick={() => loadSavedAsset(asset)} className="p-1.5 bg-blue-600 rounded text-white"><Edit2 size={12} /></button>
                                            <button onClick={() => handleDeleteAsset(asset.id)} className="p-1.5 bg-red-600 rounded text-white"><Trash2 size={12} /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Asset Injection Sidebar (Only in Create Mode) */}
                {activeTab === 'create' && showAssetSidebar && (
                    <div className="w-40 border-l border-[#27272a] flex flex-col bg-[#18181b]">
                        <div className="p-2 border-b border-[#27272a]">
                            <h3 className="text-[10px] uppercase font-bold text-gray-500">Project Assets</h3>
                            <p className="text-[9px] text-gray-600 leading-tight mt-1">Click to inject code</p>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                            {assets.filter(a => a.type === MediaType.IMAGE || a.type === MediaType.VIDEO).length === 0 && (
                                <div className="text-[10px] text-gray-500 text-center py-4">No media assets found</div>
                            )}
                            {assets.filter(a => a.type === MediaType.IMAGE || a.type === MediaType.VIDEO).map(asset => (
                                <div
                                    key={asset.id}
                                    className="group cursor-pointer"
                                    onClick={() => injectAssetCode(asset)}
                                >
                                    <div className="aspect-video bg-black rounded overflow-hidden border border-[#27272a] group-hover:border-cyan-500 transition relative">
                                        {asset.type === MediaType.IMAGE ? (
                                            <img src={asset.src} className="w-full h-full object-cover" />
                                        ) : (
                                            <video src={asset.src} className="w-full h-full object-cover" />
                                        )}
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition">
                                            <Plus size={16} className="text-white" />
                                        </div>
                                    </div>
                                    <div className="mt-1 text-[9px] text-gray-400 truncate px-1 group-hover:text-cyan-400">{asset.name}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
};

export default CodeAssetBrowser;
