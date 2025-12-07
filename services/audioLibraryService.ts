// Audio Library Service - Free sample audio for testing
// Provides royalty-free music samples for video projects

export interface AudioResult {
    id: number;
    title: string;
    artist: string;
    duration: number; // in seconds
    previewUrl: string;
    downloadUrl: string;
    tags: string;
    category: string;
}

// Using public domain audio samples (SoundHelix - royalty-free)
const SAMPLE_AUDIO: AudioResult[] = [
    {
        id: 1,
        title: 'Upbeat Corporate',
        artist: 'SoundHelix',
        duration: 120,
        previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
        downloadUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
        tags: 'upbeat, corporate, background, energetic',
        category: 'music'
    },
    {
        id: 2,
        title: 'Calm Piano Melody',
        artist: 'SoundHelix',
        duration: 180,
        previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
        downloadUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
        tags: 'calm, piano, relaxing, peaceful',
        category: 'music'
    },
    {
        id: 3,
        title: 'Electronic Beat',
        artist: 'SoundHelix',
        duration: 150,
        previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
        downloadUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
        tags: 'electronic, energetic, modern, upbeat',
        category: 'music'
    },
    {
        id: 4,
        title: 'Acoustic Guitar',
        artist: 'SoundHelix',
        duration: 200,
        previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
        downloadUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
        tags: 'acoustic, guitar, folk, calm',
        category: 'music'
    },
    {
        id: 5,
        title: 'Cinematic Drama',
        artist: 'SoundHelix',
        duration: 240,
        previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
        downloadUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
        tags: 'cinematic, dramatic, epic, powerful',
        category: 'music'
    },
    {
        id: 6,
        title: 'Happy Uplifting',
        artist: 'SoundHelix',
        duration: 160,
        previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3',
        downloadUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3',
        tags: 'happy, uplifting, cheerful, positive',
        category: 'music'
    },
    {
        id: 7,
        title: 'Ambient Atmosphere',
        artist: 'SoundHelix',
        duration: 220,
        previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3',
        downloadUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3',
        tags: 'ambient, atmosphere, background, calm',
        category: 'music'
    },
    {
        id: 8,
        title: 'Rock Energy',
        artist: 'SoundHelix',
        duration: 190,
        previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3',
        downloadUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3',
        tags: 'rock, energetic, powerful, guitar',
        category: 'music'
    }
];

export const searchAudio = async (
    query: string = '',
    category: string = '',
    page: number = 1,
    perPage: number = 20
): Promise<{ results: AudioResult[]; total: number }> => {
    try {
        // Filter sample audio based on query
        let filtered = SAMPLE_AUDIO;

        if (query) {
            const lowerQuery = query.toLowerCase();
            filtered = SAMPLE_AUDIO.filter(audio =>
                audio.title.toLowerCase().includes(lowerQuery) ||
                audio.tags.toLowerCase().includes(lowerQuery) ||
                audio.artist.toLowerCase().includes(lowerQuery)
            );
        }

        // Simulate API delay for realistic feel
        await new Promise(resolve => setTimeout(resolve, 500));

        return {
            results: filtered,
            total: filtered.length
        };
    } catch (error) {
        console.error('[AudioLibraryService] Search failed:', error);
        // Return all samples as fallback
        return { results: SAMPLE_AUDIO, total: SAMPLE_AUDIO.length };
    }
};

export const downloadAudio = async (url: string, filename: string): Promise<Blob | null> => {
    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Download failed: ${response.status}`);
        }

        const blob = await response.blob();
        return blob;
    } catch (error) {
        console.error('[AudioLibraryService] Download failed:', error);
        return null;
    }
};

export const createAudioAsset = (audioResult: AudioResult, audioBlob: Blob): string => {
    const audioUrl = URL.createObjectURL(audioBlob);
    return audioUrl;
};

// Audio categories for filtering
export const AUDIO_CATEGORIES = [
    { value: 'all', label: 'All' },
    { value: 'music', label: 'Music' },
    { value: 'sound_effects', label: 'Sound Effects' },
    { value: 'ambient', label: 'Ambient' },
    { value: 'nature', label: 'Nature' },
    { value: 'electronic', label: 'Electronic' },
    { value: 'acoustic', label: 'Acoustic' }
];

// Popular search suggestions
export const AUDIO_SUGGESTIONS = [
    'upbeat',
    'cinematic',
    'calm',
    'piano',
    'guitar',
    'electronic',
    'acoustic',
    'dramatic'
];
