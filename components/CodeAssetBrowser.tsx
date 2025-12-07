import React, { useState, useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Code, Image as ImageIcon, Video, Type, Play, Save, Trash2, Edit2, Loader2, Download, Sparkles } from 'lucide-react';
import { Asset, MediaType, Clip } from '../types';
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
import { codeTemplates, CodeTemplate } from '../services/codeTemplates';

interface CodeAssetBrowserProps {
    onAddAsset: (asset: Asset) => void;
    onAddTextClip?: (clip: Partial<Clip>) => void;
}

const CodeAssetBrowser: React.FC<CodeAssetBrowserProps> = ({ onAddAsset, onAddTextClip }) => {
    const [activeTab, setActiveTab] = useState<'create' | 'saved'>('create');
    const [codeTab, setCodeTab] = useState<'html' | 'css' | 'js'>('html');

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

    const previewIframeRef = useRef<HTMLIFrameElement>(null);

    // Load saved assets
    useEffect(() => {
        setSavedAssets(getCodeAssets());
    }, []);

    // Update preview
    useEffect(() => {
        const timer = setTimeout(() => {
            updatePreview();
        }, 500); // Debounced

        return () => clearTimeout(timer);
    }, [html, css, js, transparentBg]);

    const updatePreview = () => {
        const iframe = previewIframeRef.current;
        if (!iframe) return;

        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!doc) return;

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
            try {
              ${js}
            } catch (e) {
              console.error('Preview error:', e);
            }
          </script>
        </body>
      </html>
    `);
        doc.close();
    };

    const handleRender = async (type: 'auto' | 'image' | 'video' | 'text') => {
        setRendering(true);
        setRenderProgress(0);

        try {
            const codeAsset: CodeAsset = {
                id: `code_${Date.now()}`,
                name: assetName,
                html,
                css,
                js,
                width,
                height,
                type: type === 'auto' ? analyzeCodeType(html, css, js) : type,
                duration: type === 'video' ? duration : undefined,
                fps: type === 'video' ? fps : undefined,
                createdAt: Date.now(),
            };

            const detectedType = type === 'auto' ? codeAsset.type : type;

            if (detectedType === 'text' && onAddTextClip) {
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

                // Also save the code asset
                saveCodeAsset(codeAsset);
                setSavedAssets(getCodeAssets());

                alert(`✅ Created editable text element: "${assetName}"\nDrag it to the timeline from the Text tab!`);
            } else if (detectedType === 'video') {
                // Render as video
                const videoBlob = await renderCodeToVideo(codeAsset, (progress) => {
                    setRenderProgress(progress);
                });

                const videoUrl = URL.createObjectURL(videoBlob);
                const asset = createAssetFromCode(codeAsset, videoUrl, MediaType.VIDEO);

                onAddAsset(asset);
                saveCodeAsset({ ...codeAsset, thumbnail: videoUrl });
                setSavedAssets(getCodeAssets());

                alert(`✅ Video asset created: "${assetName}"`);
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

    const detectedType = analyzeCodeType(html, css, js);

    return (
        <div className="flex flex-col h-full">
            {/* Tabs */}
            <div className="flex border-b border-[#27272a]">
                <button
                    onClick={() => setActiveTab('create')}
                    className={`flex-1 py-2 text-xs font-medium ${activeTab === 'create' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-400 hover:text-white'
                        }`}
                >
                    <Code className="w-4 h-4 inline mr-1" />
                    Create
                </button>
                <button
                    onClick={() => setActiveTab('saved')}
                    className={`flex-1 py-2 text-xs font-medium ${activeTab === 'saved' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-400 hover:text-white'
                        }`}
                >
                    <Save className="w-4 h-4 inline mr-1" />
                    Saved ({savedAssets.length})
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {activeTab === 'create' ? (
                    <div className="p-3 space-y-3">
                        {/* Template Selector */}
                        <div>
                            <label className="text-xs text-gray-400 mb-1 block">Template</label>
                            <select
                                value={selectedTemplate}
                                onChange={(e) => {
                                    setSelectedTemplate(e.target.value);
                                    const template = codeTemplates.find(t => t.name === e.target.value);
                                    if (template) loadTemplate(template);
                                }}
                                className="w-full bg-[#27272a] border border-[#3f3f46] rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                            >
                                <option value="">-- Select Template --</option>
                                {codeTemplates.map(t => (
                                    <option key={t.name} value={t.name}>{t.name} ({t.category})</option>
                                ))}
                            </select>
                        </div>

                        {/* Asset Name */}
                        <div>
                            <label className="text-xs text-gray-400 mb-1 block">Asset Name</label>
                            <input
                                type="text"
                                value={assetName}
                                onChange={(e) => setAssetName(e.target.value)}
                                className="w-full bg-[#27272a] border border-[#3f3f46] rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                            />
                        </div>

                        {/* Code Editor Tabs */}
                        <div>
                            <div className="flex border-b border-[#3f3f46] mb-2">
                                <button
                                    onClick={() => setCodeTab('html')}
                                    className={`px-3 py-1 text-xs ${codeTab === 'html' ? 'text-orange-400 border-b-2 border-orange-400' : 'text-gray-400'}`}
                                >
                                    HTML
                                </button>
                                <button
                                    onClick={() => setCodeTab('css')}
                                    className={`px-3 py-1 text-xs ${codeTab === 'css' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400'}`}
                                >
                                    CSS
                                </button>
                                <button
                                    onClick={() => setCodeTab('js')}
                                    className={`px-3 py-1 text-xs ${codeTab === 'js' ? 'text-yellow-400 border-b-2 border-yellow-400' : 'text-gray-400'}`}
                                >
                                    JavaScript
                                </button>
                            </div>

                            {/* Monaco Editor */}
                            <div className="border border-[#3f3f46] rounded overflow-hidden" style={{ height: '200px' }}>
                                <Editor
                                    height="200px"
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
                                        lineNumbers: 'on',
                                        scrollBeyondLastLine: false,
                                        automaticLayout: true,
                                    }}
                                />
                            </div>
                        </div>

                        {/* Live Preview */}
                        <div>
                            <label className="text-xs text-gray-400 mb-1 block">Live Preview</label>
                            <div className="relative border border-[#3f3f46] rounded overflow-hidden bg-[#09090b]" style={{ height: '150px' }}>
                                {/* Checkerboard background */}
                                {transparentBg && (
                                    <div
                                        className="absolute inset-0"
                                        style={{
                                            backgroundImage: `
                        linear-gradient(45deg, #333 25%, transparent 25%),
                        linear-gradient(-45deg, #333 25%, transparent 25%),
                        linear-gradient(45deg, transparent 75%, #333 75%),
                        linear-gradient(-45deg, transparent 75%, #333 75%)
                      `,
                                            backgroundSize: '20px 20px',
                                            backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
                                        }}
                                    />
                                )}
                                <iframe
                                    key={previewKey}
                                    ref={previewIframeRef}
                                    className="absolute inset-0 w-full h-full"
                                    sandbox="allow-scripts allow-same-origin"
                                />
                            </div>
                        </div>

                        {/* Settings */}
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-xs text-gray-400 mb-1 block">Width</label>
                                <input
                                    type="number"
                                    value={width}
                                    onChange={(e) => setWidth(parseInt(e.target.value))}
                                    className="w-full bg-[#27272a] border border-[#3f3f46] rounded px-2 py-1 text-xs text-white"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 mb-1 block">Height</label>
                                <input
                                    type="number"
                                    value={height}
                                    onChange={(e) => setHeight(parseInt(e.target.value))}
                                    className="w-full bg-[#27272a] border border-[#3f3f46] rounded px-2 py-1 text-xs text-white"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 mb-1 block">Duration (s)</label>
                                <input
                                    type="number"
                                    value={duration}
                                    onChange={(e) => setDuration(parseInt(e.target.value))}
                                    className="w-full bg-[#27272a] border border-[#3f3f46] rounded px-2 py-1 text-xs text-white"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 mb-1 block">FPS</label>
                                <select
                                    value={fps}
                                    onChange={(e) => setFps(parseInt(e.target.value))}
                                    className="w-full bg-[#27272a] border border-[#3f3f46] rounded px-2 py-1 text-xs text-white"
                                >
                                    <option value={24}>24</option>
                                    <option value={30}>30</option>
                                    <option value={60}>60</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={transparentBg}
                                onChange={(e) => setTransparentBg(e.target.checked)}
                                id="transparent-bg"
                            />
                            <label htmlFor="transparent-bg" className="text-xs text-gray-400">Transparent Background</label>
                        </div>

                        {/* Detected Type */}
                        <div className="bg-[#27272a] border border-[#3f3f46] rounded p-2">
                            <div className="text-xs text-gray-400 mb-1">Detected Type:</div>
                            <div className="text-sm font-medium">
                                {detectedType === 'text' && <><Type className="w-4 h-4 inline text-yellow-400" /> Text Element (Editable)</>}
                                {detectedType === 'image' && <><ImageIcon className="w-4 h-4 inline text-blue-400" /> Static Image</>}
                                {detectedType === 'video' && <><Video className="w-4 h-4 inline text-purple-400" /> Animated Video</>}
                            </div>
                        </div>

                        {/* Render Buttons */}
                        <div className="space-y-2">
                            {detectedType === 'text' && (
                                <button
                                    onClick={() => handleRender('text')}
                                    disabled={rendering}
                                    className="w-full bg-yellow-600 hover:bg-yellow-500 text-white py-2 rounded text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {rendering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Type className="w-4 h-4" />}
                                    Create as Text Element
                                </button>
                            )}

                            <button
                                onClick={() => handleRender('image')}
                                disabled={rendering}
                                className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2 rounded text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {rendering ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                                Bake as Image
                            </button>

                            <button
                                onClick={() => handleRender('video')}
                                disabled={rendering}
                                className="w-full bg-purple-600 hover:bg-purple-500 text-white py-2 rounded text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {rendering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
                                Bake as Video
                            </button>
                        </div>

                        {/* Progress */}
                        {rendering && renderProgress > 0 && (
                            <div className="bg-[#27272a] rounded-full h-2 overflow-hidden">
                                <div
                                    className="bg-cyan-500 h-full transition-all"
                                    style={{ width: `${renderProgress}%` }}
                                />
                            </div>
                        )}
                    </div>
                ) : (
                    // Saved Assets
                    <div className="p-3">
                        {savedAssets.length === 0 ? (
                            <div className="text-center text-gray-500 py-8">
                                <Code className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No saved code assets yet</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-2">
                                {savedAssets.map(asset => (
                                    <div
                                        key={asset.id}
                                        className="bg-[#27272a] border border-[#3f3f46] rounded overflow-hidden hover:border-cyan-500 transition group"
                                    >
                                        {asset.thumbnail && (
                                            <div className="aspect-video bg-black relative">
                                                <img src={asset.thumbnail} alt={asset.name} className="w-full h-full object-contain" />
                                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => loadSavedAsset(asset)}
                                                        className="p-2 bg-blue-600 hover:bg-blue-500 rounded"
                                                        title="Edit"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteAsset(asset.id)}
                                                        className="p-2 bg-red-600 hover:bg-red-500 rounded"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                        <div className="p-2">
                                            <div className="text-xs text-white truncate">{asset.name}</div>
                                            <div className="text-[10px] text-gray-500">
                                                {asset.type} • {asset.width}x{asset.height}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CodeAssetBrowser;
