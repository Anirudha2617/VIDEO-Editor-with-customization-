import { Transition, TransitionContext, TransitionResult } from '../types';

export const slideTransition: Transition = {
    id: 'slide',
    name: 'Slide',
    description: 'Slides the clip in or out.',
    variables: [
        {
            name: 'Direction',
            key: 'direction',
            type: 'select',
            options: ['left', 'right', 'up', 'down'],
            defaultValue: 'left'
        }
    ],
    apply: (context: TransitionContext): TransitionResult => {
        const { width, height, progress, isExit, params } = context;
        const direction = params.direction || 'left';

        let offsetX = 0;
        let offsetY = 0;

        // p goes 0 -> 1 over time.
        // Enter: starts off-screen, moves to 0.
        // Exit: starts at 0, moves off-screen.

        const p = progress; // 0 to 1

        if (direction === 'left') {
            // Slide Left
            // Enter: From Right (width) to 0.
            // Exit: From 0 to Left (-width).
            if (isExit) offsetX = -p * width;
            else offsetX = (1 - p) * width;
        } else if (direction === 'right') {
            // Slide Right
            // Enter: From Left (-width) to 0.
            // Exit: From 0 to Right (width).
            if (isExit) offsetX = p * width;
            else offsetX = -(1 - p) * width;
        } else if (direction === 'up') {
            // Slide Up
            // Enter: From Bottom (height) to 0.
            // Exit: From 0 to Top (-height).
            if (isExit) offsetY = -p * height;
            else offsetY = (1 - p) * height;
        } else if (direction === 'down') {
            // Slide Down
            // Enter: From Top (-height) to 0.
            // Exit: From 0 to Bottom (height).
            if (isExit) offsetY = p * height;
            else offsetY = -(1 - p) * height;
        }

        return {
            offsetX,
            offsetY
        };
    }
};
