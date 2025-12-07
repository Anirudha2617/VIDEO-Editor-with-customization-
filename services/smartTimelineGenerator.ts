import { Asset, Clip, MediaType, Track } from '../types';

interface TimelineGenerationPrompt {
    userPrompt: string;
    availableAssets: Asset[];
    duration?: number; // Target duration in seconds
    style?: 'fast' | 'slow' | 'cinematic' | 'energetic';
}

interface GeneratedTimeline {
    clips: Clip[];
    tracks: Track[];
    totalDuration: number;
}

export const generateTimelineFromPrompt = async (
    prompt: TimelineGenerationPrompt,
    onProgress?: (message: string) => void
): Promise<GeneratedTimeline> => {

    if (onProgress) onProgress('Analyzing your prompt and assets...');

    // Prepare asset descriptions for AI
    const assetDescriptions = prompt.availableAssets.map(asset => ({
        id: asset.id,
        name: asset.name,
        type: asset.type,
        description: `${asset.type} file: ${asset.name}`
    }));

    // Create AI prompt
    const aiPrompt = `
You are a professional video editor AI. Create a video timeline based on the user's request.

USER REQUEST: "${prompt.userPrompt}"

AVAILABLE ASSETS:
${assetDescriptions.map((a, i) => `${i + 1}. ${a.description} (ID: ${a.id})`).join('\n')}

TARGET DURATION: ${prompt.duration || 'flexible'} seconds
STYLE: ${prompt.style || 'balanced'}

INSTRUCTIONS:
1. Analyze the user's request and match it with available assets
2. Create a scene-by-scene breakdown
3. Assign assets to scenes based on relevance
4. Suggest transitions between scenes (fade, slide-left, slide-right, zoom-in, zoom-out)
5. Suggest effects if needed (grayscale, sepia, blur, etc.)
6. Generate text overlays with timing if the request mentions text/titles
7. Ensure smooth pacing and professional flow

OUTPUT FORMAT (JSON):
{
  "scenes": [
    {
      "assetId": "asset_id_here",
      "duration": 5,
      "startTime": 0,
      "transition": "fade",
      "effects": ["effect_name"],
      "text": "Optional text overlay",
      "textTiming": { "start": 1, "duration": 3 }
    }
  ]
}

Generate the timeline now:
`;

    try {
        if (onProgress) onProgress('Asking AI to create your timeline...');

        // Call Gemini API
        const { GoogleGenerativeAI } = await import('@google/generative-ai');

        // Get API key from environment
        const apiKey = process.env.API_KEY || '';
        if (!apiKey) {
            throw new Error('Gemini API key not found. Please set VITE_GEMINI_API_KEY in your .env file');
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const result = await model.generateContent(aiPrompt);
        const responseText = result.response.text();

        if (onProgress) onProgress('Processing AI response...');

        // Extract JSON from response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('AI did not return valid JSON');
        }

        const aiResponse = JSON.parse(jsonMatch[0]);

        if (onProgress) onProgress('Building timeline...');

        // Create tracks
        const tracks: Track[] = [
            { id: 't1', type: MediaType.VIDEO, name: 'Main Track' },
            { id: 't2', type: MediaType.TEXT, name: 'Text Overlays' }
        ];

        // Create clips from AI response
        const clips: Clip[] = [];
        let currentTime = 0;

        for (const scene of aiResponse.scenes) {
            const asset = prompt.availableAssets.find(a => a.id === scene.assetId);
            if (!asset) continue;

            // Main clip
            const clip: Clip = {
                id: crypto.randomUUID(),
                assetId: asset.id,
                trackId: 't1',
                start: scene.startTime || currentTime,
                duration: scene.duration || 5,
                offset: 0,
                name: asset.name,
                type: asset.type,
                src: asset.src,
                scale: 1,
                opacity: 1,
                x: 0,
                y: 0,
                rotation: 0,
                effects: scene.effects?.map((e: string) => ({
                    id: crypto.randomUUID(),
                    name: e,
                    type: 'filter',
                    value: e,
                    kind: e
                })) || [],
                animationDuration: 1,
                animationIn: scene.transition || 'fade',
                animationInDuration: 1.5,
                animationOut: 'fade',
                animationOutDuration: 1.5
            };

            clips.push(clip);

            // Add text overlay if specified
            if (scene.text) {
                const textClip: Clip = {
                    id: crypto.randomUUID(),
                    assetId: 'text_' + crypto.randomUUID(),
                    trackId: 't2',
                    start: (scene.startTime || currentTime) + (scene.textTiming?.start || 0),
                    duration: scene.textTiming?.duration || 3,
                    offset: 0,
                    name: 'Text: ' + scene.text,
                    type: MediaType.TEXT,
                    src: '',
                    scale: 1,
                    opacity: 1,
                    x: 0,
                    y: 0,
                    rotation: 0,
                    text: scene.text,
                    fontSize: 60,
                    fontColor: '#ffffff',
                    effects: [],
                    animationDuration: 1,
                    animationIn: 'fade',
                    animationInDuration: 0.5
                };
                clips.push(textClip);
            }

            currentTime += scene.duration || 5;
        }

        if (onProgress) onProgress(`Timeline created with ${clips.length} clips!`);

        return {
            clips,
            tracks,
            totalDuration: currentTime
        };

    } catch (error) {
        console.error('Timeline generation error:', error);
        throw new Error('Failed to generate timeline: ' + (error as Error).message);
    }
};
