import { Transition, TransitionContext, TransitionResult } from '../../models';

export const zoomTransition: Transition = {
    id: 'zoom',
    name: 'Zoom',
    description: 'Zooms the clip in or out.',
    variables: [
        {
            name: 'Mode',
            key: 'mode',
            type: 'select',
            options: ['in', 'out'],
            defaultValue: 'in'
        },
        {
            name: 'Intensity',
            key: 'intensity',
            type: 'number',
            defaultValue: 1,
            min: 0.1,
            max: 5,
            step: 0.1
        }
    ],
    apply: (context: TransitionContext): TransitionResult => {
        const { progress, isExit, params } = context;
        const mode = params.mode || 'in';
        const intensity = params.intensity || 1;

        let scale = 1;
        const p = progress;

        // Zoom In:
        // Enter: 0 -> 1 (or small -> 1)
        // Exit: 1 -> large

        // Zoom Out:
        // Enter: large -> 1
        // Exit: 1 -> 0 (or small)

        if (mode === 'in') {
            if (isExit) {
                // Zooming IN on exit means getting bigger and fading out?
                // Or just getting bigger.
                scale = 1 + (p * intensity);
            } else {
                // Zooming IN on enter means starting small and growing to 1.
                scale = (1 - intensity) + (p * intensity); // if intensity 1, starts at 0.
                if (scale < 0) scale = 0;
            }
        } else {
            // Zoom Out
            if (isExit) {
                // Zooming OUT on exit means getting smaller.
                scale = 1 - (p * intensity);
                if (scale < 0) scale = 0;
            } else {
                // Zooming OUT on enter means starting big and shrinking to 1.
                scale = 1 + ((1 - p) * intensity);
            }
        }

        // Ensure we don't return negative scale if intensity is high
        if (scale < 0) scale = 0;

        return {
            scale
        };
    }
};
