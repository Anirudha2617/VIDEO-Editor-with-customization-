import { GoogleGenerativeAI } from "@google/generative-ai";
import { getApiKey } from "../apiKeyService";
import { Asset, Clip, Track } from '../../models';

/* ------------------ GLOBAL TYPES ------------------ */
declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

/* ------------------ CLIENT FACTORY ------------------ */
const createClient = () => {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.error("API Key is missing!");
    throw new Error("API Key is missing. Please set it.");
  }
  return new GoogleGenerativeAI(apiKey);
};

/* =====================================================
   🖼 IMAGE GENERATION (IMAGEN 3)
===================================================== */
export const generateImageAsset = async (prompt: string): Promise<string> => {
  try {
    // NOTE: The official @google/generative-ai SDK doesn't support Imagen API
    // Image generation requires the AI Studio SDK or REST API
    // For now, using Pollinations.ai as the primary service

    console.log("Generating image with Pollinations.ai:", prompt);
    const encodedPrompt = encodeURIComponent(prompt);
    const seed = Math.floor(Math.random() * 10000);
    return `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1280&height=720&nologo=true&seed=${seed}`;
  } catch (error) {
    console.error("Image generation failed:", error);
    const encodedPrompt = encodeURIComponent(prompt);
    const seed = Math.floor(Math.random() * 10000);
    return `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1280&height=720&nologo=true&seed=${seed}`;
  }
};

/* =====================================================
   🎥 VIDEO GENERATION (VEO)
===================================================== */
export const generateVideoAsset = async (prompt: string): Promise<string> => {
  try {
    // NOTE: The official @google/generative-ai SDK doesn't support Veo API
    // Video generation requires special access and different SDK
    // Using stock video fallback

    console.log("Video generation not supported, using stock video for:", prompt);
    const lower = prompt.toLowerCase();

    if (lower.includes("nature") || lower.includes("forest"))
      return "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4";
    if (lower.includes("ocean") || lower.includes("water"))
      return "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4";
    if (lower.includes("city"))
      return "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
    if (lower.includes("animal"))
      return "https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4";

    return "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4";
  } catch (error) {
    console.error("Video generation failed:", error);
    return "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4";
  }
};

/* =====================================================
   📝 SCRIPT GENERATION
===================================================== */
export const generateScript = async (topic: string): Promise<string> => {
  try {
    const ai = createClient();
    const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });

    const result = await model.generateContent(
      `Write a short, engaging 30-second video script about: ${topic}.
Format as a list of scenes with timestamps.`
    );

    return result.response.text();
  } catch (error) {
    console.error("Script generation failed:", error);
    return `Title: ${topic}

00:00–00:05 Opening shot introducing ${topic}.
00:05–00:15 Key visuals and explanation.
00:15–00:25 Dynamic or emotional moment.
00:25–00:30 Closing shot with takeaway.`;
  }
};

/* =====================================================
   🎨 CSS FILTER GENERATION
===================================================== */
export const generateCSSFilter = async (description: string): Promise<string> => {
  try {
    const ai = createClient();
    const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });

    const result = await model.generateContent(
      `Create a valid CSS filter string matching: "${description}".
Return ONLY the raw CSS filter string.`
    );

    return result.response.text().replace(/```/g, "").trim();
  } catch (error) {
    console.error("Filter generation failed:", error);

    const d = description.toLowerCase();
    if (d.includes("black") || d.includes("white")) return "grayscale(100%)";
    if (d.includes("sepia") || d.includes("old")) return "sepia(100%)";
    if (d.includes("blur")) return "blur(5px)";
    if (d.includes("bright")) return "brightness(150%)";
    if (d.includes("contrast")) return "contrast(200%)";
    if (d.includes("vibrant")) return "saturate(200%)";
    if (d.includes("hue")) return "hue-rotate(90deg)";
    return "contrast(110%) brightness(110%)";
  }
};

/* =====================================================
   ✨ TRANSITION GENERATION
===================================================== */
export const generateTransitionSettings = async (description: string): Promise<any> => {
  try {
    const ai = createClient();
    const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });

    const result = await model.generateContent(
      `Return JSON only:
{
  "animationType": "fade|wipe|slide-left|slide-right|slide-up|slide-down|zoom-in|zoom-out",
  "easing": "linear|ease-in|ease-out|ease-in-out",
  "duration": number (0.5–5.0)
}
Description: "${description}"`
    );

    const text = result.response.text().replace(/```json|```/g, "").trim();
    return JSON.parse(text);
  } catch (error) {
    console.error("Transition generation failed:", error);

    const d = description.toLowerCase();
    let type = "fade";
    if (d.includes("wipe")) type = "wipe";
    else if (d.includes("left")) type = "slide-left";
    else if (d.includes("right")) type = "slide-right";
    else if (d.includes("up")) type = "slide-up";
    else if (d.includes("down")) type = "slide-down";
    else if (d.includes("zoom") && d.includes("out")) type = "zoom-out";
    else if (d.includes("zoom")) type = "zoom-in";

    return { animationType: type, easing: "ease-in-out", duration: 1.5 };
  }
};

/* =====================================================
   🔊 AUDIO (MOCK)
===================================================== */
export const generateAudioAsset = async (
  prompt: string,
  type: "sfx" | "music"
): Promise<string> => {
  await new Promise((r) => setTimeout(r, 1200));
  return type === "music"
    ? "https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3"
    : "https://cdn.pixabay.com/audio/2022/03/15/audio_b325d5a9c2.mp3";
};

/* =====================================================
   🗣 TTS (MOCK)
===================================================== */
export const generateTTSAsset = async (text: string, voice: string): Promise<string> => {
  await new Promise((r) => setTimeout(r, 1200));
  return "https://cdn.pixabay.com/audio/2022/10/16/audio_1808fbf07a.mp3";
};

/* =====================================================
   💻 CODE GENERATION
===================================================== */
export const generateCodeSnippet = async (
  prompt: string,
  language: string
): Promise<string> => {
  try {
    const ai = createClient();
    const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });

    const result = await model.generateContent(
      `Write ${language} code for:
"${prompt}"

Return ONLY raw code. No markdown.`
    );

    return result.response.text().replace(/```[a-z]*|```/g, "").trim();
  } catch (error) {
    console.error("Code generation failed:", error);
    return `/* AI Generation Failed */\n/* ${prompt} */`;
  }
};

/* =====================================================
   🎬 TIMELINE SCRIPT GENERATION
===================================================== */
export const generateTimelineScript = async (
  prompt: string,
  assets: Asset[],
  clips: Clip[],
  tracks: Track[]
): Promise<string> => {
  try {
    const ai = createClient();
    const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });

    const assetContext = assets
      .map((a) => `- ${a.name} (id: "${a.id}", type: ${a.type})`)
      .join("\n");

    const trackContext = tracks
      .map((t, i) => `- Track ${i + 1}: ${t.name} (id: "${t.id}")`)
      .join("\n");

    const systemPrompt = `
You are a timeline scripting assistant for Lumina Video Editor.

AVAILABLE ASSETS:
${assetContext}

AVAILABLE TRACKS:
${trackContext}

API:

addClip(assetNameOrId, {track, start, duration?, scale?, opacity?, x?, y?})
updateClip(clipId, updates)
removeClip(clipId)
getClip(clipId)

addTextAsset(text, options?)
addEffect(clipId, {name, value})
addTransition(clipId, type, animationType, duration?)
ai.generateImage(prompt)
addAssetFromUrl(url, name?)
display(content)

RULES:
1. ONLY executable JavaScript
2. NO markdown, NO explanations
3. Use async/await for AI + URL calls
4. Always call display() at the end

USER REQUEST:
${prompt}

Generate code:
`;

    const result = await model.generateContent(systemPrompt);
    let code = result.response.text();

    code = code.replace(/```javascript|```js|```/g, "").trim();
    return code;
  } catch (error) {
    console.error("Timeline script generation failed:", error);
    throw new Error(`Failed to generate script: ${(error as Error).message}`);
  }
};
