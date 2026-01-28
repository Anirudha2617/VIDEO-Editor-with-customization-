import { Clip } from '../../models';

export function getTransformTargets(
    clip: Clip,
    clips: Clip[],
    selectedIds: string[]
): Clip[] {
    if (clip.groupId) {
        return clips.filter(c => c.groupId === clip.groupId);
    }

    if (selectedIds.includes(clip.id) && selectedIds.length > 1) {
        return clips.filter(c => selectedIds.includes(c.id));
    }

    return [clip];
}

export function getSelectionBounds(clips: Clip[]) {
    if (clips.length === 0) return { minStart: 0, maxEnd: 0 };
    const minStart = Math.min(...clips.map(c => c.start));
    const maxEnd = Math.max(...clips.map(c => c.start + c.duration));
    return { minStart, maxEnd };
}
