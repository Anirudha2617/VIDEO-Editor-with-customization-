
import { Clip, MediaType, Effect, AnimationType } from '../models';
import { LibraryItem, LibraryItemType } from '../models/LibraryItem';
import { getAllTransitions, registerTransition } from '../transitions/registry';
import { getAllEffects, registerEffect } from '../effects/registry';

export interface LibraryPipeline {
    getItems: (type?: LibraryItemType) => LibraryItem[];
    getItemById: (id: string) => LibraryItem | undefined;
    registerItem: (item: LibraryItem) => void;
    unregisterItem: (id: string) => void;
    createClipFromItem: (itemId: string, trackId: string, time: number) => Clip | null;
}

export const createLibraryPipeline = (
    // We might need dependencies here later
): LibraryPipeline => {

    // In-memory store for custom items (Text, etc.)
    // Effects and Transitions are pulled from their registries dynamicallly
    let customItems: LibraryItem[] = [
        {
            id: 'txt_basic', type: 'text', name: 'Basic Title', source: 'system',
            data: { text: 'Title', fontSize: 80, fontColor: '#ffffff' }
        },
        {
            id: 'txt_sub', type: 'text', name: 'Subtitle', source: 'system',
            data: { text: 'Subtitle', fontSize: 40, fontColor: '#cccccc' }
        },
        {
            id: 'txt_credit', type: 'text', name: 'Credits', source: 'system',
            data: { text: 'Credits', fontSize: 30, fontColor: '#aaaaaa' }
        }
    ];


    const getItems = (type?: LibraryItemType): LibraryItem[] => {
        let items: LibraryItem[] = [...customItems];

        if (!type || type === 'transition' || type === 'animation') {
            const transitions = getAllTransitions().map(t => ({
                id: t.id,
                type: 'transition' as LibraryItemType, // or animation
                name: t.name,
                source: 'system' as const,
                data: { duration: 1, easing: 'ease-out' as any }
            }));
            // Filter if specific type requested
            if (type === 'transition') return transitions;
            items = [...items, ...transitions];
        }

        if (!type || type === 'effect') {
            const effects = getAllEffects().map(e => ({
                id: e.id,
                type: 'effect' as LibraryItemType,
                name: e.name,
                source: 'system' as const,
                data: {}
            }));
            if (type === 'effect') return effects;
            items = [...items, ...effects];
        }

        if (type) {
            return items.filter(i => i.type === type);
        }
        return items;
    };

    const getItemById = (id: string): LibraryItem | undefined => {
        return getItems().find(i => i.id === id);
    };

    const registerItem = (item: LibraryItem) => {
        // If it's a code-based transition/effect, we might need to forward to registry
        // But for "Items" (like a text preset), we store here.
        customItems.push(item);
    };

    const unregisterItem = (id: string) => {
        customItems = customItems.filter(i => i.id !== id);
    };

    const createClipFromItem = (itemId: string, trackId: string, time: number): Clip | null => {
        const item = getItemById(itemId);
        if (!item) return null;

        const baseClip: Partial<Clip> = {
            id: crypto.randomUUID(),
            trackId,
            start: time,
            name: item.name,
            offset: 0,
            effects: [],
            animationDuration: 0
        };

        if (item.type === 'text') {
            return {
                ...baseClip,
                type: MediaType.TEXT,
                src: '',
                duration: 5,
                text: item.data?.text || 'Text',
                fontSize: item.data?.fontSize || 60,
                fontColor: item.data?.fontColor || '#ffffff',
                fontFamily: item.data?.fontFamily,
                isBold: item.data?.isBold,
                // Add other styles
            } as Clip;
        }

        if (item.type === 'effect') {
            // For effects, we create an Effect Clip? Or do we append effect to existing clip?
            // The existing UI logic creates an Effect Clip (Overlay).
            return {
                ...baseClip,
                type: MediaType.EFFECT,
                assetId: 'fx_' + item.id,
                duration: 3,
                src: '',
                effects: [{ id: item.id, name: item.name, type: 'filter', value: 'custom', kind: 'registry' }] // simplified
            } as Clip;
        }

        if (item.type === 'transition' || item.type === 'animation') {
            // Animations are overlay clips in this engine? Or properties?
            // Looking at EditorPage handleCreateAnimationClip:
            return {
                ...baseClip,
                type: MediaType.ANIMATION,
                assetId: 'anim_' + item.id,
                duration: item.data?.duration || 1,
                animationType: item.id as AnimationType,
                easing: item.data?.easing
            } as Clip;
        }

        return null;
    };

    return {
        getItems,
        getItemById,
        registerItem,
        unregisterItem,
        createClipFromItem
    };
};
