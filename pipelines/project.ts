import { Project, ExportSettings, Clip, Track, Asset } from '../models';

export interface ProjectPipeline {
    saveProject: (filename: string) => void;
    loadProject: (file: File) => Promise<Project>; // Returns loaded project data
    exportVideo: (settings: ExportSettings) => void;
}

export const createProjectPipeline = (
    state: {
        tracks: Track[];
        clips: Clip[];
        assets: Asset[];
        duration: number;
        canvasWidth: number;
        canvasHeight: number;
    },
    actions: {
        setExportStatus: (status: 'idle' | 'exporting' | 'completed' | 'cancelled') => void;
        setExportProgress: (progress: number) => void;
        setIsPlaying: (playing: boolean) => void;
        setCurrentTime: (time: number) => void;
    }
): ProjectPipeline => {

    return {
        saveProject: (filename: string) => {
            const project: Project = {
                id: crypto.randomUUID(),
                name: filename || 'Project',
                version: '1.0.0',
                lastModified: Date.now(),
                state: {
                    tracks: state.tracks,
                    clips: state.clips,
                    assets: state.assets,
                    duration: state.duration,
                    // Default export settings for save
                    exportSettings: { format: 'mp4', quality: 'high', fps: 30, startTime: 0, endTime: state.duration, filename, resolution: '1080p' },
                    canvasWidth: state.canvasWidth,
                    canvasHeight: state.canvasHeight,
                    customFonts: []
                }
            };

            const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${filename || 'project'}.lumina`;
            document.body.appendChild(a);
            a.click();

            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);
        },

        loadProject: async (file: File): Promise<Project> => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const project = JSON.parse(e.target?.result as string) as Project;
                        resolve(project);
                    } catch (err) {
                        reject(err);
                    }
                };
                reader.onerror = reject;
                reader.readAsText(file);
            });
        },

        exportVideo: (settings: ExportSettings) => {
            // Trigger UI state for export
            actions.setExportStatus('exporting');
            actions.setExportProgress(0);
            actions.setCurrentTime(settings.startTime);
            actions.setIsPlaying(true);
        }
    };
};
