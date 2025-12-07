import { Transition, TransitionContext, TransitionResult } from '../types';

export const zoomMultiTransition: Transition = {
    id: 'zoom-multi',
    name: 'Zoom (Multi-Screen)',
    description: 'Zooms between two screens.',
    variables: [
        {
            name: 'Mode',
            key: 'mode',
            type: 'select',
            options: ['in', 'out'],
            defaultValue: 'in'
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
        const { progress, params, sources } = context;
        const mode = params.mode || 'in';
        const screen1 = sources?.['screen1'];
        const screen2 = sources?.['screen2'];

        return {
            customDraw: (ctx, w, h) => {
                ctx.save();

                // Draw screen2 (background)
                if (screen2) {
                    ctx.drawImage(screen2, 0, 0, w, h);
                }

                // Calculate zoom scale
                let scale = 1;
                if (mode === 'in') {
                    scale = progress; // 0 to 1
                } else {
                    scale = 1 + progress; // 1 to 2
                }

                // Draw screen1 (foreground) with zoom
                if (screen1 && scale > 0) {
                    ctx.save();
                    ctx.globalAlpha = mode === 'in' ? progress : Math.max(0, 1 - progress);

                    const scaledW = w * scale;
                    const scaledH = h * scale;
                    const offsetX = (w - scaledW) / 2;
                    const offsetY = (h - scaledH) / 2;

                    ctx.drawImage(screen1, offsetX, offsetY, scaledW, scaledH);
                    ctx.restore();
                }

                ctx.restore();
            }
        };
    }
};
