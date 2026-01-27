import { Command } from './types';

export class BatchCommand implements Command {
    description: string;
    private commands: Command[] = [];

    constructor(description: string, commands: Command[]) {
        this.description = description;
        this.commands = commands;
    }

    async execute() {
        for (const cmd of this.commands) {
            await cmd.execute();
        }
    }

    async undo() {
        // Undo in reverse order
        for (let i = this.commands.length - 1; i >= 0; i--) {
            await this.commands[i].undo();
        }
    }

    async redo() {
        for (const cmd of this.commands) {
            if (cmd.redo) {
                await cmd.redo();
            } else {
                await cmd.execute();
            }
        }
    }
}
