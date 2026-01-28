import { Transition, TransitionContext, TransitionResult } from '../../models';

export const fadeMultiTransition: Transition = {
    id: 'fade-multi',
    name: 'Fade (Multi-Screen)',
    description: 'Fades between two screens.',
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
    apply: (context: TransitionContext): TransitionResult => {
        const { progress, sources } = context;
        const screen1 = sources?.['screen1'];
        const screen2 = sources?.['screen2'];

        return {
            customDraw: (ctx, w, h) => {
                ctx.save();

                // Draw screen2 (background) at full opacity
                if (screen2) {
                    ctx.globalAlpha = 1;
                    ctx.drawImage(screen2, 0, 0, w, h);
                }

                // Draw screen1 (foreground) fading in
                if (screen1) {
                    ctx.globalAlpha = progress;
                    ctx.drawImage(screen1, 0, 0, w, h);
                }

                ctx.restore();
            }
        };
    }
};
