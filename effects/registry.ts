import { EffectDefinition } from '../models/Effect';
import { blurEffect } from './library/blur.ts';
import { colorEffect } from './library/color.ts';
import { customEffect } from './library/custom.ts';

const effects: Record<string, EffectDefinition> = {
    'blur': blurEffect,
    'color': colorEffect,
    'custom': customEffect,
};

const listeners: Set<() => void> = new Set();

export const subscribeToRegistry = (callback: () => void) => {
    listeners.add(callback);
    return () => listeners.delete(callback);
};

const notifyListeners = () => {
    listeners.forEach(cb => cb());
};

export const getEffect = (id: string): EffectDefinition | undefined => {
    return effects[id];
};

export const getAllEffects = (): EffectDefinition[] => {
    return Object.values(effects);
};

export const registerEffect = (effect: EffectDefinition) => {
    if (!effect.id || !effect.name) {
        console.error("Cannot register effect without id or name");
        return;
    }
    effects[effect.id] = effect;
    notifyListeners();
    console.log(`[Registry] Registered effect: ${effect.name} (${effect.id})`);
};
