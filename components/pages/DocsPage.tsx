
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Home, Search, Menu, ChevronRight, Hash, Code, Sparkles, Layers, Keyboard, FileJson, MoveRight, FunctionSquare, X, Terminal } from 'lucide-react';

// --- Types ---
type Section = {
    id: string;
    title: string;
    content: React.ReactNode;
};

type Category = {
    title: string;
    items: Section[];
};

// --- Content Data ---

const scriptPanelDocs = [
    {
        id: 'script-overview',
        title: 'Panel Overview',
        content: (
            <>
                <p className="text-gray-400 mb-6">
                    The **Script Panel** is the command center for automation in Lumina Editor. It is divided into three specialized tabs, each designed for a specific workflow.
                </p>
                <div className="grid md:grid-cols-3 gap-6 mb-12">
                    <div className="p-4 bg-[#18181b] rounded-lg border border-white/5">
                        <h3 className="font-semibold text-white mb-2 flex items-center gap-2"><Sparkles size={16} className="text-purple-400" /> AI Assistant</h3>
                        <p className="text-xs text-gray-400">Generates code from natural language prompts. Best for getting started quickly.</p>
                    </div>
                    <div className="p-4 bg-[#18181b] rounded-lg border border-white/5">
                        <h3 className="font-semibold text-white mb-2 flex items-center gap-2"><Terminal size={16} className="text-yellow-400" /> Command Console</h3>
                        <p className="text-xs text-gray-400">Execute imperative JavaScript commands immediately. Best for testing and one-off actions.</p>
                    </div>
                    <div className="p-4 bg-[#18181b] rounded-lg border border-white/5">
                        <h3 className="font-semibold text-white mb-2 flex items-center gap-2"><FileJson size={16} className="text-blue-400" /> Timeline State</h3>
                        <p className="text-xs text-gray-400">View and edit the timeline as a JSON object. Best for bulk edits and precise state management.</p>
                    </div>
                </div>
            </>
        )
    },
    {
        id: 'script-console',
        title: 'Command Console Strategy',
        content: (
            <>
                <p className="text-gray-400 mb-6">
                    The Command Console operates on an **Imperative** model. You give orders, and the editor executes them.
                </p>
                <h4 className="text-lg font-semibold text-gray-200 mb-2">Key Workflow</h4>
                <ul className="list-disc pl-5 space-y-2 text-gray-400 mb-6">
                    <li><strong>Selection Sync</strong>: Use specific IDs to target clips.</li>
                    <li><strong>Immediate Feedback</strong>: Errors and results appear instantly in the output log.</li>
                    <li><strong>Batch Operations</strong>: Use `clips.forEach()` to modify hundreds of clips in milliseconds.</li>
                </ul>
                <DocCodeBlock code={`// Example: Randomize start times for all clips
clips.forEach(clip => {
    updateClip(clip.id, { 
        start: Math.random() * 10 
    });
});`} />
            </>
        )
    },
    {
        id: 'script-state',
        title: 'Timeline State Strategy',
        content: (
            <>
                <p className="text-gray-400 mb-6">
                    The Timeline State tab operates on a **Declarative** model. You describe *what the timeline should look like*, and the engine figures out the changes.
                </p>
                <div className="p-4 bg-blue-900/10 border border-blue-500/20 rounded-md mb-6">
                    <strong className="text-blue-400 text-sm block mb-1">Power User Tip</strong>
                    <p className="text-xs text-gray-400">Use this tab to copy/paste entire timeline structures between projects or to back up your work as text.</p>
                </div>
            </>
        )
    }
];

const codePanelDocs = [
    {
        id: 'code-overview',
        title: 'Code Panel',
        content: (
            <>
                <p className="text-gray-400 mb-6">
                    The **Code Panel** allows you to create reusable assets using standard web technologies (HTML, CSS, JavaScript). These are "baked" into high-performance media or scripts.
                </p>
                <h3 className="text-xl font-semibold text-white mb-4">Supported Asset Types</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    <div className="p-4 bg-[#18181b] border border-white/5 rounded-lg">
                        <span className="text-blue-400 font-bold text-xs uppercase mb-1 block">Visuals</span>
                        <h4 className="text-gray-200 font-medium">Images & Videos</h4>
                        <p className="text-xs text-gray-500 mt-1">Render HTML/Canvas animations into static images or looping video files.</p>
                    </div>
                    <div className="p-4 bg-[#18181b] border border-white/5 rounded-lg">
                        <span className="text-purple-400 font-bold text-xs uppercase mb-1 block">Logic</span>
                        <h4 className="text-gray-200 font-medium">Transitions & Effects</h4>
                        <p className="text-xs text-gray-500 mt-1">Write functions that hook into the rendering pipeline to manipulate pixels directly.</p>
                    </div>
                </div>
            </>
        )
    },
    {
        id: 'code-transitions',
        title: 'Creating Transitions',
        content: (
            <>
                <p className="text-gray-400 mb-6">
                    Custom transitions are JavaScript functions that return an object with an `apply` method.
                </p>
                <h4 className="text-lg font-semibold text-gray-200 mb-2">Template</h4>
                <DocCodeBlock code={`return {
    id: "my-custom-wipe",
    name: "My Wipe",
    apply: ({ ctx, width, height, progress, isExit }) => {
        // Draw logic here using HTML5 Canvas API
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, width * progress, height);
        
        return { 
            overlayColor: { style: "black", opacity: 0 } 
        };
    }
};`} />
            </>
        )
    }
];

const architectureDocs = [
    {
        id: 'arch-overview',
        title: 'System Architecture',
        content: (
            <>
                <p className="text-gray-400 mb-8">
                    Lumina Editor is built on a modular architecture where the Timeline, Player, and Scripting Engine operate in sync.
                </p>
                <div className="relative p-8 bg-[#18181b] rounded-xl border border-white/5 flex flex-col items-center gap-8">
                    {/* High-level Diagram Representation */}
                    <div className="flex gap-4 w-full justify-center">
                        <div className="w-32 h-20 bg-blue-900/20 border border-blue-500/30 rounded flex items-center justify-center text-blue-300 font-bold text-sm">
                            Timeline
                        </div>
                        <div className="flex items-center text-gray-600"><MoveRight /></div>
                        <div className="w-32 h-20 bg-purple-900/20 border border-purple-500/30 rounded flex items-center justify-center text-purple-300 font-bold text-sm">
                            State Engine
                        </div>
                        <div className="flex items-center text-gray-600"><MoveRight /></div>
                        <div className="w-32 h-20 bg-emerald-900/20 border border-emerald-500/30 rounded flex items-center justify-center text-emerald-300 font-bold text-sm">
                            Renderer
                        </div>
                    </div>
                    <div className="w-full h-px bg-white/5"></div>
                    <p className="text-xs text-center text-gray-500 max-w-lg">
                        Changes in the Timeline (UI) update the central State. The Scripting Engine can inject commands directly into this State, which the Renderer then visualizes in real-time.
                    </p>
                </div>
            </>
        )
    }
];

// Combine into final data structure
const getDocData = (): Category[] => [
    {
        title: 'Introduction',
        items: [
            {
                id: 'getting-started',
                title: 'Getting Started',
                content: (
                    <>
                        <p className="text-xl text-gray-400 mb-8 leading-relaxed">
                            Lumina Editor is a next-generation video editor that combines a traditional non-linear editing (NLE) timeline with a powerful programmable interface.
                        </p>
                        <div className="grid md:grid-cols-2 gap-6 mb-12">
                            <div className="p-6 bg-[#18181b] rounded-xl border border-white/5">
                                <h3 className="font-semibold text-white mb-2 flex items-center gap-2"><Layers size={18} className="text-blue-400" /> Visual Editing</h3>
                                <p className="text-sm text-gray-400">Drag, drop, and arrange clips on a multi-track timeline just like you're used to.</p>
                            </div>
                            <div className="p-6 bg-[#18181b] rounded-xl border border-white/5">
                                <h3 className="font-semibold text-white mb-2 flex items-center gap-2"><Code size={18} className="text-purple-400" /> Scripting Engine</h3>
                                <p className="text-sm text-gray-400">Automate edits, generate assets, and build complex effects using JavaScript.</p>
                            </div>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-100 mb-4 mt-8">Core Concepts</h3>
                        <ul className="space-y-4 text-gray-300">
                            <li className="flex gap-3">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2.5 shrink-0" />
                                <div>
                                    <strong className="text-white">Timeline & Tracks:</strong> The main workspace. Tracks are layered from bottom (background) to top (foreground).
                                </div>
                            </li>
                            <li className="flex gap-3">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2.5 shrink-0" />
                                <div>
                                    <strong className="text-white">Assets:</strong> Raw media files (images, video, audio) loaded into your project.
                                </div>
                            </li>
                            <li className="flex gap-3">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2.5 shrink-0" />
                                <div>
                                    <strong className="text-white">Clips:</strong> Instances of assets on the timeline. A single asset can create multiple clips.
                                </div>
                            </li>
                        </ul>
                    </>
                )
            },
            ...architectureDocs
        ]
    },
    {
        title: 'Scripting Guide',
        items: [
            ...scriptPanelDocs, // Inserted Panel Deep Dive
            {
                id: 'script-api',
                title: 'API Reference',
                content: (
                    <>
                        <p className="text-gray-400 mb-6">
                            The Command Console allows you to run imperative JavaScript code. Below is the full list of available functions.
                        </p>

                        <h3 className="text-xl font-semibold text-gray-200 mb-4 mt-8 flex items-center gap-2"><FunctionSquare size={20} className="text-purple-400" /> Clip Management</h3>

                        <APIMethod
                            name="addClip"
                            signature='addClip(assetIdOrName: string, config: ClipConfig) => { id: string }'
                            description="Adds a new clip to the timeline from an existing asset."
                            example={`addClip("MyVideo", {
    track: 1, 
    start: 0, 
    duration: 5
});`}
                        />

                        <APIMethod
                            name="updateClip"
                            signature='updateClip(id: string, updates: Partial<Clip>) => void'
                            description="Updates properties of an existing clip."
                            example={`updateClip("c123", {
    scale: 1.5,
    rotation: 45
});`}
                        />

                        <APIMethod
                            name="removeClip"
                            signature='removeClip(id: string) => void'
                            description="Removes a clip from the timeline."
                            example={`removeClip("c123");`}
                        />

                        <APIMethod
                            name="getClip"
                            signature='getClip(id: string) => Clip | undefined'
                            description="Returns the clip object with the given ID."
                            example={`const myClip = getClip("c123");`}
                        />

                        <h3 className="text-xl font-semibold text-gray-200 mb-4 mt-12 flex items-center gap-2"><Sparkles size={20} className="text-blue-400" /> Effects & Assets</h3>

                        <APIMethod
                            name="addEffect"
                            signature='addEffect(clipId: string, effect: Partial<Effect>) => void'
                            description="Adds a visual effect filter to a clip."
                            example={`addEffect("c123", {
    name: "Blur",
    type: "filter",
    value: "blur(10px)"
});`}
                        />

                        <APIMethod
                            name="addTextAsset"
                            signature='addTextAsset(text: string, options?: TextOptions) => Asset'
                            description="Creates a new Text Asset and adds it to the Media Library."
                            example={`addTextAsset("Hello World", {
    fontSize: 60,
    fontColor: "#ff0000"
});`}
                        />

                        <APIMethod
                            name="ai.generateImage"
                            signature='ai.generateImage(prompt: string) => Promise<Asset>'
                            description="Generates an image using AI and returns the asset."
                            example={`await ai.generateImage("Cyberpunk city");`}
                        />
                    </>
                )
            },
            {
                id: 'script-snippets',
                title: 'Common Snippets',
                content: (
                    <>
                        <h3 className="text-xl font-semibold text-gray-200 mb-4">Batch Processing</h3>
                        <p className="text-gray-400 mb-4">Use standard JS loops to modify many clips at once.</p>
                        <DocCodeBlock code={`// Scale all clips on Track 1
clips.forEach(clip => {
    if (clip.trackId === 't1') {
        updateClip(clip.id, { scale: 0.8 });
    }
});`} />

                        <h3 className="text-xl font-semibold text-gray-200 mb-4 mt-8">Procedural Animation</h3>
                        <DocCodeBlock code={`// Create a spiral of clips
for (let i = 0; i < 10; i++) {
    const id = addClip("Shape", {
        track: 1, start: i, duration: 1,
        x: Math.cos(i) * 100,
        y: Math.sin(i) * 100
    }).id;
}`} />
                    </>
                )
            }
        ]
    },
    {
        title: 'Code Panel & Assets',
        items: [
            ...codePanelDocs
        ]
    },
    {
        title: 'Reference',
        items: [
            {
                id: 'timeline-state', // Moved here for reference
                title: 'Timeline State JSON',
                content: (
                    <>
                        <p className="text-gray-400 mb-6">
                            The <strong>Timeline State</strong> (Script Panel Label 2) allows you to view and edit your entire project as a declarative JSON object.
                            This is perfect for bulk re-ordering or precise timing adjustments.
                        </p>

                        <h3 className="text-xl font-semibold text-gray-200 mb-4 mt-8">Structure</h3>
                        <DocCodeBlock code={`timeline = {
  "clips": [
    {
        "id": "c1",
        "asset": "MyVideo",
        "track": 1,
        "start": 0,
        "duration": 5,
        // Optional Visuals
        "scale": 1.2,
        "rotation": 90,
        "effects": [{ "type": "blur", "value": "10px" }]
    }
  ]
};`} />

                        <h3 className="text-xl font-semibold text-gray-200 mb-4 mt-8">Clip Properties</h3>
                        <Table
                            headers={['Property', 'Type', 'Description']}
                            rows={[
                                ['id', 'string', 'Unique UUID for the clip.'],
                                ['asset', 'string', 'Name of the asset (or asset ID).'],
                                ['track', 'number', 'Track index (1-based).'],
                                ['start', 'number', 'Start time in seconds.'],
                                ['duration', 'number', 'Length of the clip in seconds.'],
                                ['scale', 'number', 'Visual scaling factor (default 1.0).'],
                                ['opacity', 'number', 'Visual opacity (0.0 - 1.0).'],
                                ['rotation', 'number', 'Rotation in degrees.'],
                            ]}
                        />
                    </>
                )
            },
            {
                id: 'keyboard-shortcuts',
                title: 'Keyboard Shortcuts',
                content: (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <ShortcutKey keys={['Space']} action="Play / Pause" />
                        <ShortcutKey keys={['Ctrl', 'C']} action="Copy Clip" />
                        <ShortcutKey keys={['Ctrl', 'V']} action="Paste Clip" />
                        <ShortcutKey keys={['Del']} action="Delete Selected" />
                        <ShortcutKey keys={['S']} action="Split Clip at Playhead" />
                        <ShortcutKey keys={['Ctrl', 'Z']} action="Undo" />
                        <ShortcutKey keys={['Ctrl', 'Y']} action="Redo" />
                        <ShortcutKey keys={['Shift', 'Arrow']} action="Nudge Clip (Large)" />
                        <ShortcutKey keys={['Alt', 'Arrow']} action="Nudge Clip (Fine)" />
                    </div>
                )
            }
        ]
    },
    {
        title: 'Advanced Workflows',
        items: [
            {
                id: 'train-gpt',
                title: 'How to Train Your GPT',
                content: (
                    <>
                        <p className="text-gray-400 mb-8 leading-relaxed">
                            Want to use ChatGPT, Claude, or another LLM to write Lumina scripts for you? Paste the following <strong>Master Prompt</strong> into the chat to teach the AI everything it needs to know about our scripting system.
                        </p>

                        <div className="p-4 bg-purple-900/10 border border-purple-500/20 rounded-lg mb-8">
                            <h4 className="text-purple-300 font-semibold mb-2 flex items-center gap-2">
                                <Sparkles size={16} /> Pro Tip
                            </h4>
                            <p className="text-sm text-gray-400">
                                Save this prompt in your notes or as a "System Prompt" if your AI tool allows it. It ensures the AI understands our coordinate system, fallback patterns, and async requirements.
                            </p>
                        </div>

                        <DocCodeBlock code={`# Lumina Editor — Master GPT Prompt (Complete)

## Purpose
This document is a **single master prompt** you can paste into any GPT / LLM to make it fully understand the **Lumina Editor scripting system**, including:
- assets → clips → timeline mental model
- async media loading with guaranteed fallback
- transitions (simple + multi-source)
- animation clips (\`anim_transitionId\`)
- effects and adjustment layers
- props / variables for transitions & effects
- text styles and subtitle patterns
- common pitfalls (reserved variables, await rules, domain failures)

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
- Canvas origin \`(0,0)\` = **CENTER**
- Default aspect ratio = **16:9**

### Track Convention
- Track 1 → Main video
- Track 2 → Overlays / PiP images
- Track 3–4 → Text / subtitles
- Track 4+ → Audio
- Track 5+ → Animation clips / adjustment layers / grain

---

## SCRIPT ENVIRONMENT RULES (VERY IMPORTANT)

- Top-level \`await\` ❌ not allowed  
  ✅ Always wrap code in:
  \`\`\`js
  (async () => { ... })();
  \`\`\`

- Some variables may already exist (\`assets\`, etc.)
  ❌ Do NOT redeclare them
  ✅ Use names like \`mediaMap\`, \`loadedMedia\`
- \`addAssetFromUrl()\` is **async** and may fail:
  * HTTP 404
  * blocked domain
  * timeout
- A failed asset load must **NOT stop script execution**
- Use \`try/catch\` inside loops

---

## GUARANTEED MEDIA FALLBACK PATTERN

When loading ANY media (image / video / audio), you MUST:

1. Try original URL
2. Fallback → \`https://picsum.photos/1920/1080\`
3. Fallback → \`https://placehold.co/1920x1080/png?text=Missing+Media\`
4. Final fallback → **data URL 1×1 image**

This guarantees:
* An **Asset is ALWAYS created**
* Asset keeps the **same requested name**

### Example

\`\`\`js
async function loadMediaGuaranteed(url, name) {
  try { return await addAssetFromUrl(url, name); } catch {}
  try { return await addAssetFromUrl("https://picsum.photos/1920/1080", name); } catch {}
  try { return await addAssetFromUrl("https://placehold.co/1920x1080/png?text=Missing", name); } catch {}
  return await addAssetFromUrl(
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Wl5cAAAAASUVORK5CYII=",
    name
  );
}
\`\`\`

---

## USING FILE NAMES VS ASSET IDS

### SAFE (Recommended)

\`\`\`js
const mediaMap = {};
mediaMap["scene-7"] = await loadMediaGuaranteed(url, "scene-7");

addClip(mediaMap["scene-7"].id, {
  track: 1,
  start: 0,
  duration: 5
});
\`\`\`

### ONLY IF SUPPORTED

\`\`\`js
addClip("scene-7", { track: 1, start: 0, duration: 5 });
\`\`\`

---

## TRANSITIONS — VARIABLES / PROPS

Supported variable types:
* \`number\`
* \`color\`
* \`boolean\`
* \`select\`
* \`source\` (multi-screen)

### Example: Snap Zoom

\`\`\`js
registerTransition({
  id: "snap-zoom",
  name: "Snap Zoom",
  variables: [
    { name: "Zoom", key: "z", type: "number", min: 1, max: 1.8, defaultValue: 1.22 },
    { name: "Rotation", key: "rot", type: "number", min: -20, max: 20, defaultValue: 5 },
    { name: "Fade", key: "fade", type: "boolean", defaultValue: true }
  ],
  apply: ({ progress, params, isExit }) => {
    const p = isExit ? progress : (1 - progress);
    return {
      scale: 1 + (params.z - 1) * p,
      rotation: (params.rot * Math.PI / 180) * p,
      opacity: params.fade ? (isExit ? 1 - progress : progress) : 1
    };
  }
});
\`\`\`

---

## MULTI-SOURCE TRANSITIONS (SCREEN 1 / SCREEN 2)

* Use \`type: "source"\` variables
* Usually applied via **animation clips**
* Screen selection is often done in **Properties Panel**

### Example

\`\`\`js
registerTransition({
  id: "soft-blend",
  name: "Soft Blend",
  variables: [
    { name: "Screen 1", key: "screen1", type: "source", defaultValue: "" },
    { name: "Screen 2", key: "screen2", type: "source", defaultValue: "" }
  ],
  apply: ({ progress, sources }) => ({
    customDraw: (ctx, w, h) => {
      if (sources.screen2) ctx.drawImage(sources.screen2, 0, 0, w, h);
      if (sources.screen1) {
        ctx.globalAlpha = 1 - progress;
        ctx.drawImage(sources.screen1, 0, 0, w, h);
        ctx.globalAlpha = 1;
      }
    }
  })
});
\`\`\`

### Use as animation clip

\`\`\`js
addClip("anim_soft-blend", {
  track: 5,
  start: 10,
  duration: 1
});
\`\`\`

---

## EFFECTS — VARIABLES & APPLICATION

### Example Effect

\`\`\`js
registerEffect({
  id: "beach-grade",
  name: "Beach Grade",
  variables: [
    { name: "Intensity", key: "i", type: "number", min: 0, max: 1, defaultValue: 0.8 },
    { name: "Warmth", key: "w", type: "number", min: -60, max: 60, defaultValue: 18 },
    { name: "Glow", key: "glow", type: "boolean", defaultValue: true }
  ],
  apply: (ctx) => {
    const p = ctx.params;
    let filter = \`contrast(\${1 + p.i*0.1}) saturate(\${1 + p.i*0.2}) hue-rotate(\${p.w}deg)\`;
    if (p.glow) filter += \` drop-shadow(0 0 20px rgba(255,255,255,0.25))\`;
    return { filter };
  }
});
\`\`\`

### Apply Effect

\`\`\`js
addEffect(clip.id, {
  name: "Beach Grade",
  kind: "beach-grade",
  effectParams: { i: 0.9, w: 22, glow: false }
});
\`\`\`

### Best Practice

Use **adjustment layer clips**:

\`\`\`js
const adj = addClip("fx_adjustment_layer", {
  track: 8,
  start: 0,
  duration: 120
});
\`\`\`

---

## PHOTO-FRAME EFFECT (IMPORTANT)

Photo-frame = **same image twice**:
* Background → blurred, darker, scaled up
* Foreground → sharp, smaller, shadowed

\`\`\`js
// Background
const bg = addClip(asset.id, { track: 1, start, duration, scale: 1.2 });
addEffect(bg.id, { name: "blur", value: "blur(18px) brightness(0.7)" });

// Foreground
const fg = addClip(asset.id, { track: 2, start: start+0.1, duration: duration-0.2, scale: 0.75 });
addEffect(fg.id, { name: "shadow", value: "drop-shadow(0 24px 55px rgba(0,0,0,0.4))" });
\`\`\`

---

## TEXT / SUBTITLE STYLES

### Big Promo

\`\`\`js
addTextAsset("STEP OUT.", {
  fontSize: 90,
  isBold: true,
  fontColor: "#fff",
  backgroundColor: "rgba(0,0,0,0.45)",
  borderRadius: 22,
  padding: 22
});
\`\`\`

### Vibe Subtitle

\`\`\`js
addTextAsset("Come feel the beach.", {
  fontSize: 52,
  isBold: true,
  fontColor: "#fff",
  backgroundColor: "rgba(0,0,0,0.55)",
  borderRadius: 18,
  padding: 18
});
\`\`\`

### Lower Third

\`\`\`js
addTextAsset("MUMBAI • JUHU", {
  fontSize: 36,
  isBold: true,
  fontColor: "#fff",
  backgroundColor: "rgba(0,0,0,0.45)",
  borderRadius: 14,
  padding: 14
});
\`\`\`

---

## WHEN I ASK FOR A SCRIPT, YOU MUST

* Produce **ONE complete runnable Lumina script**
* Wrap everything in async IIFE
* Use robust fallback loader
* Use clean, modern transitions
* Add PiP + photo-frame + overlays
* Add subtitles properly
* Never crash if media fails
* Mention when Screen 1 / Screen 2 must be selected manually

---

## END OF PROMPT`} />
                    </>
                )
            }
        ]
    }
];

// --- Components ---

function DocCodeBlock({ code }: { code: string }) {
    return (
        <div className="my-4 rounded-lg overflow-hidden bg-[#1e1e1e] border border-white/10 shadow-sm relative group">
            <div className="absolute right-4 top-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={() => navigator.clipboard.writeText(code)}
                    className="text-xs bg-white/10 hover:bg-white/20 text-white px-2 py-1 rounded transition-colors"
                >
                    Copy
                </button>
            </div>
            <pre className="p-4 overflow-x-auto text-sm font-mono text-blue-100 leading-relaxed">
                <code>{code}</code>
            </pre>
        </div>
    );
}

function APIMethod({ name, signature, description, example }: { name: string, signature: string, description: string, example?: string }) {
    return (
        <div className="mb-10 last:mb-0">
            <h4 className="font-mono text-lg font-bold text-blue-300 mb-2">{name}</h4>
            <div className="font-mono text-xs text-gray-500 mb-3 bg-black/30 p-2 rounded border border-white/5 break-all">
                {signature}
            </div>
            <p className="text-gray-300 mb-4 text-sm leading-relaxed">{description}</p>
            {example && <DocCodeBlock code={example} />}
        </div>
    )
}

function Table({ headers, rows }: { headers: string[], rows: string[][] }) {
    return (
        <div className="overflow-x-auto border border-white/10 rounded-lg">
            <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-400 uppercase bg-white/5 border-b border-white/10">
                    <tr>
                        {headers.map(h => <th key={h} className="px-6 py-3 font-medium">{h}</th>)}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, i) => (
                        <tr key={i} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                            {row.map((cell, j) => (
                                <td key={j} className={`px-6 py-4 ${j === 0 ? 'font-mono text-blue-300' : 'text-gray-400'}`}>
                                    {cell}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

function ShortcutKey({ keys, action }: { keys: string[], action: string }) {
    return (
        <div className="flex items-center justify-between p-3 bg-[#18181b] border border-white/5 rounded-lg group hover:border-white/10 transition-colors">
            <span className="text-gray-300 text-sm">{action}</span>
            <div className="flex gap-1">
                {keys.map(k => (
                    <kbd key={k} className="px-2 py-1 bg-[#27272a] border border-white/10 rounded text-xs font-mono text-gray-400 min-w-[24px] text-center shadow-sm group-hover:text-white group-hover:bg-[#3f3f46] transition-colors">
                        {k}
                    </kbd>
                ))}
            </div>
        </div>
    );
}

export function DocsPage() {
    const [activeSection, setActiveSection] = useState('getting-started');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const data = getDocData();

    // Flatten for finding active
    const allSections = data.flatMap(c => c.items);
    const currentSection = allSections.find(s => s.id === activeSection) || allSections[0];

    return (
        <div className="min-h-screen bg-[#09090b] text-gray-300 font-sans flex flex-col selection:bg-blue-500/30">
            {/* Navbar */}
            <nav className="border-b border-white/10 bg-[#09090b]/80 backdrop-blur-md sticky top-0 z-50 h-16 flex items-center px-4 md:px-6 lg:px-8 shrink-0 justify-between">
                <div className="flex items-center gap-4">
                    {/* Mobile Menu Toggle */}
                    <button
                        onClick={() => setIsMobileMenuOpen(true)}
                        className="md:hidden text-gray-400 hover:text-white transition-colors"
                    >
                        <Menu size={20} />
                    </button>

                    <Link to="/" className="flex items-center gap-2 text-gray-200 hover:text-white font-semibold transition-colors">
                        <div className="w-6 h-6 bg-gradient-to-br from-indigo-500 to-purple-600 rounded flex items-center justify-center font-bold text-white text-xs">L</div>
                        <span className="hidden sm:inline">Lumina Docs</span>
                    </Link>
                    <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-medium border border-blue-500/20">v2.0 Beta</span>
                </div>

                <div className="flex items-center gap-4">
                    {/* Search Placeholder */}
                    <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-sm text-gray-500 w-64 hover:border-white/20 transition-colors cursor-text group">
                        <Search size={14} className="group-hover:text-gray-300 transition-colors" />
                        <span className="group-hover:text-gray-300 transition-colors">Search documentation...</span>
                        <span className="ml-auto text-xs border border-white/10 px-1.5 rounded text-gray-600 group-hover:text-gray-400">Ctrl K</span>
                    </div>

                    <div className="h-6 w-px bg-white/10 mx-2 hidden sm:block"></div>

                    <Link to="/" className="text-sm text-gray-400 hover:text-white transition-colors hidden sm:block">Home</Link>
                    <Link to="/editor" className="text-sm bg-white text-black px-3 py-1.5 rounded-md font-medium hover:bg-gray-200 transition-colors flex items-center gap-2">
                        <span>Open Editor</span>
                        <MoveRight size={14} />
                    </Link>
                </div>
            </nav>

            <div className="flex-1 max-w-[1440px] mx-auto w-full flex overflow-hidden relative">

                {/* Mobile Sidebar Overlay */}
                {isMobileMenuOpen && (
                    <div className="absolute inset-0 z-40 md:hidden flex">
                        {/* Backdrop */}
                        <div
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
                            onClick={() => setIsMobileMenuOpen(false)}
                        />

                        {/* Sidebar Drawer */}
                        <aside className="relative w-80 bg-[#18181b] border-r border-white/10 h-full overflow-y-auto animate-in slide-in-from-left duration-200 shadow-2xl flex flex-col">
                            <div className="p-4 border-b border-white/5 flex items-center justify-between">
                                <span className="font-semibold text-white">Navigation</span>
                                <button onClick={() => setIsMobileMenuOpen(false)} className="text-gray-400 hover:text-white">
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="p-6 pb-20 flex-1">
                                {data.map((category) => (
                                    <div key={category.title} className="mb-8 last:mb-0">
                                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 px-3">{category.title}</h4>
                                        <ul className="space-y-0.5">
                                            {category.items.map(item => (
                                                <li key={item.id}>
                                                    <button
                                                        onClick={() => {
                                                            setActiveSection(item.id);
                                                            setIsMobileMenuOpen(false);
                                                            document.getElementById('doc-main')?.scrollTo({ top: 0, behavior: 'smooth' });
                                                        }}
                                                        className={`w-full text-left px-3 py-3 rounded-md text-sm transition-all flex items-center justify-between group ${activeSection === item.id
                                                            ? 'bg-blue-500/10 text-blue-400 font-medium'
                                                            : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                                                            }`}
                                                    >
                                                        {item.title}
                                                        {activeSection === item.id && <ChevronRight size={14} className="text-blue-400" />}
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        </aside>
                    </div>
                )}

                {/* Desktop Sidebar (md and up) */}
                {/* Desktop Sidebar (md and up) - Robust Media Query Fallback */}
                <style>{`@media (max-width: 768px) { .desktop-sidebar { display: none !important; } }`}</style>
                <aside className="desktop-sidebar w-64 lg:w-72 border-r border-white/10 bg-[#09090b] overflow-y-auto flex flex-col sticky top-0 h-[calc(100vh-4rem)] z-30">
                    <div className="p-6 pb-20 flex-1">
                        {data.map((category) => (
                            <div key={category.title} className="mb-8 last:mb-0">
                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 px-3">{category.title}</h4>
                                <ul className="space-y-0.5">
                                    {category.items.map(item => (
                                        <li key={item.id}>
                                            <button
                                                onClick={() => {
                                                    setActiveSection(item.id);
                                                    document.getElementById('doc-main')?.scrollTo({ top: 0, behavior: 'auto' });
                                                }}
                                                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-all flex items-center justify-between group ${activeSection === item.id
                                                    ? 'bg-blue-500/10 text-blue-400 font-medium'
                                                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                                                    }`}
                                            >
                                                {item.title}
                                                {activeSection === item.id && <ChevronRight size={14} className="text-blue-400 animate-in fade-in slide-in-from-left-2 duration-300" />}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </aside>

                {/* Main Content */}
                <main id="doc-main" className="flex-1 min-w-0 overflow-y-auto h-[calc(100vh-4rem)] scroll-smooth">
                    <div className="max-w-4xl mx-auto px-6 py-12 lg:px-12 lg:py-16">

                        {/* Breadcrumb */}
                        <div className="flex items-center gap-2 text-sm text-gray-500 mb-8 font-medium">
                            <span>Docs</span>
                            <ChevronRight size={14} />
                            <span className="text-gray-200">{currentSection.title}</span>
                        </div>

                        <article className="prose prose-invert prose-blue max-w-none pb-20">
                            <h1 className="text-4xl font-extrabold tracking-tight text-white mb-6 scroll-m-20">
                                {currentSection.title}
                            </h1>
                            <div className="text-base text-gray-300 leading-7">
                                {currentSection.content}
                            </div>
                        </article>

                        {/* Footer Navigation (Next/Prev) */}
                        <div className="mt-12 pt-8 border-t border-white/10 flex justify-between items-center text-sm">
                            {/* Logic to find prev/next could go here - placeholder for now */}
                            <div className="text-gray-500">
                                Did this page help you? <button className="ml-2 text-blue-400 hover:underline">Yes</button> • <button className="ml-2 text-blue-400 hover:underline">No</button>
                            </div>
                            <div className="text-gray-600">
                                Last updated: {new Date().toLocaleDateString()}
                            </div>
                        </div>
                    </div>
                </main>

                {/* Right Sidebar (On This Page) */}
                <aside className="w-64 hidden xl:block sticky top-16 h-[calc(100vh-4rem)] p-8 border-l border-white/5 bg-[#09090b]">
                    <h5 className="text-xs font-semibold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Hash size={12} /> On This Page
                    </h5>
                    <div className="space-y-2 text-sm text-gray-500">
                        <p className="text-xs italic opacity-50">Table of contents based on headers</p>
                        {/* Dynamic TOC would go here, hardcoded example for visual fidelity */}
                        <div className="border-l border-white/10 pl-4 py-1 hover:border-blue-400 cursor-pointer transition-colors text-gray-400 hover:text-white">Overview</div>
                        <div className="border-l border-white/10 pl-4 py-1 hover:border-blue-400 cursor-pointer transition-colors text-gray-400 hover:text-white">Examples</div>
                    </div>
                </aside>
            </div>
        </div>
    );
}
