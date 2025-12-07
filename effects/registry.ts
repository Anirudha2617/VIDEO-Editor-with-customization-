import { EffectDefinition } from './types.ts';
import { blurEffect } from './library/blur.ts';
import { colorEffect } from './library/color.ts';
import { customEffect } from './library/custom.ts';

const effects: Record<string, EffectDefinition> = {
    'blur': blurEffect,
    'color': colorEffect,
    'custom': customEffect,
};

export const getEffect = (id: string): EffectDefinition | undefined => {
    return effects[id];
};

export const getAllEffects = (): EffectDefinition[] => {
    return Object.values(effects);
};
