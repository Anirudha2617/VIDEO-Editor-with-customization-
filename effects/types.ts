
export interface EffectContext {
    ctx: CanvasRenderingContext2D;
    width: number;
    height: number;
    params: Record<string, any>;
}

export interface EffectResult {
    filter?: string; // CSS filter string
    customDraw?: (ctx: CanvasRenderingContext2D, width: number, height: number) => void;
}

export interface EffectVariable {
    name: string;
    key: string;
    type: 'number' | 'color' | 'select' | 'boolean';
    defaultValue: any;
    min?: number;
    max?: number;
    step?: number;
    options?: string[];
}

export interface EffectDefinition {
    id: string;
    name: string;
    description?: string;
    apply: (context: EffectContext) => EffectResult;
    variables: EffectVariable[];
}
