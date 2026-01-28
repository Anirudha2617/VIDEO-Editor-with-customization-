import { EffectDefinition, EffectContext, EffectResult } from '../../models';

export const customEffect: EffectDefinition = {
    id: 'custom',
    name: 'Custom Code',
    description: 'Write your own filter logic.',
    variables: [
        {
            name: 'Code',
            key: 'code',
            type: 'select',
            options: [],
            defaultValue: `// Return a CSS filter string
// Available: params
return { filter: 'hue-rotate(90deg) invert(100%)' };`
        }
    ],
    apply: (context: EffectContext): EffectResult => {
        const { params } = context;
        const code = params.code;

        if (!code) return {};

        try {
            const func = new Function('params', code);
            const result = func(params);
            if (typeof result === 'object') return result;
        } catch (e) {
            console.error("Error executing custom effect:", e);
        }

        return {};
    }
};
