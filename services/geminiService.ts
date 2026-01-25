import { GoogleGenAI } from "@google/genai";
import { getApiKey } from './apiKeyService';
import { Asset, Clip, Track } from '../types';

// Extend Window interface for AI Studio API
declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

// Ensure we have a client factory to handle dynamic API key selection for Veo
const createClient = () => {
  // Check localStorage first, then environment variable
  const apiKey = getApiKey();
  if (!apiKey) {
    console.error("API Key is missing! Please set it in the Script Editor or check your .env file.");
    throw new Error("API Key is missing. Please set it in the Script Editor.");
  }
  return new GoogleGenAI({ apiKey });
};

/**
 * Generates an image asset using Gemini (Imagen).
 */
export const generateImageAsset = async (prompt: string): Promise<string> => {
  try {
    const ai = createClient();
    // Try using the Imagen 3 model which is standard for image generation
    const response = await ai.models.generateContent({
      model: 'imagen-3.0-generate-001',
      contents: {
        parts: [{ text: prompt }],
      },
      config: {
        imageConfig: {
          aspectRatio: "16:9",
        }
      }
    });

    // Extract image
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image data returned.");
  } catch (error) {
    console.error("Image generation failed:", error);

    // Fallback to Pollinations.ai (Free AI Image Generator) if Gemini fails
    // This service generates ACTUAL images based on the prompt, unlike Picsum
    console.log("Falling back to Pollinations.ai...");
    const encodedPrompt = encodeURIComponent(prompt);
    // Add a random seed to ensure new images for same prompt
    const randomSeed = Math.floor(Math.random() * 1000);
    return `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1280&height=720&nologo=true&seed=${randomSeed}`;
  }
};

/**
 * Generates a video asset using Veo.
 * Requires user-selected API key.
 */
export const generateVideoAsset = async (prompt: string): Promise<string> => {
  try {
    // Check for API key selection for Veo
    if (window.aistudio) {
      const hasKey = await window.aistudio.hasSelectedApiKey();
      if (!hasKey) {
        await window.aistudio.openSelectKey();
      }
    }

    // Re-instantiate client to pick up selected key
    const ai = createClient();

    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt,
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: '16:9'
      }
    });

    // Poll for completion
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Poll every 5s
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!videoUri) throw new Error("No video URI returned.");

    // Fetch the actual video bytes
    const videoResponse = await fetch(`${videoUri}&key=${process.env.API_KEY}`);
    const videoBlob = await videoResponse.blob();
    return URL.createObjectURL(videoBlob);

  } catch (error) {
    console.error("Video generation failed:", error);
    console.log("Falling back to relevant stock video...");

    // Smart fallback: Match keywords to appropriate free stock videos
    const lowerPrompt = prompt.toLowerCase();

    // Google's sample videos (free, no API key needed)
    if (lowerPrompt.includes('nature') || lowerPrompt.includes('forest') || lowerPrompt.includes('mountain') || lowerPrompt.includes('escape')) {
      return "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4";
    } else if (lowerPrompt.includes('ocean') || lowerPrompt.includes('sea') || lowerPrompt.includes('water') || lowerPrompt.includes('blaze')) {
      return "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4";
    } else if (lowerPrompt.includes('city') || lowerPrompt.includes('urban') || lowerPrompt.includes('building') || lowerPrompt.includes('bunny')) {
      return "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
    } else if (lowerPrompt.includes('animal') || lowerPrompt.includes('wildlife') || lowerPrompt.includes('elephant') || lowerPrompt.includes('dream')) {
      return "https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4";
    } else if (lowerPrompt.includes('tech') || lowerPrompt.includes('digital') || lowerPrompt.includes('future') || lowerPrompt.includes('joy')) {
      return "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4";
    } else {
      // Default nature video
      return "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4";
    }
  }
};

/**
 * Generates a script or ideas for the video.
 */
export const generateScript = async (topic: string): Promise<string> => {
  try {
    const ai = createClient();
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: {
        parts: [{ text: `Write a short, engaging 30-second video script about: ${topic}. Format it as a list of scenes with timecodes.` }]
      }
    });
    return response.text || "No script generated.";
  } catch (error) {
    console.error("Script generation failed:", error);
    // Fallback script
    return `Title: ${topic} (AI Generated Script)\n\n` +
      `00:00 - 00:05: Opening shot of ${topic}, establishing the scene.\n` +
      `00:05 - 00:15: Close up details showing the beauty of ${topic}.\n` +
      `00:15 - 00:25: Action shots or dynamic movement related to ${topic}.\n` +
      `00:25 - 00:30: Final closing shot with a fade out.`;
  }
};

/**
 * Generates a CSS filter string for a visual effect.
 */
export const generateCSSFilter = async (description: string): Promise<string> => {
  try {
    const ai = createClient();
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: {
        parts: [{
          text: `Create a valid CSS filter string for a canvas context that matches this description: "${description}". 
            Examples: "blur(5px) sepia(0.8)", "contrast(150%) hue-rotate(90deg)".
            Return ONLY the raw CSS filter string, nothing else. Do not use Markdown.` }]
      }
    });
    const text = response.text?.trim() || "none";
    return text.replace(/```/g, '').trim();
  } catch (error) {
    console.error("Filter generation failed:", error);
    // Simple keyword matching fallback
    const lowerDesc = description.toLowerCase();
    if (lowerDesc.includes('black') || lowerDesc.includes('white')) return 'grayscale(100%)';
    if (lowerDesc.includes('sepia') || lowerDesc.includes('old')) return 'sepia(100%)';
    if (lowerDesc.includes('blur')) return 'blur(5px)';
    if (lowerDesc.includes('bright')) return 'brightness(150%)';
    if (lowerDesc.includes('contrast')) return 'contrast(200%)';
    if (lowerDesc.includes('saturate') || lowerDesc.includes('vibrant')) return 'saturate(200%)';
    if (lowerDesc.includes('hue') || lowerDesc.includes('color')) return 'hue-rotate(90deg)';
    if (lowerDesc.includes('red')) return 'hue-rotate(0deg) saturate(200%)';
    return 'contrast(110%) brightness(110%)'; // Default subtle enhancement
  }
}

/**
 * Generates transition parameters based on a description.
 */
export const generateTransitionSettings = async (description: string): Promise<any> => {
  try {
    const ai = createClient();
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: {
        parts: [{
          text: `Suggest animation parameters based on this description: "${description}".
            Return JSON only with these fields:
            - animationType: One of ['fade', 'wipe', 'slide-left', 'slide-right', 'slide-up', 'slide-down', 'zoom-in', 'zoom-out']
            - easing: One of ['linear', 'ease-in', 'ease-out', 'ease-in-out']
            - duration: number (between 0.5 and 5.0)
            Example: {"animationType": "zoom-in", "easing": "ease-out", "duration": 2.5}` }]
      },
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text || '{}';
    const cleanedText = text.replace(/```json|```/g, '').trim();
    return JSON.parse(cleanedText);
  } catch (error) {
    console.error("Transition generation failed:", error);
    // Fallback based on keywords
    const lowerDesc = description.toLowerCase();
    let type = 'fade';
    if (lowerDesc.includes('wipe')) type = 'wipe';
    else if (lowerDesc.includes('left')) type = 'slide-left';
    else if (lowerDesc.includes('right')) type = 'slide-right';
    else if (lowerDesc.includes('up')) type = 'slide-up';
    else if (lowerDesc.includes('down')) type = 'slide-down';
    else if (lowerDesc.includes('zoom') && lowerDesc.includes('out')) type = 'zoom-out';
    else if (lowerDesc.includes('zoom')) type = 'zoom-in';

    return {
      animationType: type,
      easing: 'ease-in-out',
      duration: 1.5
    };
  }
}

/**
 * Generates an audio asset (Sound FX or Music).
 * Currently a mock that returns stock audio.
 */
export const generateAudioAsset = async (prompt: string, type: 'sfx' | 'music'): Promise<string> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1500));

  // Return sample audio files based on type
  if (type === 'music') {
    return "https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3";
  } else {
    return "https://cdn.pixabay.com/audio/2022/03/15/audio_b325d5a9c2.mp3";
  }
}

/**
 * Generates speech from text (TTS).
 * Currently a mock.
 */
export const generateTTSAsset = async (text: string, voice: string): Promise<string> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1500));

  // Mock: Return a generic voiceover sample
  return "https://cdn.pixabay.com/audio/2022/10/16/audio_1808fbf07a.mp3";
}

/**
 * Generates a code snippet based on a prompt and language.
 */
export const generateCodeSnippet = async (prompt: string, language: string): Promise<string> => {
  try {
    const ai = createClient();
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: {
        parts: [{
          text: `Write ${language} code for the following request: "${prompt}".
            Return ONLY the raw code string, nothing else. Do not use Markdown backticks.
            Do not include explanations.` }]
      }
    });

    let text = response.text || "";
    // Clean up potential markdown formatting if the model disobeys
    text = text.replace(/```[a-z]*\n?/g, '').replace(/```/g, '').trim();
    return text;
  } catch (error) {
    console.error("Code generation failed:", error);
    // Fallback
    return `/* AI Generation Failed */\n/* Request: ${prompt} */\n/* Please check your API key and connection. */`;
  }
}

/**
 * Generates executable timeline script code from natural language prompt.
 */
export const generateTimelineScript = async (
  prompt: string,
  assets: Asset[],
  clips: Clip[],
  tracks: Track[]
): Promise<string> => {
  try {
    const ai = createClient();

    // Build context for the AI
    const assetContext = assets.map(a =>
      `- ${a.name} (id: "${a.id}", type: ${a.type})`
    ).join('\n');

    const trackContext = tracks.map((t, idx) =>
      `- Track ${idx + 1}: ${t.name} (id: "${t.id}")`
    ).join('\n');

    const systemPrompt = `You are a timeline scripting assistant for Lumina Video Editor.
Generate EXECUTABLE JavaScript code using the provided API to manipulate the timeline.

AVAILABLE ASSETS:
${assetContext}

AVAILABLE TRACKS:
${trackContext}

API DOCUMENTATION:

📌 CLIP OPERATIONS:
- addClip(assetNameOrId, {track, start, duration?, scale?, opacity?, x?, y?}) - Add a clip to the timeline
  Example: addClip("Sample_Landscape", {track: 1, start: 0, duration: 5})
  Example: addClip(asset.id, {track: 2, start: 5, duration: 3, opacity: 0.8})

- updateClip(clipId, updates) - Update an existing clip's properties
  Example: updateClip("clip-123", {opacity: 0.5, scale: 1.2, rotation: 45})

- removeClip(clipId) - Remove a clip from the timeline
  Example: removeClip("clip-123")

- getClip(clipId) - Get clip details
  Example: const clip = getClip("clip-123")

📝 TEXT ASSET CREATION:
- addTextAsset(text, options?) - Create a text overlay asset
  Options: {fontSize, fontColor, fontFamily, isBold, backgroundColor, borderRadius, padding}
  Example: const txt = addTextAsset("Hello World", {fontSize: 64, fontColor: "#ffff00", isBold: true})
  Example: const caption = addTextAsset("Subscribe!", {fontSize: 48, fontColor: "#ffffff", backgroundColor: "#ff0000", borderRadius: 10, padding: 20})
  Then use: addClip(txt.id, {track: 2, start: 0, duration: 3})

🎨 EFFECT OPERATIONS:
- addEffect(clipId, {name, value}) - Add a CSS filter effect to a clip
  Example: addEffect(clipId, {name: "Blur", value: "blur(5px)"})
  Example: addEffect(clipId, {name: "Vintage", value: "sepia(50%) contrast(120%)"})
  Example: addEffect(clipId, {name: "B&W", value: "grayscale(100%)"})
  Common effects: blur, brightness, contrast, grayscale, sepia, hue-rotate, saturate

✨ TRANSITION OPERATIONS:
- addTransition(clipId, type, animationType, duration?) - Add enter/exit transition
  type: 'in' (entrance) or 'out' (exit)
  animationType: 'fade' | 'wipe' | 'slide-left' | 'slide-right' | 'slide-up' | 'slide-down' | 'zoom-in' | 'zoom-out'
  duration: number in seconds (default: 1)
  Example: addTransition(clipId, 'in', 'fade', 1.5)
  Example: addTransition(clipId, 'out', 'zoom-out', 0.8)

🤖 AI GENERATION:
- ai.generateImage(prompt) - Generate an AI image and add it as an asset
  Example: const img = await ai.generateImage("sunset over mountains");
          addClip(img.id, {track: 1, start: 0, duration: 5});

🌐 EXTERNAL ASSETS:
- addAssetFromUrl(url, name?) - Download and add an asset from URL
  Example: const asset = await addAssetFromUrl("https://example.com/image.jpg", "My Image");
          addClip(asset.id, {track: 1, start: 0, duration: 5});

📊 UTILITY:
- display(content) - Show output in the console
  Example: display("✓ Added 5 clips successfully!");
  Example: display(\`Current clip count: \${clipCount}\`)

CURRENT CLIPS: ${clips.length} clips on timeline

RULES:
1. Generate ONLY executable JavaScript code
2. NO markdown code blocks, NO explanations, NO comments except inline
3. Use asset names or IDs directly
4. Track numbers are 1-indexed (track: 1, track: 2, etc.)
5. Use async/await for AI operations and addAssetFromUrl
6. Always call display() at the end to confirm success
7. For text overlays, create text asset THEN add to timeline
8. Transitions are applied to clips AFTER they're created
9. Effects are added to clips AFTER they're created

USER REQUEST:
${prompt}

Generate the code now:`;

    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: {
        parts: [{ text: systemPrompt }]
      }
    });

    let code = response.text || "";

    // Clean up any markdown formatting
    code = code.replace(/```javascript\n?/g, '').replace(/```js\n?/g, '').replace(/```\n?/g, '').trim();

    // Remove any leading/trailing explanatory text
    const lines = code.split('\n');
    const codeLines = lines.filter(line => {
      const trimmed = line.trim();
      return trimmed.length > 0 &&
        !trimmed.match(/^(Here|This|The code|I've|Let me|Note:|Output:)/i);
    });

    return codeLines.join('\n');
  } catch (error) {
    console.error("Timeline script generation failed:", error);
    throw new Error(`Failed to generate script: ${(error as Error).message}`);
  }
}