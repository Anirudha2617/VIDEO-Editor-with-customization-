import { Transition, TransitionContext, TransitionResult } from '../types';

export const rotateTransition: Transition = {
    id: 'rotate',
    name: 'Rotate',
    description: 'Rotates the clip by a specified angle',
    variables: [
        {
            name: 'Degrees',
            key: 'degrees',
            type: 'number',
            defaultValue: 360,
            min: 0,
            max: 720,
            step: 15
        },
        {
            name: 'Direction',
            key: 'direction',
            type: 'select',
            options: ['clockwise', 'counterclockwise'],
            defaultValue: 'clockwise'
        }
    ],
    apply: (context: TransitionContext): TransitionResult => {
        const { progress, params } = context;
        const degrees = params.degrees || 360;
        const direction = params.direction || 'clockwise';

        // Calculate rotation based on progress and direction
        const angle = direction === 'clockwise'
            ? progress * degrees
            : -(progress * degrees);

        return {
            rotation: angle
        };
    }
};
