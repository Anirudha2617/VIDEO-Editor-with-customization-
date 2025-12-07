import React, { useState, useEffect } from 'react';
import { Clip, MediaType } from '../../types';
import { Volume2, VolumeX, TrendingUp, TrendingDown, Music } from 'lucide-react';

interface AudioSettingsProps {
    clip: Clip;
    onUpdate: (updates: Partial<Clip>) => void;
}

const AudioSettings: React.FC<AudioSettingsProps> = ({ clip, onUpdate }) => {
    // Initialize audio data with defaults if not present
    const audioData = clip.audioData || {
        volume: 1,
        fadeIn: 0,
        fadeOut: 0,
        muted: false
    };

    const [volume, setVolume] = useState(audioData.volume);
    const [fadeIn, setFadeIn] = useState(audioData.fadeIn);
    const [fadeOut, setFadeOut] = useState(audioData.fadeOut);
    const [muted, setMuted] = useState(audioData.muted);

    // Only show audio settings for audio clips or clips with audio
    if (clip.type !== MediaType.AUDIO && clip.type !== MediaType.VIDEO) {
        return null;
    }

    const handleVolumeChange = (newVolume: number) => {
        setVolume(newVolume);
        onUpdate({
            audioData: { ...audioData, volume: newVolume }
        });
    };

    const handleFadeInChange = (newFadeIn: number) => {
        setFadeIn(newFadeIn);
        onUpdate({
            audioData: { ...audioData, fadeIn: newFadeIn }
        });
    };

    const handleFadeOutChange = (newFadeOut: number) => {
        setFadeOut(newFadeOut);
        onUpdate({
            audioData: { ...audioData, fadeOut: newFadeOut }
        });
    };

    const handleMuteToggle = () => {
        const newMuted = !muted;
        setMuted(newMuted);
        onUpdate({
            audioData: { ...audioData, muted: newMuted }
        });
    };

    const volumePercentage = Math.round(volume * 100);

    return (
        <div className="bg-[#18181b] rounded-lg border border-[#27272a] p-4 space-y-4">
            <div className="flex items-center gap-2 mb-3">
                <Music className="w-4 h-4 text-green-400" />
                <h3 className="text-sm font-semibold text-white">Audio Settings</h3>
            </div>

            {/* Volume Control */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <label className="text-xs text-gray-400 flex items-center gap-2">
                        {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                        Volume
                    </label>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-white font-mono">{volumePercentage}%</span>
                        <button
                            onClick={handleMuteToggle}
                            className={`p-1 rounded text-xs ${muted
                                    ? 'bg-red-600 hover:bg-red-500 text-white'
                                    : 'bg-[#27272a] hover:bg-[#3f3f46] text-gray-400'
                                }`}
                            title={muted ? 'Unmute' : 'Mute'}
                        >
                            {muted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <input
                        type="range"
                        min="0"
                        max="2"
                        step="0.01"
                        value={volume}
                        onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                        disabled={muted}
                        className="flex-1 h-2 bg-[#27272a] rounded-lg appearance-none cursor-pointer accent-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{
                            background: muted ? '#27272a' : `linear-gradient(to right, #22c55e 0%, #22c55e ${volumePercentage / 2}%, #27272a ${volumePercentage / 2}%, #27272a 100%)`
                        }}
                    />
                    <span className="text-[10px] text-gray-500 w-8 text-right">200%</span>
                </div>

                {/* Volume Meter Visualization */}
                <div className="h-1.5 bg-[#27272a] rounded-full overflow-hidden">
                    <div
                        className={`h-full transition-all ${muted ? 'bg-gray-600' :
                                volume > 1.5 ? 'bg-red-500' :
                                    volume > 1 ? 'bg-yellow-500' :
                                        'bg-green-500'
                            }`}
                        style={{ width: `${Math.min(volumePercentage / 2, 100)}%` }}
                    />
                </div>
            </div>

            {/* Fade In Control */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <label className="text-xs text-gray-400 flex items-center gap-2">
                        <TrendingUp className="w-3.5 h-3.5" />
                        Fade In
                    </label>
                    <span className="text-xs text-white font-mono">{fadeIn.toFixed(1)}s</span>
                </div>
                <input
                    type="range"
                    min="0"
                    max={Math.min(clip.duration / 2, 5)}
                    step="0.1"
                    value={fadeIn}
                    onChange={(e) => handleFadeInChange(parseFloat(e.target.value))}
                    className="w-full h-2 bg-[#27272a] rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
            </div>

            {/* Fade Out Control */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <label className="text-xs text-gray-400 flex items-center gap-2">
                        <TrendingDown className="w-3.5 h-3.5" />
                        Fade Out
                    </label>
                    <span className="text-xs text-white font-mono">{fadeOut.toFixed(1)}s</span>
                </div>
                <input
                    type="range"
                    min="0"
                    max={Math.min(clip.duration / 2, 5)}
                    step="0.1"
                    value={fadeOut}
                    onChange={(e) => handleFadeOutChange(parseFloat(e.target.value))}
                    className="w-full h-2 bg-[#27272a] rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
            </div>

            {/* Info */}
            <div className="pt-2 border-t border-[#27272a]">
                <p className="text-[10px] text-gray-500">
                    Tip: Volume above 100% may cause distortion
                </p>
            </div>
        </div>
    );
};

export default AudioSettings;
