# Lumina Script Editor: Panel 2 Guide (Timeline State)

Panel 2 is the **Timeline State** editor, a declarative JSON environment that represents the entire state of your timeline. It allows you to view, edit, and bulk-modify your project structure.

## Overview
- **Format**: JavaScript Object Notation (JSON) assignment.
- **Structure**: `timeline = { clips: [...] };`
- **Behavior**: Clicking **Apply** parses this JSON and completely replaces the current timeline state with the defined clips.
- **Auto-Sync**: The panel automatically updates when you make changes in the visual timeline (drag, drop, resize).
- **Bi-directional Sync**: Use the **Sync** button (header) to link selection. Clicking a clip in the timeline scrolls to its code, and clicking code selects the clip in the timeline.

## JSON Structure

The state is defined as a single object assigned to the `timeline` variable:

```javascript
timeline = {
  "clips": [
    // Clip Objects...
  ]
};
```

### Clip Object Properties

Each item in the `clips` array represents a clip on the timeline.

| Property | Type | Description |
|----------|------|-------------|
| `id` | string | Unique identifier (UUID). |
| `asset` | string | Name of the asset (e.g., "Image1", "anim_rotate"). |
| `track` | number | Track index (1-based: 1, 2, 3...). |
| `start` | number | Start time in seconds. |
| `duration` | number | Duration in seconds. |

### Visual Properties (Optional)

You can add these properties to control the visual appearance:

```javascript
{
  "scale": 1.5,       // 1.0 is default
  "opacity": 0.5,     // 0.0 to 1.0
  "rotation": 90,     // Degrees
  "x": 100,           // Horizontal offset (pixels)
  "y": -50            // Vertical offset (pixels)
}
```

### Effects & Animations (Optional)

Define effects and built-in animations:

```javascript
{
  "effects": [
    {
      "type": "Blur",
      "value": "blur(5px)"
    }
  ],
  "transitionParams": {
      "degrees": 180,
      "direction": "counterclockwise"
  }
}
```

## "Asset Not Found" & Virtual Assets

You can use special prefixes for assets that don't verify against the Media Library:

- **Animations**: `anim_rotate`, `anim_fade`, `anim_zoom`
- **Shapes**: `shape_rectangle`, `shape_circle`

These "Virtual Assets" allow you to create effects on the fly without uploading files.

## Example Usage

### 1. Swapping Tracks
To move a clip from Track 2 to Track 1, simply change the number:

**Before:**
```javascript
{
  "asset": "MyVideo",
  "track": 2,
  "start": 0,
  "duration": 5
}
```

**After:**
```javascript
{
  "asset": "MyVideo",
  "track": 1, // Changed to 1
  "start": 0,
  "duration": 5
}
```

### 2. Precise Alignment
Perfect for aligning multiple clips to the exact same start time or duration.

```javascript
timeline = {
  "clips": [
    {
      "id": "c1",
      "asset": "Video A",
      "track": 1,
      "start": 0,
      "duration": 2.5
    },
    {
      "id": "c2",
      "asset": "Video B",
      "track": 1,
      "start": 2.5, // Perfectly aligned with previous end
      "duration": 2.5
    }
  ]
};
```
