import { GoogleGenAI } from "@google/genai";

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
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API Key is missing! Check your .env file and ensure GEMINI_API_KEY is set.");
    throw new Error("API Key is missing. Please check your .env file.");
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