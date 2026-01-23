
import React, { useState } from 'react';
import { Asset, MediaType } from '../../types';
import { generateImageAsset, generateVideoAsset, generateAudioAsset, generateTTSAsset } from '../../services/geminiService';
import {
    ImageIcon, Video, Music, Mic, Sparkles, Loader2, Wand2, Layers,
    PlayCircle, Download, RefreshCw
} from 'lucide-react';

interface AIPanelProps {
    onAddAsset: (asset: Asset) => void;
}

type AITab = 'image' | 'video' | 'audio' | 'tts';

const AIPanel: React.FC<AIPanelProps> = ({ onAddAsset }) => {
    const [activeTab, setActiveTab] = useState<AITab>('image');

    // Generator States
    const [imagePrompt, setImagePrompt] = useState('');
    const [videoPrompt, setVideoPrompt] = useState('');
    const [audioPrompt, setAudioPrompt] = useState('');
    const [audioType, setAudioType] = useState<'sfx' | 'music'>('music');
    const [ttsText, setTtsText] = useState('');
    const [ttsVoice, setTtsVoice] = useState('neutral');

    // Loading & Status
    const [isGenerating, setIsGenerating] = useState(false);
    const [status, setStatus] = useState<string | null>(null);

    const handleGenerate = async () => {
        setIsGenerating(true);
        setStatus('Initializing AI...');

        try {
            let assetUrl = '';
            let assetType: MediaType = MediaType.IMAGE;
            let assetName = '';

            if (activeTab === 'image') {
                setStatus('Dreaming up visuals...');
                assetUrl = await generateImageAsset(imagePrompt);
                assetType = MediaType.IMAGE;
                assetName = imagePrompt.slice(0, 20) || 'AI Image';
            }
            else if (activeTab === 'video') {
                setStatus('Rendering video sequence...');
                assetUrl = await generateVideoAsset(videoPrompt);
                assetType = MediaType.VIDEO;
                assetName = videoPrompt.slice(0, 20) || 'AI Video';
            }
            else if (activeTab === 'audio') {
                setStatus('Composing audio...');
                assetUrl = await generateAudioAsset(audioPrompt, audioType);
                assetType = MediaType.AUDIO;
                assetName = audioPrompt.slice(0, 20) || 'AI Audio';
            }
            else if (activeTab === 'tts') {
                setStatus('Synthesizing speech...');
                assetUrl = await generateTTSAsset(ttsText, ttsVoice);
                assetType = MediaType.AUDIO;
                assetName = 'TTS: ' + ttsText.slice(0, 15);
            }

            // Create new asset
            const newAsset: Asset = {
                id: crypto.randomUUID(),
                type: assetType,
                src: assetUrl,
                name: assetName,
            };

            onAddAsset(newAsset);
            setStatus('Assets created successfully!');
            setTimeout(() => setStatus(null), 3000);

        } catch (error) {
            console.error(error);
            setStatus('Generation failed. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#18181b] text-xs">
            {/* Tabs */}
            <div className="flex items-center p-1 bg-[#202024] border-b border-[#27272a] gap-1 overflow-x-auto custom-scrollbar">
                <button
                    onClick={() => setActiveTab('image')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md transition-all ${activeTab === 'image' ? 'bg-[#27272a] text-blue-400 font-medium shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                >
                    <ImageIcon size={14} /> Image
                </button>
                <button
                    onClick={() => setActiveTab('video')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md transition-all ${activeTab === 'video' ? 'bg-[#27272a] text-purple-400 font-medium shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                >
                    <Video size={14} /> Video
                </button>
                <button
                    onClick={() => setActiveTab('audio')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md transition-all ${activeTab === 'audio' ? 'bg-[#27272a] text-green-400 font-medium shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                >
                    <Music size={14} /> Audio
                </button>
                <button
                    onClick={() => setActiveTab('tts')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md transition-all ${activeTab === 'tts' ? 'bg-[#27272a] text-orange-400 font-medium shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                >
                    <Mic size={14} /> TTS
                </button>
            </div>

            {/* Content Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                <div className="space-y-6">

                    {/* Header Info */}
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded p-3">
                        <h3 className="text-blue-200 font-semibold mb-1 flex items-center gap-2">
                            <Sparkles size={12} />
                            {activeTab === 'image' && 'Imagine Anything'}
                            {activeTab === 'video' && 'Text-to-Video'}
                            {activeTab === 'audio' && 'Sound Generator'}
                            {activeTab === 'tts' && 'AI Voiceover'}
                        </h3>
                        <p className="text-blue-300/70 text-[10px] leading-relaxed">
                            {activeTab === 'image' && 'Generate unique, high-quality images using advanced diffusion models. Just describe what you want to see.'}
                            {activeTab === 'video' && 'Create short video clips from text prompts using Google Veo. Perfect for b-roll and transitions.'}
                            {activeTab === 'audio' && 'Compose background music or generate sound effects for your timeline. Select type and describe the vibe.'}
                            {activeTab === 'tts' && 'Turn text into lifelike speech. Choose a voice style and input your script to generate a voiceover.'}
                        </p>
                    </div>

                    {/* Inputs */}
                    <div className="space-y-4">

                        {/* Image Input */}
                        {activeTab === 'image' && (
                            <div className="space-y-2">
                                <label className="text-[10px] uppercase font-bold text-gray-500">Prompt</label>
                                <textarea
                                    value={imagePrompt}
                                    onChange={(e) => setImagePrompt(e.target.value)}
                                    placeholder="A futuristic city with neon lights, cinematic lighting..."
                                    className="w-full h-24 bg-[#09090b] border border-[#3f3f46] rounded-md p-3 text-white focus:outline-none focus:border-blue-500 resize-none placeholder:text-gray-600 transition-colors"
                                />
                            </div>
                        )}

                        {/* Video Input */}
                        {activeTab === 'video' && (
                            <div className="space-y-2">
                                <label className="text-[10px] uppercase font-bold text-gray-500">Video Description</label>
                                <textarea
                                    value={videoPrompt}
                                    onChange={(e) => setVideoPrompt(e.target.value)}
                                    placeholder="Drone shot of a mountain range at sunset, highly detailed, 4k..."
                                    className="w-full h-24 bg-[#09090b] border border-[#3f3f46] rounded-md p-3 text-white focus:outline-none focus:border-purple-500 resize-none placeholder:text-gray-600 transition-colors"
                                />
                                <p className="text-[10px] text-gray-500 italic">Note: Video generation may take 1-2 minutes.</p>
                            </div>
                        )}

                        {/* Audio Input */}
                        {activeTab === 'audio' && (
                            <>
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-bold text-gray-500">Type</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => setAudioType('music')}
                                            className={`py-2 rounded border transition-colors ${audioType === 'music' ? 'bg-green-500/20 border-green-500/50 text-green-300' : 'bg-[#27272a] border-transparent text-gray-400 hover:text-white'}`}
                                        >
                                            Background Music
                                        </button>
                                        <button
                                            onClick={() => setAudioType('sfx')}
                                            className={`py-2 rounded border transition-colors ${audioType === 'sfx' ? 'bg-green-500/20 border-green-500/50 text-green-300' : 'bg-[#27272a] border-transparent text-gray-400 hover:text-white'}`}
                                        >
                                            Sound Effect
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-bold text-gray-500">Description</label>
                                    <textarea
                                        value={audioPrompt}
                                        onChange={(e) => setAudioPrompt(e.target.value)}
                                        placeholder={audioType === 'music' ? "Lo-fi hip hop beat for studying..." : "Laser gun sound effect, sci-fi..."}
                                        className="w-full h-20 bg-[#09090b] border border-[#3f3f46] rounded-md p-3 text-white focus:outline-none focus:border-green-500 resize-none placeholder:text-gray-600 transition-colors"
                                    />
                                </div>
                            </>
                        )}

                        {/* TTS Input */}
                        {activeTab === 'tts' && (
                            <>
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-bold text-gray-500">Voice Style</label>
                                    <select
                                        value={ttsVoice}
                                        onChange={(e) => setTtsVoice(e.target.value)}
                                        className="w-full bg-[#09090b] border border-[#3f3f46] rounded p-2 text-white outline-none focus:border-orange-500"
                                    >
                                        <option value="neutral">Neutral (Narrator)</option>
                                        <option value="energetic">Energetic (Promo)</option>
                                        <option value="calm">Calm (Meditation)</option>
                                        <option value="robot">Robotic (Sci-Fi)</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-bold text-gray-500">Script</label>
                                    <textarea
                                        value={ttsText}
                                        onChange={(e) => setTtsText(e.target.value)}
                                        placeholder="Enter the text you want the AI to speak..."
                                        className="w-full h-24 bg-[#09090b] border border-[#3f3f46] rounded-md p-3 text-white focus:outline-none focus:border-orange-500 resize-none placeholder:text-gray-600 transition-colors"
                                    />
                                </div>
                            </>
                        )}

                        {/* Generate Button */}
                        <div className="pt-2">
                            <button
                                onClick={handleGenerate}
                                disabled={isGenerating || (activeTab === 'image' && !imagePrompt) || (activeTab === 'video' && !videoPrompt) || (activeTab === 'audio' && !audioPrompt) || (activeTab === 'tts' && !ttsText)}
                                className={`w-full py-3 rounded-md font-bold text-sm shadow-xl flex items-center justify-center gap-2 transition-all transform active:scale-95
                                    ${activeTab === 'image' ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/20' : ''}
                                    ${activeTab === 'video' ? 'bg-purple-600 hover:bg-purple-500 shadow-purple-900/20' : ''}
                                    ${activeTab === 'audio' ? 'bg-green-600 hover:bg-green-500 shadow-green-900/20' : ''}
                                    ${activeTab === 'tts' ? 'bg-orange-600 hover:bg-orange-500 shadow-orange-900/20' : ''}
                                    disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed
                                `}
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" /> Generating...
                                    </>
                                ) : (
                                    <>
                                        <Wand2 size={16} /> Generate {activeTab === 'tts' ? 'Voiceover' : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Status Message */}
                        {status && (
                            <div className="text-center animate-in fade-in slide-in-from-bottom-2">
                                <span className="text-[10px] font-medium text-gray-400 bg-[#27272a] px-3 py-1 rounded-full border border-white/5">
                                    {status}
                                </span>
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </div>
    );
};

export default AIPanel;
