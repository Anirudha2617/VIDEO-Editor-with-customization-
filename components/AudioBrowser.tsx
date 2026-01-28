import React, { useState, useRef } from 'react';
import { Search, Play, Pause, Download, Loader2, Music, Volume2 } from 'lucide-react';
import { searchAudio, AudioResult, AUDIO_CATEGORIES, AUDIO_SUGGESTIONS } from '../services/audioLibraryService';
import { Asset, MediaType } from '../models';

import { MediaPipeline } from '../pipelines/media';

interface AudioBrowserProps {
    mediaPipeline: MediaPipeline;
    onAddAudio?: (asset: Asset) => void; // Optional legacy
}

const AudioBrowser: React.FC<AudioBrowserProps> = ({ mediaPipeline, onAddAudio }) => {
    const [query, setQuery] = useState('');
    const [category, setCategory] = useState('all');
    const [results, setResults] = useState<AudioResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [playingId, setPlayingId] = useState<number | null>(null);
    const [downloadingId, setDownloadingId] = useState<number | null>(null);

    const audioRef = useRef<HTMLAudioElement | null>(null);

    const handleSearch = async (searchQuery: string = query, searchCategory: string = category, searchPage: number = 1) => {
        setLoading(true);
        try {
            const { results: audioResults, total: totalResults } = await searchAudio(
                searchQuery,
                searchCategory,
                searchPage,
                20
            );
            setResults(audioResults);
            setTotal(totalResults);
            setPage(searchPage);
        } catch (error) {
            console.error('Search failed:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePlay = (audio: AudioResult) => {
        if (playingId === audio.id) {
            // Pause current audio
            if (audioRef.current) {
                audioRef.current.pause();
            }
            setPlayingId(null);
        } else {
            // Play new audio
            if (audioRef.current) {
                audioRef.current.pause();
            }
            audioRef.current = new Audio(audio.previewUrl);
            audioRef.current.play();
            setPlayingId(audio.id);

            audioRef.current.onended = () => {
                setPlayingId(null);
            };
        }
    };

    const handleDownload = async (audio: AudioResult) => {
        setDownloadingId(audio.id);

        try {
            if (mediaPipeline) {
                await mediaPipeline.addFromUrl(audio.previewUrl, audio.title || 'Downloaded Audio');
            } else {
                // Fallback (or Error)
                // For now, let's just assume pipeline exists or keep legacy if we kept the prop?
                // But I'm removing the prop in interface below, so I should rely on pipeline.
                console.error("MediaPipeline not provided");
            }

            // Show success feedback
            alert(`"${audio.title}" added to your media library!`);
        } catch (error) {
            console.error('Download failed:', error);
            alert('Failed to download audio. Please try again.');
        } finally {
            setDownloadingId(null);
        }
    };

    const formatDuration = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="flex flex-col h-full">
            {/* Search Header */}
            <div className="p-4 border-b border-[#27272a] space-y-3">
                <div className="flex gap-2">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                            placeholder="Search free music and sound effects..."
                            className="w-full bg-[#27272a] border border-[#3f3f46] rounded pl-10 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                        />
                    </div>
                    <button
                        onClick={() => handleSearch()}
                        disabled={loading}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-sm font-medium transition-colors disabled:opacity-50"
                    >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : 'Search'}
                    </button>
                </div>

                {/* Category Filter */}
                <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-400">Category:</label>
                    <select
                        value={category}
                        onChange={(e) => {
                            setCategory(e.target.value);
                            handleSearch(query, e.target.value, 1);
                        }}
                        className="bg-[#27272a] border border-[#3f3f46] rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
                    >
                        {AUDIO_CATEGORIES.map(cat => (
                            <option key={cat.value} value={cat.value}>{cat.label}</option>
                        ))}
                    </select>
                </div>

                {/* Quick Suggestions */}
                <div className="flex flex-wrap gap-1">
                    {AUDIO_SUGGESTIONS.slice(0, 5).map(suggestion => (
                        <button
                            key={suggestion}
                            onClick={() => {
                                setQuery(suggestion);
                                handleSearch(suggestion, category, 1);
                            }}
                            className="px-2 py-1 bg-[#27272a] hover:bg-[#3f3f46] rounded text-[10px] text-gray-300 transition-colors"
                        >
                            {suggestion}
                        </button>
                    ))}
                </div>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto p-4">
                {loading && results.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                        <Loader2 className="animate-spin text-blue-500" size={32} />
                    </div>
                ) : results.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                        <Music size={48} className="mb-4 opacity-50" />
                        <p className="text-sm">Search for free music and sound effects</p>
                        <p className="text-xs mt-1">Powered by Pixabay</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {results.map(audio => (
                            <div
                                key={audio.id}
                                className="bg-[#27272a] hover:bg-[#3f3f46] border border-[#3f3f46] rounded p-3 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    {/* Play Button */}
                                    <button
                                        onClick={() => handlePlay(audio)}
                                        className="w-10 h-10 flex items-center justify-center bg-blue-600 hover:bg-blue-500 rounded-full transition-colors flex-shrink-0"
                                    >
                                        {playingId === audio.id ? (
                                            <Pause size={16} fill="white" />
                                        ) : (
                                            <Play size={16} fill="white" className="ml-0.5" />
                                        )}
                                    </button>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-sm font-medium text-white truncate">{audio.title}</h4>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-xs text-gray-400">{audio.artist}</span>
                                            <span className="text-xs text-gray-600">•</span>
                                            <span className="text-xs text-gray-400">{formatDuration(audio.duration)}</span>
                                        </div>
                                        {audio.tags && (
                                            <p className="text-[10px] text-gray-500 mt-1 truncate">{audio.tags}</p>
                                        )}
                                    </div>

                                    {/* Download Button */}
                                    <button
                                        onClick={() => handleDownload(audio)}
                                        disabled={downloadingId === audio.id}
                                        className="px-3 py-2 bg-green-600 hover:bg-green-500 rounded text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-1.5 flex-shrink-0"
                                    >
                                        {downloadingId === audio.id ? (
                                            <Loader2 size={14} className="animate-spin" />
                                        ) : (
                                            <Download size={14} />
                                        )}
                                        Add
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Results Info */}
                {total > 0 && (
                    <div className="mt-4 text-center text-xs text-gray-500">
                        Showing {results.length} of {total} results
                    </div>
                )}
            </div>
        </div>
    );
};

export default AudioBrowser;
