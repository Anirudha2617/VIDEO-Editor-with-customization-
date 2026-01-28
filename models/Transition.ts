
export interface TransitionContext {
    ctx: CanvasRenderingContext2D;
    width: number;
    height: number;
    progress: number; // 0 to 1
    isExit: boolean;
    params: Record<string, any>;
    sources?: { [key: string]: HTMLCanvasElement | OffscreenCanvas };
}

export interface TransitionResult {
    opacity?: number;
    offsetX?: number;
    offsetY?: number;
    scale?: number;
    rotation?: number;
    overlayColor?: { style: string | CanvasGradient | CanvasPattern; opacity: number };
    customDraw?: (ctx: CanvasRenderingContext2D, width: number, height: number, snapshot?: HTMLCanvasElement | OffscreenCanvas) => void;
}

export interface TransitionVariable {
    name: string;
    key: string; // key in params
    type: 'number' | 'color' | 'select' | 'boolean' | 'code' | 'source' | 'logo' | 'link';
    defaultValue: any;
    min?: number;
    max?: number;
    step?: number;
    options?: string[]; // For select type
}

export interface Transition {
    id: string;
    name: string;
    description?: string;
    apply: (context: TransitionContext) => TransitionResult;
    variables: TransitionVariable[];
}
