# Transition Development Guide

This guide explains how to create custom transitions in Lumina Editor.

---

## Table of Contents
1. [Basic Structure](#basic-structure)
2. [Transition Interface](#transition-interface)
3. [Variables](#variables)
4. [TransitionContext](#transitioncontext)
5. [TransitionResult](#transitionresult)
6. [Custom Drawing](#custom-drawing)
7. [Multi-Source Transitions](#multi-source-transitions)
8. [Examples](#examples)
9. [Workflow](#workflow)

---

## Basic Structure

Every transition is defined as a TypeScript object that implements the `Transition` interface:

```typescript
import { Transition, TransitionContext, TransitionResult } from '../types';

export const myTransition: Transition = {
    id: 'my-transition',           // Unique identifier (kebab-case)
    name: 'My Transition',          // Display name in UI
    description: 'What it does',   // Optional description
    variables: [],                  // User-configurable parameters
    apply: (context) => { ... }     // The transition logic
};
```

---

## Transition Interface

```typescript
interface Transition {
    id: string;                     // Unique ID for registry
    name: string;                   // Human-readable name
    description?: string;           // Optional description
    variables: TransitionVariable[]; // User-configurable parameters
    apply: (context: TransitionContext) => TransitionResult;
}
```

### Fields Explained:

- **`id`**: Must be unique across all transitions. Use kebab-case (e.g., `'fade-in'`, `'slide-left'`)
- **`name`**: Shown in the FX panel and properties panel
- **`description`**: Optional tooltip text
- **`variables`**: Array of parameters users can adjust (see [Variables](#variables))
- **`apply`**: Function that receives context and returns the transition effect

---

## Variables

Variables allow users to customize your transition. Each variable appears as a control in the Properties Panel.

### Variable Types:

```typescript
interface TransitionVariable {
    name: string;        // Label shown in UI
    key: string;         // Property key in params object
    type: 'number' | 'color' | 'select' | 'boolean' | 'code' | 'source' | 'logo' | 'link';
    defaultValue: any;   // Initial value
    min?: number;        // For number type
    max?: number;        // For number type
    step?: number;       // For number type
    options?: string[];  // For select type
}
```

### Type Examples:

#### Number
```typescript
{
    name: 'Intensity',
    key: 'intensity',
    type: 'number',
    min: 0,
    max: 100,
    step: 1,
    defaultValue: 50
}
```
**UI**: Slider or number input

#### Color
```typescript
{
    name: 'Overlay Color',
    key: 'overlayColor',
    type: 'color',
    defaultValue: '#ff0000'
}
```
**UI**: Color picker

#### Select (Dropdown)
```typescript
{
    name: 'Direction',
    key: 'direction',
    type: 'select',
    options: ['left', 'right', 'up', 'down'],
    defaultValue: 'left'
}
```
**UI**: Dropdown menu

#### Boolean
```typescript
{
    name: 'Enable Blur',
    key: 'enableBlur',
    type: 'boolean',
    defaultValue: false
}
```
**UI**: Checkbox

#### Source (Multi-Screen)
```typescript
{
    name: 'Screen 1',
    key: 'screen1',
    type: 'source',
    defaultValue: ''
}
```
**UI**: Dropdown with overlapping clips, "Transparent", "Custom Fill"
**Note**: Only appears for Animation clips, not In/Out transitions

#### Logo
```typescript
{
    name: 'Logo URL',
    key: 'logoUrl',
    type: 'logo',
    defaultValue: ''
}
```
**UI**: Text input for logo path/URL

#### Link
```typescript
{
    name: 'Website',
    key: 'website',
    type: 'link',
    defaultValue: ''
}
```
**UI**: URL input

---

## TransitionContext

The `apply` function receives a context object with all the information needed to render the transition:

```typescript
interface TransitionContext {
    progress: number;      // 0 to 1 (transition progress)
    width: number;         // Canvas width
    height: number;        // Canvas height
    isExit: boolean;       // true for exit, false for enter
    params: any;           // User-set variable values
    sources?: {            // For multi-source transitions
        [key: string]: HTMLCanvasElement | OffscreenCanvas
    };
}
```

### Fields Explained:

- **`progress`**: Ranges from 0 (start) to 1 (end). Use this to animate your transition.
- **`width`**, **`height`**: Canvas dimensions. Use for positioning and scaling.
- **`isExit`**: 
  - `true` = Exit transition (clip fading out)
  - `false` = Enter transition (clip fading in)
- **`params`**: Object containing all variable values. Access via `params.variableKey`
- **`sources`**: Only present if you defined `source` type variables. Contains pre-rendered canvases of selected clips.

---

## TransitionResult

Your `apply` function must return a `TransitionResult` object:

```typescript
interface TransitionResult {
    opacity?: number;           // 0 to 1
    offsetX?: number;           // Pixels
    offsetY?: number;           // Pixels
    scale?: number;             // Multiplier (1 = normal)
    rotation?: number;          // Radians
    overlayColor?: string;      // CSS color
    customDraw?: (ctx: CanvasRenderingContext2D, w: number, h: number, snapshot?: HTMLCanvasElement | OffscreenCanvas) => void;
}
```

### Simple Properties:

These are applied automatically by the renderer:

```typescript
return {
    opacity: progress,           // Fade in
    offsetX: (1 - progress) * width,  // Slide from right
    scale: 0.5 + (progress * 0.5),    // Zoom from 50% to 100%
    rotation: progress * Math.PI * 2   // Full rotation
};
```

### Custom Drawing:

For complex effects, use `customDraw`:

```typescript
return {
    customDraw: (ctx, w, h, snapshot) => {
        // ctx = Canvas 2D context
        // w, h = Canvas dimensions
        // snapshot = Pre-rendered frame (before transition)
        
        // Your custom drawing code here
        ctx.fillStyle = 'red';
        ctx.fillRect(0, 0, w * progress, h);
    }
};
```

**Important**: `customDraw` is called AFTER the clip is rendered. The `snapshot` parameter contains the already-rendered frame.

---

## Custom Drawing

The `customDraw` function gives you full control over the canvas:

### Available Parameters:

1. **`ctx`**: CanvasRenderingContext2D - Use all canvas drawing methods
2. **`w`**, **`h`**: Canvas width and height
3. **`snapshot`**: Pre-rendered frame (the clip content before transition effects)

### Example: Wipe Effect

```typescript
customDraw: (ctx, w, h, snapshot) => {
    // Draw the snapshot (original frame)
    if (snapshot) {
        ctx.drawImage(snapshot, 0, 0, w, h);
    }
    
    // Create a wipe by clipping
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, w * progress, h);
    ctx.clip();
    
    // Draw something in the wiped area
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, w, h);
   
    ctx.restore();
}
```

### Canvas Methods You Can Use:

- **Drawing**: `fillRect`, `strokeRect`, `fillText`, `drawImage`
- **Paths**: `beginPath`, `moveTo`, `lineTo`, `arc`, `closePath`
- **Styles**: `fillStyle`, `strokeStyle`, `lineWidth`, `globalAlpha`
- **Transforms**: `translate`, `rotate`, `scale`
- **Clipping**: `clip`, `save`, `restore`

---

## Multi-Source Transitions

Multi-source transitions can access content from multiple clips simultaneously.

### Defining Source Variables:

```typescript
variables: [
    {
        name: 'Screen 1',
        key: 'screen1',
        type: 'source',
        defaultValue: ''
    },
    {
        name: 'Screen 2',
        key: 'screen2',
        type: 'source',
        defaultValue: ''
    }
]
```

### Accessing Sources:

```typescript
apply: (context) => {
    const { sources, progress } = context;
    const screen1 = sources?.['screen1'];
    const screen2 = sources?.['screen2'];
    
    return {
        customDraw: (ctx, w, h) => {
            // Draw screen2 (background)
            if (screen2) {
                ctx.drawImage(screen2, 0, 0, w, h);
            }
            
            // Draw screen1 (foreground) with fade
            if (screen1) {
                ctx.globalAlpha = progress;
                ctx.drawImage(screen1, 0, 0, w, h);
            }
        }
    };
}
```

### Source Options:

Users can select:
- **Overlapping clips**: Other clips on the timeline
- **Transparent**: Empty/transparent canvas
- **Custom Fill**: Solid color (shows color picker)

---

## Examples

### Example 1: Simple Fade

```typescript
export const fadeTransition: Transition = {
    id: 'fade',
    name: 'Fade',
    variables: [],
    apply: (context) => {
        const { progress, isExit } = context;
        return {
            opacity: isExit ? 1 - progress : progress
        };
    }
};
```

### Example 2: Slide with Direction

```typescript
export const slideTransition: Transition = {
    id: 'slide',
    name: 'Slide',
    variables: [
        {
            name: 'Direction',
            key: 'direction',
            type: 'select',
            options: ['left', 'right', 'up', 'down'],
            defaultValue: 'left'
        }
    ],
    apply: (context) => {
        const { progress, width, height, params, isExit } = context;
        const direction = params.direction || 'left';
        const t = isExit ? progress : 1 - progress;
        
        let offsetX = 0, offsetY = 0;
        
        if (direction === 'left') offsetX = -width * t;
        else if (direction === 'right') offsetX = width * t;
        else if (direction === 'up') offsetY = -height * t;
        else if (direction === 'down') offsetY = height * t;
        
        return { offsetX, offsetY };
    }
};
```

### Example 3: Multi-Source Blend

```typescript
export const blendTransition: Transition = {
    id: 'blend',
    name: 'Blend',
    variables: [
        {
            name: 'Screen 1',
            key: 'screen1',
            type: 'source',
            defaultValue: ''
        },
        {
            name: 'Screen 2',
            key: 'screen2',
            type: 'source',
            defaultValue: ''
        }
    ],
    apply: (context) => {
        const { sources, progress } = context;
        
        return {
            customDraw: (ctx, w, h) => {
                // Draw screen2 at full opacity
                if (sources?.screen2) {
                    ctx.globalAlpha = 1;
                    ctx.drawImage(sources.screen2, 0, 0, w, h);
                }
                
                // Blend in screen1
                if (sources?.screen1) {
                    ctx.globalAlpha = progress;
                    ctx.drawImage(sources.screen1, 0, 0, w, h);
                }
            }
        };
    }
};
```

---

## Workflow

### How Transitions Work in Lumina Editor

#### 1. **Registration**

Transitions are registered in `transitions/registry.ts`:

```typescript
import { myTransition } from './library/my-transition';

const transitions: Record<string, Transition> = {
    'my-transition': myTransition
};
```

The FX panel automatically shows all registered transitions.

#### 2. **User Interaction**

**For In/Out Transitions (Media Clips):**
1. User selects a video/image clip
2. Properties Panel shows "Enter" and "Exit" dropdowns
3. User selects a transition from the dropdown
4. Transition parameters appear below
5. User adjusts parameters (if any)

**For Animation Clips (FX Panel):**
1. User drags transition from FX panel to timeline
2. Creates an Animation clip with that transition type
3. Properties Panel shows:
   - Type (read-only)
   - Duration
   - Easing
   - All transition variables (including source dropdowns if applicable)

#### 3. **Rendering Process**

When the timeline plays or exports:

```
1. Renderer identifies clip needs transition
   ↓
2. Retrieves transition from registry by ID
   ↓
3. Gathers context:
   - Current progress (based on time)
   - Canvas dimensions
   - User parameters
   - Source clips (if multi-source)
   ↓
4. Calls transition.apply(context)
   ↓
5. Receives TransitionResult
   ↓
6. Applies simple properties (opacity, offset, scale, rotation)
   ↓
7. If customDraw exists:
   - Captures snapshot of rendered frame
   - Calls customDraw with context and snapshot
   ↓
8. Final frame is drawn to canvas
```

#### 4. **Multi-Source Rendering**

For transitions with `source` variables:

```
1. Renderer detects source variables in transition
   ↓
2. For each source variable:
   - Gets selected value (clip ID, __transparent__, or __custom_fill__)
   - If clip ID: Renders that clip to offscreen canvas
   - If __transparent__: Creates empty canvas
   - If __custom_fill__: Creates canvas filled with selected color
   ↓
3. Collects all source canvases into sources object
   ↓
4. Passes sources to transition.apply(context)
   ↓
5. Transition's customDraw can access sources via context.sources
```

#### 5. **Timeline Flow**

```
User adds clip → Clip has enterTransition/exitTransition
                ↓
Timeline plays → For each frame:
                ↓
                Check if in transition zone
                ↓
                Calculate progress (0-1)
                ↓
                Apply transition
                ↓
                Render to canvas
```

#### 6. **Auto-Sync**

When you add a new transition file:

```
1. Create file in transitions/library/my-transition.ts
   ↓
2. Import in transitions/registry.ts
   ↓
3. Add to transitions object
   ↓
4. FX panel automatically updates (via subscribeToRegistry)
   ↓
5. Transition appears in UI immediately
```

### Best Practices

1. **Keep `apply` pure**: Don't modify external state
2. **Use `progress` for animation**: Always base effects on the progress value
3. **Handle `isExit`**: Make sure your transition works both ways
4. **Test with different durations**: Transitions should work at any speed
5. **Use `customDraw` for complex effects**: Don't try to do everything with simple properties
6. **Clean up canvas state**: Use `ctx.save()` and `ctx.restore()` in customDraw
7. **Optimize performance**: Avoid heavy calculations in customDraw (runs every frame)

### Common Patterns

**Easing Functions:**
```typescript
const easeInOut = (t: number) => t < 0.5 
    ? 2 * t * t 
    : -1 + (4 - 2 * t) * t;

const easedProgress = easeInOut(progress);
```

**Bidirectional Transitions:**
```typescript
const t = isExit ? progress : 1 - progress;
return { opacity: 1 - t };
```

**Combining Properties:**
```typescript
return {
    opacity: progress,
    scale: 0.5 + (progress * 0.5),
    rotation: progress * Math.PI
};
```

---

## Summary

1. **Create** a transition file in `transitions/library/`
2. **Define** the Transition object with id, name, variables, and apply function
3. **Register** in `transitions/registry.ts`
4. **Test** in the editor (appears automatically in FX panel)
5. **Use** simple properties for basic effects, customDraw for complex ones
6. **Multi-source** transitions can access multiple clips via sources

For questions or issues, check existing transitions in `transitions/library/` for reference!
