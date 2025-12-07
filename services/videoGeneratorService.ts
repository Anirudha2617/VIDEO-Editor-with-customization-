import { generateImageAsset } from './geminiService';
import { Asset, Clip, MediaType, Track } from '../types';

interface VideoGenerationOptions {
    theme: string;
    duration: number; // in seconds
    style: 'cinematic' | 'fast-paced' | 'calm' | 'energetic';
    aspectRatio: '16:9' | '9:16' | '1:1';
}

interface GeneratedScene {
    imagePrompt: string;
    duration: number;
    transition: string;
    text?: string;
}

export const generateNatureVideoScenes = async (
    songName: string,
    duration: number
): Promise<GeneratedScene[]> => {
    // For "Ratiyaan" - a romantic/nature themed song
    // Generate scenes that match the mood
    const sceneDuration = 10; // Each scene lasts 10 seconds
    const numScenes = Math.ceil(duration / sceneDuration);

    const natureScenes: GeneratedScene[] = [
        {
            imagePrompt: "Beautiful sunset over mountains, golden hour, cinematic nature photography, warm colors",
            duration: sceneDuration,
            transition: "fade"
        },
        {
            imagePrompt: "Serene lake reflection with trees, peaceful nature scene, blue hour lighting",
            duration: sceneDuration,
            transition: "slide-left"
        },
        {
            imagePrompt: "Starry night sky over forest, milky way galaxy, romantic atmosphere",
            duration: sceneDuration,
            transition: "fade"
        },
        {
            imagePrompt: "Flowing waterfall in lush green forest, tropical paradise, soft sunlight",
            duration: sceneDuration,
            transition: "zoom-in"
        },
        {
            imagePrompt: "Cherry blossom trees in full bloom, pink petals falling, spring romance",
            duration: sceneDuration,
            transition: "fade"
        },
        {
            imagePrompt: "Ocean waves at sunset, beach scene, peaceful evening atmosphere",
            duration: sceneDuration,
            transition: "slide-right"
        },
        {
            imagePrompt: "Misty mountain valley at dawn, fog rolling through trees, ethereal mood",
            duration: sceneDuration,
            transition: "fade"
        },
        {
            imagePrompt: "Field of wildflowers under blue sky, colorful nature landscape, vibrant",
            duration: sceneDuration,
            transition: "zoom-out"
        },
        {
            imagePrompt: "Northern lights aurora borealis over snowy landscape, magical night sky",
            duration: sceneDuration,
            transition: "fade"
        },
        {
            imagePrompt: "Autumn forest path with golden leaves, warm fall colors, peaceful walk",
            duration: sceneDuration,
            transition: "slide-left"
        },
        {
            imagePrompt: "Moonlight over calm ocean, night seascape, romantic moonlit scene",
            duration: sceneDuration,
            transition: "fade"
        },
        {
            imagePrompt: "Tropical rainforest canopy, lush green vegetation, sunbeams through trees",
            duration: sceneDuration,
            transition: "zoom-in"
        },
        {
            imagePrompt: "Desert sand dunes at sunset, golden sand waves, dramatic sky",
            duration: sceneDuration,
            transition: "fade"
        },
        {
            imagePrompt: "Snow-covered pine forest in winter, peaceful winter wonderland",
            duration: sceneDuration,
            transition: "slide-right"
        },
        {
            imagePrompt: "Butterfly on flower in garden, macro nature photography, vibrant colors",
            duration: sceneDuration,
            transition: "fade"
        },
        {
            imagePrompt: "Rainbow over green hills after rain, hope and beauty in nature",
            duration: sceneDuration,
            transition: "zoom-out"
        },
        {
            imagePrompt: "Campfire under stars in forest clearing, cozy night camping scene",
            duration: sceneDuration,
            transition: "fade"
        },
        {
            imagePrompt: "Sunrise over calm lake with boat, peaceful morning scene, soft light",
            duration: sceneDuration,
            transition: "slide-left"
        }
    ];

    // Return only the number of scenes needed for the duration
    return natureScenes.slice(0, numScenes);
};

export const generateVideoTimeline = async (
    options: VideoGenerationOptions,
    onProgress?: (progress: number, message: string) => void
): Promise<{ assets: Asset[], clips: Clip[], tracks: Track[] }> => {
    const scenes = await generateNatureVideoScenes(options.theme, options.duration);

    const assets: Asset[] = [];
    const clips: Clip[] = [];
    const tracks: Track[] = [
        { id: 't1', type: MediaType.IMAGE, name: 'Video Track' },
        { id: 't2', type: MediaType.TEXT, name: 'Text Overlays' }
    ];

    let currentTime = 0;

    // Generate images for each scene
    for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i];

        if (onProgress) {
            onProgress((i / scenes.length) * 100, `Generating scene ${i + 1}/${scenes.length}: ${scene.imagePrompt.slice(0, 50)}...`);
        }

        try {
            // Generate the image
            const imageUrl = await generateImageAsset(scene.imagePrompt);
            const asset: Asset = {
                id: crypto.randomUUID(),
                type: MediaType.IMAGE,
                src: imageUrl,
                name: `AI: ${scene.imagePrompt.slice(0, 20)}...`
            };
            assets.push(asset);

            // Create clip for this scene
            const clip: Clip = {
                id: crypto.randomUUID(),
                assetId: asset.id,
                trackId: 't1',
                start: currentTime,
                duration: scene.duration,
                offset: 0,
                name: `Scene ${i + 1}`,
                type: MediaType.IMAGE,
                src: asset.src,
                scale: 1.2, // Slight zoom for Ken Burns effect
                opacity: 1,
                x: 0,
                y: 0,
                rotation: 0,
                effects: [],
                animationDuration: 1,
                animationIn: scene.transition as any,
                animationInDuration: 1.5,
                animationOut: 'fade',
                animationOutDuration: 1.5
            };

            clips.push(clip);
            currentTime += scene.duration;

        } catch (error) {
            console.error(`Failed to generate scene ${i + 1}:`, error);
            // Continue with next scene
        }
    }

    if (onProgress) {
        onProgress(100, 'Video generation complete!');
    }

    return { assets, clips, tracks };
};
