// Stock Media Service - Free images and videos from Pixabay
// Provides royalty-free stock media for video projects

export interface StockMediaResult {
    id: number;
    type: 'image' | 'video';
    previewUrl: string;
    downloadUrl: string;
    largeUrl: string;
    tags: string;
    user: string;
    width: number;
    height: number;
}

// Sample stock media (works without API key)
const SAMPLE_IMAGES: StockMediaResult[] = [
    {
        id: 1,
        type: 'image',
        previewUrl: 'https://picsum.photos/400/300?random=1',
        downloadUrl: 'https://picsum.photos/1920/1080?random=1',
        largeUrl: 'https://picsum.photos/1920/1080?random=1',
        tags: 'nature, landscape, mountains',
        user: 'Sample',
        width: 1920,
        height: 1080
    },
    {
        id: 2,
        type: 'image',
        previewUrl: 'https://picsum.photos/400/300?random=2',
        downloadUrl: 'https://picsum.photos/1920/1080?random=2',
        largeUrl: 'https://picsum.photos/1920/1080?random=2',
        tags: 'city, urban, architecture',
        user: 'Sample',
        width: 1920,
        height: 1080
    },
    {
        id: 3,
        type: 'image',
        previewUrl: 'https://picsum.photos/400/300?random=3',
        downloadUrl: 'https://picsum.photos/1920/1080?random=3',
        largeUrl: 'https://picsum.photos/1920/1080?random=3',
        tags: 'people, portrait, person',
        user: 'Sample',
        width: 1920,
        height: 1080
    },
    {
        id: 4,
        type: 'image',
        previewUrl: 'https://picsum.photos/400/300?random=4',
        downloadUrl: 'https://picsum.photos/1920/1080?random=4',
        largeUrl: 'https://picsum.photos/1920/1080?random=4',
        tags: 'technology, computer, business',
        user: 'Sample',
        width: 1920,
        height: 1080
    },
    {
        id: 5,
        type: 'image',
        previewUrl: 'https://picsum.photos/400/300?random=5',
        downloadUrl: 'https://picsum.photos/1920/1080?random=5',
        largeUrl: 'https://picsum.photos/1920/1080?random=5',
        tags: 'food, restaurant, cooking',
        user: 'Sample',
        width: 1920,
        height: 1080
    },
    {
        id: 6,
        type: 'image',
        previewUrl: 'https://picsum.photos/400/300?random=6',
        downloadUrl: 'https://picsum.photos/1920/1080?random=6',
        largeUrl: 'https://picsum.photos/1920/1080?random=6',
        tags: 'travel, vacation, beach',
        user: 'Sample',
        width: 1920,
        height: 1080
    },
    {
        id: 7,
        type: 'image',
        previewUrl: 'https://picsum.photos/400/300?random=7',
        downloadUrl: 'https://picsum.photos/1920/1080?random=7',
        largeUrl: 'https://picsum.photos/1920/1080?random=7',
        tags: 'animals, pets, wildlife',
        user: 'Sample',
        width: 1920,
        height: 1080
    },
    {
        id: 8,
        type: 'image',
        previewUrl: 'https://picsum.photos/400/300?random=8',
        downloadUrl: 'https://picsum.photos/1920/1080?random=8',
        largeUrl: 'https://picsum.photos/1920/1080?random=8',
        tags: 'sports, fitness, health',
        user: 'Sample',
        width: 1920,
        height: 1080
    }
];

export const searchStockMedia = async (
    query: string = '',
    mediaType: 'all' | 'image' | 'video' = 'all',
    page: number = 1,
    perPage: number = 20
): Promise<{ results: StockMediaResult[]; total: number }> => {
    try {
        // Filter sample media based on query
        let filtered = SAMPLE_IMAGES;

        if (query) {
            const lowerQuery = query.toLowerCase();
            filtered = SAMPLE_IMAGES.filter(media =>
                media.tags.toLowerCase().includes(lowerQuery)
            );
        }

        if (mediaType !== 'all') {
            filtered = filtered.filter(media => media.type === mediaType);
        }

        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));

        return {
            results: filtered,
            total: filtered.length
        };
    } catch (error) {
        console.error('[StockMediaService] Search failed:', error);
        return { results: SAMPLE_IMAGES, total: SAMPLE_IMAGES.length };
    }
};

export const downloadStockMedia = async (url: string): Promise<Blob | null> => {
    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Download failed: ${response.status}`);
        }

        const blob = await response.blob();
        return blob;
    } catch (error) {
        console.error('[StockMediaService] Download failed:', error);
        return null;
    }
};

// Popular search suggestions
export const STOCK_MEDIA_SUGGESTIONS = [
    'nature',
    'business',
    'technology',
    'people',
    'city',
    'food',
    'travel',
    'animals'
];
