export interface Command<T = void> {
    execute(): T | Promise<T>;
    undo(): void | Promise<void>;
    redo?(): void | Promise<void>; // Optional, defaults to execute()

    // Metadata for UI
    description: string;
}
