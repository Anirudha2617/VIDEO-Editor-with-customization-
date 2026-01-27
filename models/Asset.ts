export enum MediaType {
    VIDEO = 'video',
    IMAGE = 'image',
    AUDIO = 'audio',
    TEXT = 'text',
    EFFECT = 'effect',
    TRANSITION = 'transition',
    ANIMATION = 'animation',
    SHAPE = 'shape',
}

export interface Asset {
    id: string;
    type: MediaType;
    subtype?: 'transition' | 'animation' | 'filter';
    src: string;
    name: string;
    thumbnail?: string; // For videos

    // Code source metadata (for code-generated assets)
    codeSource?: {
        html: string;
        css: string;
        js: string;
        width: number;
        height: number;
        duration?: number; // for video assets
        fps?: number; // for video assets
        isCodeAsset: true;
    };
}
