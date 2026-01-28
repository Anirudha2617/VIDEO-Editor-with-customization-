import { Transition } from '../models';
import { fadeTransition } from './library/fade';
import { wipeTransition } from './library/wipe';
import { slideTransition } from './library/slide';
import { zoomTransition } from './library/zoom';
import { customTransition } from './library/custom';
import { slideWithSourcesTransition } from './library/slide-with-sources';
import { fadeMultiTransition } from './library/fade-multi';
import { wipeMultiTransition } from './library/wipe-multi';
import { zoomMultiTransition } from './library/zoom-multi';
import { breakingGlassTransition } from './library/breaking-glass';
import { rotateTransition } from './library/rotate';

// Mutable registry - only base transitions from library files
const transitions: Record<string, Transition> = {
    'fade': fadeTransition,
    'wipe': wipeTransition,
    'slide': slideTransition,
    'zoom': zoomTransition,
    'custom': customTransition,
    'slide-with-sources': slideWithSourcesTransition,
    'fade-multi': fadeMultiTransition,
    'wipe-multi': wipeMultiTransition,
    'zoom-multi': zoomMultiTransition,
    'breaking-glass': breakingGlassTransition,
    'rotate': rotateTransition
};

// Listeners for UI updates
const listeners: Set<() => void> = new Set();

export const subscribeToRegistry = (callback: () => void) => {
    listeners.add(callback);
    return () => listeners.delete(callback);
};

const notifyListeners = () => {
    listeners.forEach(cb => cb());
};

export const getTransition = (id: string): Transition | undefined => {
    const t = transitions[id];
    return t;
};

export const getAllTransitions = (): Transition[] => {
    return Object.values(transitions);
};

export const registerTransition = (transition: Transition) => {
    if (!transition.id || !transition.name) {
        console.error("Cannot register transition without id or name");
        return;
    }
    transitions[transition.id] = transition;
    notifyListeners();
    console.log(`[Registry] Registered transition: ${transition.name} (${transition.id})`);
};

export const registerDefaultTransitions = () => {
    // Already registered in the initial object
};

export const validateTransitionCode = (code: string): { valid: boolean; error?: string } => {
    try {
        // Basic syntax check using Function constructor
        new Function('ctx', 'width', 'height', 'progress', 'isExit', code);
        return { valid: true };
    } catch (e: any) {
        return { valid: false, error: e.message };
    }
};
