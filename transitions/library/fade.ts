import { Transition, TransitionContext, TransitionResult } from '../../models';

export const fadeTransition: Transition = {
    id: 'fade',
    name: 'Fade',
    description: 'Smoothly fades the clip in or out.',
    variables: [
        {
            name: 'Color',
            key: 'color',
            type: 'color',
            defaultValue: '#000000'
        }
    ],
    apply: (context: TransitionContext): TransitionResult => {
        const { progress, isExit, params } = context;
        const color = params.color || '#000000';

        // If it's an exit, we fade OUT (opacity goes 1 -> 0)
        // If it's an enter, we fade IN (opacity goes 0 -> 1)
        // However, the renderer usually handles opacity for the clip itself.
        // For a "Fade to Color" transition, we might want to overlay a color.

        // Standard Fade:
        const opacity = isExit ? (1 - progress) : progress;

        return {
            opacity
        };
    }
};
