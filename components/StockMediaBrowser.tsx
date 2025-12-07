import React, { useState } from 'react';
import { Search, Download, Loader2, Image as ImageIcon } from 'lucide-react';
import { searchStockMedia, StockMediaResult, STOCK_MEDIA_SUGGESTIONS, downloadStockMedia } from '../services/stockMediaService';
import { Asset, MediaType } from '../types';

interface StockMediaBrowserProps {
    onAddMedia: (asset: Asset) => void;
}

const StockMediaBrowser: React.FC<StockMediaBrowserProps> = ({ onAddMedia }) => {
    const [query, setQuery] = useState('');
    const [mediaType, setMediaType] = useState<'all' | 'image' | 'video'>('all');
    const [results, setResults] = useState<StockMediaResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [downloadingId, setDownloadingId] = useState<number | null>(null);

    const handleSearch = async (searchQuery: string = query) => {
        setLoading(true);
        try {
            const { results: mediaResults } = await searchStockMedia(searchQuery, mediaType, 1, 20);
            setResults(mediaResults);
        } catch (error) {
            console.error('Search failed:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async (media: StockMediaResult) => {
        setDownloadingId(media.id);

        try {
            const response = await fetch(media.downloadUrl);
            const blob = await response.blob();

            // Create asset
            const mediaUrl = URL.createObjectURL(blob);
            const newAsset: Asset = {
                id: `stock_${Date.now()}_${media.id}`,
                type: media.type === 'video' ? MediaType.VIDEO : MediaType.IMAGE,
                src: mediaUrl,
                name: `Stock ${media.type} - ${media.tags.split(',')[0]}`
            };

            onAddMedia(newAsset);
            alert(`Stock ${media.type} added to your media library!`);
        } catch (error) {
            console.error('Download failed:', error);
            alert('Failed to download. Please try again.');
        } finally {
            setDownloadingId(null);
        }
    };

    return (
        <div className="space-y-3">
            {/* Search Header */}
            <div className="space-y-2">
                <div className="flex gap-2">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                            placeholder="Search free stock images..."
                            className="w-full bg-[#27272a] border border-[#3f3f46] rounded pl-9 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                        />
                    </div>
                    <button
                        onClick={() => handleSearch()}
                        disabled={loading}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-xs font-medium transition-colors disabled:opacity-50"
                    >
                        {loading ? <Loader2 size={14} className="animate-spin" /> : 'Search'}
                    </button>
                </div>

                {/* Quick Suggestions */}
                <div className="flex flex-wrap gap-1">
                    {STOCK_MEDIA_SUGGESTIONS.slice(0, 4).map(suggestion => (
                        <button
                            key={suggestion}
                            onClick={() => {
                                setQuery(suggestion);
                                handleSearch(suggestion);
                            }}
                            className="px-2 py-0.5 bg-[#27272a] hover:bg-[#3f3f46] rounded text-[10px] text-gray-300 transition-colors"
                        >
                            {suggestion}
                        </button>
                    ))}
                </div>
            </div>

            {/* Results Grid */}
            {loading && results.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="animate-spin text-blue-500" size={24} />
                </div>
            ) : results.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-xs">
                    <ImageIcon size={32} className="mx-auto mb-2 opacity-50" />
                    <p>Search for free stock images</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-2">
                    {results.map(media => (
                        <div
                            key={media.id}
                            className="relative group bg-[#27272a] rounded overflow-hidden border border-[#3f3f46] hover:border-blue-500/50 transition-colors"
                        >
                            <img
                                src={media.previewUrl}
                                alt={media.tags}
                                className="w-full aspect-video object-cover"
                            />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <button
                                    onClick={() => handleDownload(media)}
                                    disabled={downloadingId === media.id}
                                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-1"
                                >
                                    {downloadingId === media.id ? (
                                        <Loader2 size={12} className="animate-spin" />
                                    ) : (
                                        <Download size={12} />
                                    )}
                                    Add
                                </button>
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-1">
                                <p className="text-[9px] text-gray-300 truncate">{media.tags.split(',')[0]}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default StockMediaBrowser;
