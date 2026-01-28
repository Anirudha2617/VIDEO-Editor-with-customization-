import { EffectDefinition, EffectContext, EffectResult } from '../../models';

export const colorEffect: EffectDefinition = {
    id: 'color',
    name: 'Color Adjust',
    description: 'Adjust brightness, contrast, and saturation.',
    variables: [
        {
            name: 'Brightness (%)',
            key: 'brightness',
            type: 'number',
            defaultValue: 100,
            min: 0,
            max: 200,
            step: 5
        },
        {
            name: 'Contrast (%)',
            key: 'contrast',
            type: 'number',
            defaultValue: 100,
            min: 0,
            max: 200,
            step: 5
        },
        {
            name: 'Saturation (%)',
            key: 'saturate',
            type: 'number',
            defaultValue: 100,
            min: 0,
            max: 200,
            step: 5
        },
        {
            name: 'Sepia (%)',
            key: 'sepia',
            type: 'number',
            defaultValue: 0,
            min: 0,
            max: 100,
            step: 5
        }
    ],
    apply: (context: EffectContext): EffectResult => {
        const { params } = context;
        const brightness = params.brightness !== undefined ? params.brightness : 100;
        const contrast = params.contrast !== undefined ? params.contrast : 100;
        const saturate = params.saturate !== undefined ? params.saturate : 100;
        const sepia = params.sepia !== undefined ? params.sepia : 0;

        return {
            filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturate}%) sepia(${sepia}%)`
        };
    }
};
