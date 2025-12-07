import { Transition, TransitionContext, TransitionResult } from '../types';

export const customTransition: Transition = {
    id: 'custom',
    name: 'Custom Code',
    description: 'Write your own transition logic using JavaScript.',
    variables: [
        {
            name: 'Code',
            key: 'code',
            type: 'code',
            options: [],
            defaultValue: `// Available variables: progress (0-1), isExit, width, height, ctx, params
// params contains: intensity, baseScale, overlayColor, enableBlur, direction

const intensity = params.intensity || 1.0;
const baseScale = params.baseScale || 0.5;
const color = params.overlayColor || '#000000';
const blur = params.enableBlur ? \`blur(\${intensity * 10 * progress}px)\` : 'none';

// Return object with: opacity, offsetX, offsetY, scale, rotation, overlayColor, customDraw

if (isExit) {
    return { 
        opacity: 1 - progress, 
        scale: 1 - (progress * intensity * 0.5),
        overlayColor: { style: color, opacity: progress * 0.5 }
    };
} else {
    return { 
        opacity: progress, 
        scale: baseScale + (progress * (1 - baseScale)),
        overlayColor: { style: color, opacity: (1 - progress) * 0.5 }
    };
}`
        },
        {
            name: 'Intensity',
            key: 'intensity',
            type: 'number',
            defaultValue: 1.0,
            min: 0,
            max: 5,
            step: 0.1
        },
        {
            name: 'Base Scale',
            key: 'baseScale',
            type: 'number',
            defaultValue: 0.5,
            min: 0,
            max: 2,
            step: 0.1
        },
        {
            name: 'Overlay Color',
            key: 'overlayColor',
            type: 'color',
            defaultValue: '#000000'
        },
        {
            name: 'Enable Blur',
            key: 'enableBlur',
            type: 'boolean',
            defaultValue: false
        },
        {
            name: 'Direction',
            key: 'direction',
            type: 'select',
            defaultValue: 'Left',
            options: ['Left', 'Right', 'Up', 'Down']
        }
    ],
    apply: (context: TransitionContext): TransitionResult => {
        const { ctx, width, height, progress, isExit, params } = context;
        const code = params.code || params.Code; // Try both cases

        if (!code || typeof code !== 'string') {
            console.warn("Custom transition: No code provided");
            return { opacity: 1 };
        }

        try {
            // Create a function from the code
            // We pass safe variables including params
            const func = new Function('ctx', 'width', 'height', 'progress', 'isExit', 'params', code);

            const result = func(ctx, width, height, progress, isExit, params);

            // Validate result structure
            if (result && typeof result === 'object') {
                return result as TransitionResult;
            } else {
                console.warn("Custom transition returned invalid result:", result);
                return { opacity: 1 };
            }
        } catch (e) {
            console.error("Error executing custom transition:", e);
            return { opacity: 1 };
        }
    }
};
