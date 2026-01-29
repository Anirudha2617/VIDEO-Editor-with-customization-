
export type LibraryItemType = 'media' | 'text' | 'effect' | 'transition' | 'animation';

export interface LibraryItem {
    id: string;
    type: LibraryItemType;
    name: string;
    description?: string;
    thumbnail?: string; // Icon or Image URL

    // For Presets (Text/Effect/Transition)
    data?: any; // The payload to create the clip (e.g. { fontSize: 60, text: "Title" })

    // For System vs User
    source: 'system' | 'user' | 'code';
}
