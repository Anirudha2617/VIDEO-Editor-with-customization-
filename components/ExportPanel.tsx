import React, { useEffect } from 'react';
import { Download, X, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { ExportSettings } from '../types';

interface ExportPanelProps {
    settings: ExportSettings;
    onUpdateSettings: (settings: ExportSettings) => void;
    onStartExport: () => void;
    onCancelExport: () => void;
    onClose: () => void;
    isExporting: boolean;
    progress: number; // 0 to 100
    currentTime: number;
    status: 'idle' | 'exporting' | 'completed' | 'cancelled';
    maxDuration: number;
}

const ExportPanel: React.FC<ExportPanelProps> = ({
    settings,
    onUpdateSettings,
    onStartExport,
    onCancelExport,
    onClose,
    isExporting,
    progress,
    currentTime,
    status,
    maxDuration
}) => {

    // Format helpers
    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 10);
        return `${m}:${s.toString().padStart(2, '0')}.${ms}`;
    };

    return (
        <div className="w-[280px] bg-[#18181b] border-l border-[#27272a] flex flex-col h-full z-20">
            {/* Header */}
            <div className="h-12 border-b border-[#27272a] flex items-center justify-between px-4 bg-[#202024]">
                <span className="font-semibold text-sm text-gray-200 flex items-center gap-2">
                    <Download size={14} className="text-blue-400" /> Export Video
                </span>
                {!isExporting && (
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <X size={16} />
                    </button>
                )}
            </div>

            <div className="p-4 flex-1 overflow-y-auto space-y-6">

                {/* Settings Form */}
                <div className={`space-y-4 ${isExporting ? 'opacity-50 pointer-events-none' : ''}`}>
                    <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-gray-500">Filename</label>
                        <input
                            type="text"
                            value={settings.filename}
                            onChange={(e) => onUpdateSettings({ ...settings, filename: e.target.value })}
                            className="w-full bg-[#09090b] border border-[#3f3f46] rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 transition"
                            placeholder="my_video"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-gray-500">Resolution</label>
                        <select
                            value={settings.resolution}
                            onChange={(e) => onUpdateSettings({ ...settings, resolution: e.target.value as any })}
                            className="w-full bg-[#09090b] border border-[#3f3f46] rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 transition"
                        >
                            <option value="720p">720p (HD)</option>
                            <option value="1080p">1080p (Full HD)</option>
                            <option value="4k">4K (Ultra HD)</option>
                            <option value="custom">Custom</option>
                        </select>

                        {settings.resolution === 'custom' && (
                            <div className="flex items-center gap-2 mt-2">
                                <div className="flex-1">
                                    <label className="text-[9px] text-gray-500 mb-0.5 block">Width</label>
                                    <input
                                        type="number"
                                        value={settings.width || 1920}
                                        onChange={(e) => onUpdateSettings({ ...settings, width: Number(e.target.value) })}
                                        className="w-full bg-[#09090b] border border-[#3f3f46] rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 transition"
                                    />
                                </div>
                                <span className="text-gray-500 pt-3">x</span>
                                <div className="flex-1">
                                    <label className="text-[9px] text-gray-500 mb-0.5 block">Height</label>
                                    <input
                                        type="number"
                                        value={settings.height || 1080}
                                        onChange={(e) => onUpdateSettings({ ...settings, height: Number(e.target.value) })}
                                        className="w-full bg-[#09090b] border border-[#3f3f46] rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 transition"
                                    />
                                </div>
                            </div>
                        )}
                        <p className="text-[10px] text-gray-600">Higher resolutions take longer to render.</p>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-gray-500">Quality / Bitrate</label>
                        <select
                            value={settings.quality}
                            onChange={(e) => onUpdateSettings({ ...settings, quality: e.target.value as any })}
                            className="w-full bg-[#09090b] border border-[#3f3f46] rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 transition"
                        >
                            <option value="high">High (Best)</option>
                            <option value="medium">Medium (Balanced)</option>
                            <option value="low">Low (Fast)</option>
                        </select>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-gray-500">Frame Rate (FPS)</label>
                        <select
                            value={settings.fps || 30}
                            onChange={(e) => onUpdateSettings({ ...settings, fps: Number(e.target.value) })}
                            className="w-full bg-[#09090b] border border-[#3f3f46] rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 transition"
                        >
                            <option value="24">24 fps (Cinematic)</option>
                            <option value="30">30 fps (Standard)</option>
                            <option value="60">60 fps (Smooth)</option>
                        </select>
                        <p className="text-[10px] text-gray-600">Higher FPS = smoother but slower export.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#27272a]">
                        <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold text-gray-500">Start Time</label>
                            <input
                                type="number"
                                min="0"
                                max={settings.endTime}
                                step="0.1"
                                value={settings.startTime}
                                onChange={(e) => onUpdateSettings({ ...settings, startTime: Math.max(0, parseFloat(e.target.value)) })}
                                className="w-full bg-[#09090b] border border-[#3f3f46] rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 transition"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold text-gray-500">End Time</label>
                            <input
                                type="number"
                                min={settings.startTime}
                                max={maxDuration + 60} // Allow a bit of buffer if needed
                                step="0.1"
                                value={settings.endTime}
                                onChange={(e) => onUpdateSettings({ ...settings, endTime: parseFloat(e.target.value) })}
                                className="w-full bg-[#09090b] border border-[#3f3f46] rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 transition"
                            />
                        </div>
                    </div>
                    <p className="text-[10px] text-gray-500 text-center">
                        Total Duration: {Math.max(0, settings.endTime - settings.startTime).toFixed(1)}s
                    </p>
                </div>

                {/* Status / Progress Area */}
                {status === 'idle' && (
                    <div className="pt-4 border-t border-[#27272a] mt-auto">
                        <div className="bg-blue-900/20 border border-blue-900/50 rounded p-3 mb-4">
                            <p className="text-[10px] text-blue-200">
                                The video will play from {formatTime(settings.startTime)} to {formatTime(settings.endTime)} to capture the render. Please do not switch tabs.
                            </p>
                        </div>
                        <button
                            onClick={onStartExport}
                            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded text-xs font-bold transition shadow-lg shadow-blue-900/20"
                        >
                            Start Export
                        </button>
                    </div>
                )}

                {status === 'exporting' && (
                    <div className="pt-4 border-t border-[#27272a] space-y-4 animate-in fade-in duration-300">
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs text-gray-300 font-medium">
                                <span>Rendering...</span>
                                <span>{Math.round(progress)}%</span>
                            </div>
                            <div className="w-full bg-[#27272a] h-2 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-blue-500 transition-all duration-100 ease-linear"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                            <p className="text-[10px] text-gray-500 font-mono text-center">
                                {currentTime.toFixed(1)}s / {settings.endTime.toFixed(1)}s
                            </p>
                        </div>

                        <button
                            onClick={onCancelExport}
                            className="w-full flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 py-2 rounded text-xs font-medium transition"
                        >
                            Cancel
                        </button>
                    </div>
                )}

                {status === 'completed' && (
                    <div className="pt-4 border-t border-[#27272a] text-center space-y-4">
                        <div className="flex flex-col items-center gap-2 text-green-500">
                            <CheckCircle2 size={32} />
                            <span className="font-semibold text-sm">Export Complete!</span>
                        </div>
                        <p className="text-[10px] text-gray-400">
                            Your download should start automatically.
                        </p>
                        <button
                            onClick={onClose}
                            className="w-full bg-[#27272a] hover:bg-[#3f3f46] text-white py-2 rounded text-xs font-medium transition"
                        >
                            Close
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ExportPanel;
