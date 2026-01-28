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

export interface BaseAsset {
    id: string;
    type: MediaType;
    src: string;
    name: string;
}

export interface VideoAsset extends BaseAsset {
    type: MediaType.VIDEO;
    duration: number;
    width: number;
    height: number;
    thumbnail?: string;
    // Code source metadata (for code-generated videos)
    codeSource?: CodeAssetMetadata;
}

export interface AudioAsset extends BaseAsset {
    type: MediaType.AUDIO;
    duration: number;
    waveform?: string;
}

export interface ImageAsset extends BaseAsset {
    type: MediaType.IMAGE;
    width: number;
    height: number;
    codeSource?: CodeAssetMetadata;
}

export interface TextAsset extends BaseAsset {
    type: MediaType.TEXT;
    textProps?: {
        text: string;
        fontSize: number;
        fontColor: string;
        fontFamily: string;
        isBold: boolean;
        backgroundColor?: string;
        borderRadius?: number;
        padding?: number;
    };
}

// Other types (Effect, Transition, Animation, Shape) can remain simple for now or extend BaseAsset
export interface GenericAsset extends BaseAsset {
    type: MediaType.EFFECT | MediaType.TRANSITION | MediaType.ANIMATION | MediaType.SHAPE;
    subtype?: 'transition' | 'animation' | 'filter';
    // Optional legacy fields to avoid breaking everything immediately if accessed loosely
    duration?: number;
    width?: number;
    height?: number;
    codeSource?: CodeAssetMetadata;
}

export interface CodeAssetMetadata {
    html: string;
    css: string;
    js: string;
    width: number;
    height: number;
    duration?: number;
    fps?: number;
    isCodeAsset: true;
}

export type Asset = VideoAsset | AudioAsset | ImageAsset | TextAsset | GenericAsset;
