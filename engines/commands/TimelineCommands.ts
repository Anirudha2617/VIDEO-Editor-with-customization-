import { Command } from './types';
import { Clip, Track } from '../../models';

export interface CommandContext {
    getClips: () => Clip[];
    getTracks: () => Track[];
    setClips: (clips: Clip[] | ((prev: Clip[]) => Clip[])) => void;
    setTracks: (tracks: Track[] | ((prev: Track[]) => Track[])) => void;
}

export class AddClipCommand implements Command {
    description = 'Add Clip';

    constructor(
        private context: CommandContext,
        private clip: Clip
    ) {
        this.description = `Add Clip: ${clip.name}`;
    }

    execute() {
        this.context.setClips(prev => [...prev, this.clip]);
    }

    undo() {
        this.context.setClips(prev => prev.filter(c => c.id !== this.clip.id));
    }
}

export class RemoveClipCommand implements Command {
    description = 'Remove Clip';

    constructor(
        private context: CommandContext,
        private clipId: string
    ) {
        this.description = `Remove Clip: ${clipId}`;
    }

    private removedClip: Clip | null = null;

    execute() {
        const clip = this.context.getClips().find(c => c.id === this.clipId);
        if (clip) {
            this.removedClip = clip;
            this.context.setClips(prev => prev.filter(c => c.id !== this.clipId));
        } else {
            console.warn(`[RemoveClipCommand] Clip ${this.clipId} not found during execute.`);
        }
    }

    undo() {
        if (this.removedClip) {
            this.context.setClips(prev => [...prev, this.removedClip!]);
        }
    }
}

export class MoveClipCommand implements Command {
    description = 'Move Clip';
    private oldStart: number = 0;
    private oldTrackId: string = '';

    constructor(
        private context: CommandContext,
        private clipId: string,
        private newStart: number,
        private newTrackId: string
    ) {
        this.description = `Move Clip ${clipId}`;
    }

    execute() {
        const clip = this.context.getClips().find(c => c.id === this.clipId);
        if (!clip) return;

        this.oldStart = clip.start;
        this.oldTrackId = clip.trackId;

        this.context.setClips(prev => prev.map(c =>
            c.id === this.clipId
                ? { ...c, start: this.newStart, trackId: this.newTrackId }
                : c
        ));
    }

    undo() {
        this.context.setClips(prev => prev.map(c =>
            c.id === this.clipId
                ? { ...c, start: this.oldStart, trackId: this.oldTrackId }
                : c
        ));
    }
}

export class UpdateClipCommand implements Command {
    description = 'Update Clip';
    private oldState: Partial<Clip> = {};

    constructor(
        private context: CommandContext,
        private clipId: string,
        private updates: Partial<Clip>
    ) {
        this.description = `Update Clip ${clipId}`;
    }

    execute() {
        const clip = this.context.getClips().find(c => c.id === this.clipId);
        if (!clip) return;

        this.oldState = {};
        (Object.keys(this.updates) as Array<keyof Clip>).forEach(key => {
            (this.oldState as any)[key] = clip[key];
        });

        this.context.setClips(prev => prev.map(c =>
            c.id === this.clipId ? { ...c, ...this.updates } : c
        ));
    }

    undo() {
        this.context.setClips(prev => prev.map(c =>
            c.id === this.clipId ? { ...c, ...this.oldState } : c
        ));
    }
}

export class GroupClipsCommand implements Command {
    description = 'Group Clips';
    private oldClips: Clip[] = [];
    private groupId: string;

    constructor(
        private context: CommandContext,
        private clipIds: string[]
    ) {
        this.description = `Group ${clipIds.length} Clips`;
        this.groupId = crypto.randomUUID();
    }

    execute() {
        // Store old state for undo
        const allClips = this.context.getClips();
        this.oldClips = allClips.filter(c => this.clipIds.includes(c.id));

        this.context.setClips(prev => prev.map(c =>
            this.clipIds.includes(c.id) ? { ...c, groupId: this.groupId } : c
        ));
    }

    undo() {
        // Restore each clip to its original state (including groupId null or previous group)
        this.context.setClips(prev => prev.map(c => {
            const old = this.oldClips.find(o => o.id === c.id);
            return old ? old : c;
        }));
    }
}

export class UngroupClipsCommand implements Command {
    description = 'Ungroup Clips';
    private oldClips: Clip[] = [];

    constructor(
        private context: CommandContext,
        private clipIds: string[] // IDs of clips to ungroup
    ) {
        this.description = `Ungroup Clips`;
    }

    execute() {
        const allClips = this.context.getClips();
        this.oldClips = allClips.filter(c => this.clipIds.includes(c.id));

        this.context.setClips(prev => prev.map(c =>
            this.clipIds.includes(c.id) ? { ...c, groupId: null } : c // or undefined
        ));
    }

    undo() {
        this.context.setClips(prev => prev.map(c => {
            const old = this.oldClips.find(o => o.id === c.id);
            return old ? old : c;
        }));
    }
}
