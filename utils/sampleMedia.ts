import { MediaPipeline } from '../pipelines/media';

export const loadSampleMedia = async (pipeline: MediaPipeline) => {
    // Sample Video (Big Buck Bunny clip or similar public domain)
    try {
        await pipeline.addFromUrl(
            'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
            'Sample Video.mp4'
        );
    } catch (e) {
        console.error("Failed to load sample video", e);
    }

    // Sample Image
    try {
        await pipeline.addFromUrl(
            'https://picsum.photos/800/600',
            'Sample Landscape.jpg'
        );
    } catch (e) {
        console.error("Failed to load sample image", e);
    }

    // Sample Audio
    try {
        // Using a reliable short audio file
        await pipeline.addFromUrl(
            'https://www2.cs.uic.edu/~i101/SoundFiles/BabyElephantWalk60.wav',
            'Sample Audio.wav'
        );
    } catch (e) {
        console.error("Failed to load sample audio", e);
    }
};
