import { Clip, Track, MediaType, Effect, AnimationType } from '../models';
import { CommandManager } from '../engines/commands/CommandManager';
import { AddClipCommand, MoveClipCommand, RemoveClipCommand, UpdateClipCommand, CommandContext } from '../engines/commands/TimelineCommands';

/**
 * Interface definition for Timeline Pipeline.
 */
export interface TimelinePipeline {
    addClip: (clip: Clip) => void;
    removeClip: (id: string) => void;
    updateClip: (id: string, updates: Partial<Clip>) => void;
    moveClip: (id: string, newStart: number, newTrackId: string) => void;
    addTrack: () => void;
    removeTrack: (id: string) => void;
    // Helper to create specific clips
    createEffectClip: (effect: Effect, trackId: string, time: number) => Clip;
}

/**
 * Factory to create Timeline Pipeline
 */
export const createTimelinePipeline = (
    commandManager: CommandManager,
    context: CommandContext,
    setTracks: (updater: (prev: Track[]) => Track[]) => void // Tracks aren't full commands yet, handled via state for now or simple updater
): TimelinePipeline => {

    return {
        addClip: (clip: Clip) => {
            commandManager.execute(new AddClipCommand(context, clip));
        },
        removeClip: (id: string) => {
            commandManager.execute(new RemoveClipCommand(context, id));
        },
        updateClip: (id: string, updates: Partial<Clip>) => {
            commandManager.execute(new UpdateClipCommand(context, id, updates));
        },
        moveClip: (id: string, newStart: number, newTrackId: string) => {
            commandManager.execute(new MoveClipCommand(context, id, newStart, newTrackId));
        },
        addTrack: () => {
            setTracks(prev => [...prev, { id: `t${prev.length + 1}`, type: MediaType.VIDEO, name: `Track ${prev.length + 1}` }]);
        },
        removeTrack: (id: string) => {
            setTracks(prev => prev.filter(t => t.id !== id));
        },
        createEffectClip: (effect: Effect, trackId: string, time: number) => {
            const newClip: Clip = {
                id: crypto.randomUUID(),
                assetId: 'fx_' + effect.id,
                trackId,
                start: time,
                duration: 3,
                offset: 0,
                name: effect.name,
                type: MediaType.EFFECT,
                src: '',
                effects: [effect],
                animationDuration: 0
            };
            return newClip;
        }
    };
};
