# Lumina Script Editor: Panel 1 Guide (Command Console)

Panel 1 is the **Command Console**, an imperative scripting environment that allows you to execute JavaScript/TypeScript code to manipulate the editor state in real-time.

## Overview
- **Language**: JavaScript (ES2020)
- **Execution**: Runs in a sandboxed context with access to editor internals.
- **Purpose**: Automate tasks, batch operations, generate content, and register custom extensions.

## Available Functions

### 1. Clip Utilities
Functions to manage clips on the timeline.

- **`addClip(assetIdOrName, config)`**
  Adds a new clip to the timeline.
  ```javascript
  const clip = addClip("Sample Landscape", {
      track: 1,      // Track ID or index
      start: 0,      // Start time in seconds
      duration: 5    // Duration in seconds
  });
  ```

- **`removeClip(id)`**
  Removes a clip by its ID.
  ```javascript
  removeClip(clip.id);
  ```

- **`updateClip(id, updates)`**
  Modifies properties of an existing clip.
  ```javascript
  updateClip(clipId, {
      scale: 1.5,
      opacity: 0.8,
      rotation: 45
  });
  ```

- **`getClip(id)`**
  Retrieves a clip object by ID.

### 2. Effects & Animations
Functions to apply effects to clips.

- **`addEffect(clipId, effect)`**
  Adds a visual filter or effect to a clip.
  ```javascript
  addEffect(clipId, {
      name: 'Blur',
      type: 'filter',
      value: 'blur(10px)'
  });
  ```

- **`registerTransition(config)`**
  Registers a new custom transition available in the UI.
  ```javascript
  registerTransition({
      id: 'my-spin',
      name: 'Super Spin',
      variables: [{ name: 'Speed', key: 'speed', type: 'number', defaultValue: 1 }],
      apply: (ctx) => {
          return { rotation: ctx.progress * 360 * ctx.params.speed };
      }
  });
  ```

### 3. AI & Assets
Functions to generate or load external content.

- **`ai.generateImage(prompt)`**
  Generates an image using AI and adds it to the Media Library.
  ```javascript
  await ai.generateImage("A futuristic city skyline at sunset, cyberpunk style");
  ```

- **`addAssetFromUrl(url, name)`**
  Imports an image or video from a URL.
  ```javascript
  await addAssetFromUrl("https://example.com/image.png", "My Image");
  ```

### 4. Utilities
- **`display(content)`**
  Prints output to the console results area.
  ```javascript
  display("Operation complete!");
  ```

## Global Variables
- **`clips`**: Array of all current clips on the timeline.
- **`tracks`**: Array of all tracks.
- **`assets`**: Dictionary of available assets.

## Examples

### Batch Update
Scale all clips on Track 1 to 80%.
```javascript
clips.forEach(clip => {
    if (clip.trackId === 't1') {
        updateClip(clip.id, { scale: 0.8 });
    }
});
display("Resized all clips on Track 1");
```

### Randomize Timeline
Create a random sequence from available assets.
```javascript
let currentTime = 0;
const assetsList = Object.keys(assets); // Get all asset names

for (let i = 0; i < 5; i++) {
    const randomAsset = assetsList[Math.floor(Math.random() * assetsList.length)];
    addClip(randomAsset, {
        track: 1,
        start: currentTime,
        duration: 2
    });
    });
    currentTime += 2;
}
```

---

# 🎓 How to Train Your GPT

Want to make ChatGPT, Claude, or DeepSeek write perfect scripts for Lumina? 
Copy and paste the prompt below into your LLM to make it an expert instantly.

```markdown
# Lumina Editor — Master GPT Prompt (Complete)

## Purpose
This document is a **single master prompt** you can paste into any GPT / LLM to make it fully understand the **Lumina Editor scripting system**.

---

## MASTER PROMPT (COPY EVERYTHING BELOW)

### SYSTEM ROLE
You are an **expert engineer and creative editor** for the *Lumina Editor* scripting environment.
You must generate **correct, runnable Lumina scripts** and accurate debugging advice.
Do NOT hallucinate APIs, browser features, or Node.js behavior.

---

## CORE LUMINA MENTAL MODEL

- **Assets → Clips → Timeline**
- Assets are created first (image / video / audio / text)
- Clips place assets on timeline tracks
- Transitions & effects modify clip rendering
- Time unit = **seconds**
- Canvas origin `(0,0)` = **CENTER**
- Default aspect ratio = **16:9**

### Track Convention
- Track 1 → Main video
- Track 2 → Overlays / PiP images
- Track 3–4 → Text / subtitles
- Track 4+ → Audio
- Track 5+ → Animation clips / adjustment layers / grain

---

## SCRIPT ENVIRONMENT RULES (VERY IMPORTANT)

- Top-level `await` ❌ not allowed  
  ✅ Always wrap code in:
  ```js
  (async () => { ... })();
  ```

- Some variables may already exist (`assets`, etc.)
  ❌ Do NOT redeclare them
  ✅ Use names like `mediaMap`, `loadedMedia`

- `addAssetFromUrl()` is **async** and may fail:
  * HTTP 404
  * blocked domain
  * timeout

- A failed asset load must **NOT stop script execution**
- Use `try/catch` inside loops

---

## GUARANTEED MEDIA FALLBACK PATTERN

When loading ANY media (image / video / audio), you MUST:

1. Try original URL
2. Fallback → `https://picsum.photos/1920/1080`
3. Fallback → `https://placehold.co/1920x1080/png?text=Missing+Media`
4. Final fallback → **data URL 1×1 image**

This guarantees:
* An **Asset is ALWAYS created**
* Asset keeps the **same requested name**
```

