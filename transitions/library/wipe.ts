import { Transition, TransitionContext, TransitionResult } from '../../models';

export const wipeTransition: Transition = {
    id: 'wipe',
    name: 'Wipe',
    description: 'Wipes a color across the screen.',
    variables: [
        {
            name: 'Color',
            key: 'color',
            type: 'color',
            defaultValue: '#000000'
        },
        {
            name: 'Direction',
            key: 'direction',
            type: 'select',
            options: ['left', 'right', 'up', 'down'],
            defaultValue: 'right'
        }
    ],
    apply: (context: TransitionContext): TransitionResult => {
        const { ctx, width, height, progress, isExit, params } = context;
        const color = params.color || '#000000';
        const direction = params.direction || 'right';

        // Create gradient or solid color based on progress
        // For a simple wipe, we draw a rect over the content

        let x = 0, y = 0, w = 0, h = 0;

        const p = isExit ? progress : (1 - progress);

        if (direction === 'right') {
            w = width * p;
            h = height;
            x = 0; y = 0;
        } else if (direction === 'left') {
            w = width * p;
            h = height;
            x = width - w; y = 0;
        } else if (direction === 'down') {
            w = width;
            h = height * p;
            x = 0; y = 0;
        } else if (direction === 'up') {
            w = width;
            h = height * p;
            x = 0; y = height - h;
        }

        // We return an overlay color object that the renderer can use to draw
        // But the renderer logic for "overlayColor" in the plan was a bit specific.
        // Let's make the renderer use this result directly.
        // Actually, for complex wipes (gradients), we might need to return a style.

        // To keep it simple for now, we'll return an overlayColor definition
        // But wait, the standard renderer logic for wipe was:
        // overlayColor = { style: ..., opacity: ... }

        // If we want to support "partial" wipes (where the image is revealed), 
        // we can't just return a global opacity. We need to tell the renderer to draw a shape.

        // Since the current renderer architecture draws the clip THEN the overlay,
        // we can return an overlayColor.

        // However, a true "Wipe" usually reveals the underlying clip.
        // If this is a transition between clips, it's tricky without a compostiting buffer.
        // But for "In/Out" transitions on a single clip (which is what Lumina seems to do currently),
        // "Wipe" usually means "Wipe to/from Color".

        // Let's stick to the "Wipe to Color" logic for now as per existing implementation.

        // We need to construct a gradient or just a rect.
        // The renderer will draw this overlay ON TOP of the clip.

        // If we want to wipe the CLIP itself (masking), that's different.
        // The existing code did: overlayColor = { style: ..., opacity: ... }
        // But it didn't do a geometric wipe, it just faded the overlay?
        // Wait, looking at renderer.ts:
        // case 'wipe': overlayColor = { style: ..., opacity: isExit ? p : (1 - p) };
        // That was just a FADE to color, misnamed as wipe? Or did I miss something?
        // Ah, `getFillStyle` might have been doing something?
        // No, `getFillStyle` just returns a color string or gradient.

        // Let's implement a REAL wipe (geometric).
        // Since we can't easily mask the clip in the current "apply" return type without changing renderer significantly,
        // we will use the `overlayColor` to draw a "curtain" over the clip.

        // But `TransitionResult` has `overlayColor`.
        // If we want a geometric wipe, we might need to change `TransitionResult` to allow returning a "drawOverlay" function?
        // Or just return the geometry of the overlay.

        // Let's stick to the plan's `TransitionResult` for now.
        // If we want a geometric wipe, we can return a CanvasPattern or Gradient that is transparent in some parts?
        // That's complex.

        // Alternative: The renderer passes `ctx`. We can draw directly on `ctx` in `apply`?
        // The plan said `apply: (context) => TransitionResult`.
        // It didn't say `apply` should draw.
        // But `TransitionContext` has `ctx`.

        // If `apply` draws, it might draw on top of the clip (if called after clip draw) or affect global state.
        // The renderer calls `apply` BEFORE drawing the clip to get transform params (opacity, scale, etc).
        // AND it might use `overlayColor` to draw AFTER the clip.

        // Let's strictly follow the interface.
        // If we want a geometric wipe, we can't do it easily with just `overlayColor` unless it's a gradient with hard stops.

        // Let's try a hard-stop gradient for the wipe!
        const gradient = ctx.createLinearGradient(0, 0, direction === 'left' || direction === 'right' ? width : 0, direction === 'up' || direction === 'down' ? height : 0);

        // P is 0 to 1.
        // If wiping IN (enter), we want to reveal the image. So the "color" curtain recedes.
        // If wiping OUT (exit), we want to hide the image. So the "color" curtain advances.

        // Let's assume "Wipe" here means "Wipe ON/OFF with a color".

        const stop = isExit ? progress : (1 - progress);

        if (direction === 'right') {
            // Left to Right
            gradient.addColorStop(stop, color);
            gradient.addColorStop(stop, 'transparent');
        } else if (direction === 'left') {
            // Right to Left
            gradient.addColorStop(1 - stop, 'transparent');
            gradient.addColorStop(1 - stop, color);
        } else if (direction === 'down') {
            gradient.addColorStop(stop, color);
            gradient.addColorStop(stop, 'transparent');
        } else {
            gradient.addColorStop(1 - stop, 'transparent');
            gradient.addColorStop(1 - stop, color);
        }

        return {
            overlayColor: { style: gradient, opacity: 1 }
        };
    }
};
