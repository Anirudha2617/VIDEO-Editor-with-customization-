import { Transition, TransitionContext, TransitionResult } from '../../models';

export const slideWithSourcesTransition: Transition = {
    id: 'slide-with-sources',
    name: 'Slide (Multi-Screen)',
    description: 'Slides with access to multiple screens/clips.',
    variables: [
        {
            name: 'Direction',
            key: 'direction',
            type: 'select',
            options: ['left', 'right', 'up', 'down'],
            defaultValue: 'left'
        },
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
    apply: (context: TransitionContext): TransitionResult => {
        const { width, height, progress, params, sources } = context;
        const direction = params.direction || 'left';

        // Get the source canvases
        const screen1 = sources?.['screen1'];
        const screen2 = sources?.['screen2'];

        return {
            customDraw: (ctx, w, h) => {
                // Example: Draw screen1 sliding in, screen2 sliding out
                const p = progress; // 0 to 1

                ctx.save();

                // Calculate slide offsets based on direction
                let offset1 = 0;
                let offset2 = 0;

                if (direction === 'left') {
                    offset1 = (1 - p) * w; // Screen1 slides in from right
                    offset2 = -p * w;      // Screen2 slides out to left
                } else if (direction === 'right') {
                    offset1 = -(1 - p) * w; // Screen1 slides in from left
                    offset2 = p * w;        // Screen2 slides out to right
                } else if (direction === 'up') {
                    // Similar for vertical
                }

                // Draw screen2 (background, sliding out)
                if (screen2) {
                    ctx.save();
                    if (direction === 'left' || direction === 'right') {
                        ctx.translate(offset2, 0);
                    } else {
                        ctx.translate(0, offset2);
                    }
                    ctx.drawImage(screen2, 0, 0, w, h);
                    ctx.restore();
                }

                // Draw screen1 (foreground, sliding in)
                if (screen1) {
                    ctx.save();
                    if (direction === 'left' || direction === 'right') {
                        ctx.translate(offset1, 0);
                    } else {
                        ctx.translate(0, offset1);
                    }
                    ctx.drawImage(screen1, 0, 0, w, h);
                    ctx.restore();
                }

                ctx.restore();
            }
        };
    }
};
