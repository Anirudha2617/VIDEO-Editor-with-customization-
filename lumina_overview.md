# Lumina Video Editor Overview

Lumina Editor is a modern, feature-rich web-based video editing application. It provides a comprehensive suite of tools for importing media, editing timelines, adding effects, and exporting high-quality video content.

## Tools & Features

The editor toolbar (Ribbon) provides access to the following key tools:

### 1. **Preview** (`MonitorPlay`)
- **Use:** Watch real-time playback of your video project.
- **Features:** Play/Pause, Seek, and verify edits before exporting.

### 2. **Timeline** (`Clock`)
- **Use:** The core workspace for arranging your video.
- **Features:**
    - Multi-track support (Video, Audio, Text, Overlay).
    - Drag-and-drop media placement.
    - Clip manipulation: Split, Trim, Move, Delete.
    - Zoom controls for precise editing.

### 3. **Media** (`ImageIcon`)
- **Use:** Manage your project's media assets.
- **Features:** Upload and organize images and videos to be used in your project.

### 4. **Audio** (`Music`)
- **Use:** Import and manage sound assets.
- **Features:** Add background music and sound effects (SFX) to dedicated audio tracks.

### 5. **Text** (`Type`)
- **Use:** Add text overlays and titles.
- **Features:** Create editable text clips with customizable fonts, colors, and animations.

### 6. **Shapes** (`Shapes`)
- **Use:** Add geometric shapes to your video.
- **Features:** rectangles, circles, arrows, and more. Useful for annotations or graphic elements.

### 7. **Effects** (`Wand2`)
- **Use:** Apply visual effects and transitions.
- **Features:**
    - **Filters:** Change the look of your video (e.g., Pixelate, Blur).
    - **Transitions:** specific visual blends between clips (e.g., Cross Zoom, Fade).

### 8. **Code** (`Code`)
- **Use:** Programmatically create assets using HTML, CSS, and JavaScript.
- **Features:** Write code to render custom animations, dynamic text, or complex visual patterns that are "baked" into video or image assets.

### 9. **Script** (`ScrollText`)
- **Use:** Advanced automation and batch editing.
- **Features:** A command console to run JavaScript commands that manipulate the timeline directly (e.g., "resize all clips", "randomize order").

### 10. **AI Gen** (`Sparkles`)
- **Use:** Generate new content using Artificial Intelligence.
- **Features:** Create images, videos, music, and voiceovers from text prompts.

---

## How to Use AI & Code to Make Videos

Lumina offers two powerful ways to use AI and automation: **AI Generation** (for content) and **Code/Scripting** (for logic and custom effects).

### 1. Generating Content with AI (AI Panel)
Use the **AI Gen** tool (`Sparkles` icon) to create assets from scratch using natural language prompts.

-   **Generate Images**:
    -   Select the **Image** tab.
    -   Type a prompt like *"A futuristic city skyline at sunset, cyberpunk style"*.
    -   Click **Generate**. The AI will create the image and add it to your Media Library.
-   **Generate Video**:
    -   Select the **Video** tab.
    -   Describe the scene (e.g., *"Drone shot of a mountain range"*).
    -   The AI will generate a short video clip for you to use.
-   **Generate Audio & Music**:
    -   Select **Audio**, choose "Music" or "Sound Effect".
    -   Describe the vibe (e.g., *"Lo-fi hip hop beat for studying"*).
-   **AI Voiceovers (TTS)**:
    -   Select **TTS**, choose a voice style (e.g., "Narrator", "Robot").
    -   Type your script, and the AI will generate a spoken audio file.

### 2. Implementing Scripts & Effects (Code Panel)
Use the **Code** tool (`Code` icon) to write custom effects or use AI to write code for you.

-   **AI Code Writing**:
    -   In the Code Panel, click the **AI Bot** icon (`Bot` face).
    -   Ask it to write code, for example: *"Write a CSS animation for a pulsing neon circle"*.
    -   The AI will generate the HTML/CSS/JS for you.
    -   Click **Bake Asset** to turn that code into a usable Video or Image asset.

-   **Creating Custom Transitions/Effects**:
    -   You can write special JavaScript in the Code Panel to create real-time transitions.
    -   **Format**: Your script must return an object with an `apply` function.
    -   **Example Transition Script**:
        ```javascript
        return {
          id: 'my-custom-zoom',
          name: 'Super Zoom',
          apply: (ctx) => {
            // ctx.progress goes from 0 to 1
            const scale = 1 + ctx.progress * 5;
            return { transform: `scale(${scale})` };
          }
        };
        ```
    -   Select **Transition** or **Filter** from the dropdown and click **Bake/Register**. This will make your custom effect available in the Effects panel.

### 3. Automating the Editor (Script Panel)
Use the **Script** tool (`ScrollText` icon) to automate tasks.

-   **Batch Commands**: You can run commands to modify your timeline instantly.
    -   *Example*: "Scale all clips on Track 1 to 50%"
        ```javascript
        clips.forEach(c => {
          if (c.trackId === 't1') updateClip(c.id, { scale: 0.5 });
        });
        ```
-   **Procedural Generation**: Write loops to add random assets to the timeline automatically.
