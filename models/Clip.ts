import { MediaType } from './Asset';
import { Effect } from './Effect';

export type AnimationType = 'none' | 'fade' | 'wipe' | 'slide-left' | 'slide-right' | 'slide-up' | 'slide-down' | 'zoom-in' | 'zoom-out' | 'custom';

export type EasingType = 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';

export interface Clip {
    id: string;
    groupId?: string | null;
    assetId: string;
    trackId: string;
    start: number; // Start time on the timeline (seconds)
    duration: number; // Duration of the clip (seconds)
    offset: number; // Start time within the source asset (seconds)
    name: string;
    type: MediaType;
    src: string;

    // Visual properties
    x?: number;
    y?: number;
    width?: number; // Base width of the asset
    height?: number; // Base height of the asset
    scale?: number;
    rotation?: number;
    opacity?: number;

    // Text specific properties
    text?: string;
    fontSize?: number;
    fontColor?: string;
    fontFamily?: string; // New Font Property
    isBold?: boolean;
    isItalic?: boolean;
    isUnderline?: boolean;
    isSuperscript?: boolean;
    isSubscript?: boolean;
    backgroundColor?: string;
    borderRadius?: number;
    padding?: number;

    // Shape specific properties
    shapeType?: 'rectangle' | 'circle' | 'arrow' | 'star';
    fillColor?: string;
    strokeColor?: string;
    strokeWidth?: number;
    maskMode?: boolean; // If true, shape acts as a mask for underlying content

    // Audio properties
    waveform?: string; // Data URL of waveform image (cached)
    audioData?: {
        volume: number; // 0-2 (0-200%, default 1)
        fadeIn: number; // Fade in duration in seconds
        fadeOut: number; // Fade out duration in seconds
        muted: boolean; // Mute this clip
    };

    // Effects & Transitions
    effects: Effect[];
    animationIn?: AnimationType;
    animationOut?: AnimationType;
    animationDuration: number; // Duration of entry/exit transition
    transitionColor?: string;

    // Audio/Video Split
    hasAudio?: boolean; // false when audio is detached from video
    linkedClipId?: string; // ID of linked audio/video clip after detachment

    // Extra properties for animations and effects editing
    animationType?: AnimationType;
    easing?: EasingType;

    animationInDuration?: number;
    animationInEasing?: EasingType;

    animationOutDuration?: number;
    animationOutEasing?: EasingType;

    // New Modular Transition Params
    transitionParams?: Record<string, any>; // Legacy/Shared
    transitionInParams?: Record<string, any>;
    transitionOutParams?: Record<string, any>;

    // Custom CSS effects from code assets
    customCSS?: {
        textShadow?: string;
        transform?: string;
        filter?: string;
        letterSpacing?: string;
        lineHeight?: string;
        textTransform?: string;
    };
}
