import { Command } from './types';

export class CommandManager {
    private undoStack: Command[] = [];
    private redoStack: Command[] = [];
    private maxHistory: number = 50;
    private listeners: (() => void)[] = [];

    constructor(maxHistory: number = 50) {
        this.maxHistory = maxHistory;
    }

    async execute(command: Command) {
        try {
            await command.execute();
            this.undoStack.push(command);
            this.redoStack = []; // Clear redo stack on new action

            if (this.undoStack.length > this.maxHistory) {
                this.undoStack.shift();
            }

            this.notify();
            console.log(`[CommandManager] Executed: ${command.description}`);
        } catch (e) {
            console.error(`[CommandManager] Execution failed for ${command.description}:`, e);
            throw e;
        }
    }

    async undo() {
        const command = this.undoStack.pop();
        if (!command) return;

        try {
            console.log(`[CommandManager] Undoing: ${command.description}`);
            await command.undo();
            this.redoStack.push(command);
            this.notify();
        } catch (e) {
            console.error(`[CommandManager] Undo failed for ${command.description}:`, e);
            // Put it back? Or corrupt state?
            // For now, assume state is possibly corrupt, but we don't crash.
            this.undoStack.push(command); // Try to keep state consistent-ish
        }
    }

    async redo() {
        const command = this.redoStack.pop();
        if (!command) return;

        try {
            console.log(`[CommandManager] Redoing: ${command.description}`);
            if (command.redo) {
                await command.redo();
            } else {
                await command.execute();
            }
            this.undoStack.push(command);
            this.notify();
        } catch (e) {
            console.error(`[CommandManager] Redo failed for ${command.description}:`, e);
            this.redoStack.push(command);
        }
    }

    clear() {
        this.undoStack = [];
        this.redoStack = [];
        this.notify();
    }

    canUndo(): boolean {
        return this.undoStack.length > 0;
    }

    canRedo(): boolean {
        return this.redoStack.length > 0;
    }

    getHistoryInfo() {
        return {
            undoCount: this.undoStack.length,
            redoCount: this.redoStack.length,
            lastAction: this.undoStack[this.undoStack.length - 1]?.description
        };
    }

    subscribe(listener: () => void): () => void {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private notify() {
        this.listeners.forEach(l => l());
    }
}

// Global instance for now, though Context/Hook is better
export const globalCommandManager = new CommandManager();
