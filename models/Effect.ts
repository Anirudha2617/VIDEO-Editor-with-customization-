export interface Effect {
    id: string;
    name: string;
    type: 'filter';
    value: string; // CSS filter string (e.g. "blur(4px) sepia(0.5)")
    kind?: string;
    param?: number;

    // New Modular Effect Params
    effectParams?: Record<string, any>;
}
