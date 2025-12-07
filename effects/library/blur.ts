import { EffectDefinition, EffectContext, EffectResult } from '../types';

export const blurEffect: EffectDefinition = {
    id: 'blur',
    name: 'Blur',
    description: 'Applies a Gaussian blur to the clip.',
    variables: [
        {
            name: 'Intensity (px)',
            key: 'intensity',
            type: 'number',
            defaultValue: 4,
            min: 0,
            max: 20,
            step: 1
        }
    ],
    apply: (context: EffectContext): EffectResult => {
        const { params } = context;
        const intensity = params.intensity !== undefined ? params.intensity : 4;

        return {
            filter: `blur(${intensity}px)`
        };
    }
};
