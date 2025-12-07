import { Transition, TransitionContext, TransitionResult } from '../types';

export const wipeMultiTransition: Transition = {
    id: 'wipe-multi',
    name: 'Wipe (Multi-Screen)',
    description: 'Wipes from one screen to another.',
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
        const screen1 = sources?.['screen1'];
        const screen2 = sources?.['screen2'];

        return {
            customDraw: (ctx, w, h) => {
                ctx.save();

                // Draw screen2 (background)
                if (screen2) {
                    ctx.drawImage(screen2, 0, 0, w, h);
                }

                // Calculate wipe position
                let clipX = 0, clipY = 0, clipW = w, clipH = h;

                if (direction === 'left') {
                    clipW = w * progress;
                } else if (direction === 'right') {
                    clipX = w * (1 - progress);
                    clipW = w * progress;
                } else if (direction === 'up') {
                    clipH = h * progress;
                } else if (direction === 'down') {
                    clipY = h * (1 - progress);
                    clipH = h * progress;
                }

                // Clip and draw screen1 (foreground)
                if (screen1) {
                    ctx.save();
                    ctx.beginPath();
                    ctx.rect(clipX, clipY, clipW, clipH);
                    ctx.clip();
                    ctx.drawImage(screen1, 0, 0, w, h);
                    ctx.restore();
                }

                ctx.restore();
            }
        };
    }
};
