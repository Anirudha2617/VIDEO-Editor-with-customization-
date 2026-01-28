import { Clip, Track, Asset, Project, MediaType, Effect, Transition } from '../models';

export interface ProjectState {
    version: string;
    projectName: string;
    lastSaved: number;
    assets: Asset[];
    clips: Clip[];
    customTransitions: Array<{
        id: string;
        name: string;
        code: string;
        variables: any[];
    }>;
    customEffects: Effect[];
    scripts: Array<{ id: string; content: string }>;
    settings: {
        duration: number;
        fps: number;
        resolution: { width: number; height: number };
    };
}

const PROJECT_STORAGE_KEY = 'lumina_project';
const AUTOSAVE_STORAGE_KEY = 'lumina_autosave';

export const saveProject = (state: Partial<ProjectState>, projectName?: string): void => {
    const projectState: ProjectState = {
        version: '1.0.0',
        projectName: projectName || state.projectName || 'Untitled Project',
        lastSaved: Date.now(),
        assets: state.assets || [],
        clips: state.clips || [],
        customTransitions: state.customTransitions || [],
        customEffects: state.customEffects || [],
        scripts: state.scripts || [],
        settings: state.settings || {
            duration: 60,
            fps: 30,
            resolution: { width: 1920, height: 1080 }
        }
    };

    try {
        localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(projectState));
        console.log('[ProjectService] Project saved:', projectState.projectName);
    } catch (error) {
        console.error('[ProjectService] Failed to save project:', error);
        throw new Error('Failed to save project. Storage may be full.');
    }
};

export const loadProject = (): ProjectState | null => {
    try {
        const saved = localStorage.getItem(PROJECT_STORAGE_KEY);
        if (!saved) return null;

        const projectState: ProjectState = JSON.parse(saved);
        console.log('[ProjectService] Project loaded:', projectState.projectName);
        return projectState;
    } catch (error) {
        console.error('[ProjectService] Failed to load project:', error);
        return null;
    }
};

export const autosaveProject = (state: Partial<ProjectState>): void => {
    const projectState: ProjectState = {
        version: '1.0.0',
        projectName: state.projectName || 'Autosave',
        lastSaved: Date.now(),
        assets: state.assets || [],
        clips: state.clips || [],
        customTransitions: state.customTransitions || [],
        customEffects: state.customEffects || [],
        scripts: state.scripts || [],
        settings: state.settings || {
            duration: 60,
            fps: 30,
            resolution: { width: 1920, height: 1080 }
        }
    };

    try {
        localStorage.setItem(AUTOSAVE_STORAGE_KEY, JSON.stringify(projectState));
        console.log('[ProjectService] Autosaved at', new Date(projectState.lastSaved).toLocaleTimeString());
    } catch (error) {
        console.error('[ProjectService] Autosave failed:', error);
    }
};

export const loadAutosave = (): ProjectState | null => {
    try {
        const saved = localStorage.getItem(AUTOSAVE_STORAGE_KEY);
        if (!saved) return null;

        const projectState: ProjectState = JSON.parse(saved);
        console.log('[ProjectService] Autosave loaded from', new Date(projectState.lastSaved).toLocaleString());
        return projectState;
    } catch (error) {
        console.error('[ProjectService] Failed to load autosave:', error);
        return null;
    }
};

export const clearAutosave = (): void => {
    localStorage.removeItem(AUTOSAVE_STORAGE_KEY);
    console.log('[ProjectService] Autosave cleared');
};

export const exportProject = (state: Partial<ProjectState>): string => {
    const projectState: ProjectState = {
        version: '1.0.0',
        projectName: state.projectName || 'Exported Project',
        lastSaved: Date.now(),
        assets: state.assets || [],
        clips: state.clips || [],
        customTransitions: state.customTransitions || [],
        customEffects: state.customEffects || [],
        scripts: state.scripts || [],
        settings: state.settings || {
            duration: 60,
            fps: 30,
            resolution: { width: 1920, height: 1080 }
        }
    };

    return JSON.stringify(projectState, null, 2);
};

export const importProject = (jsonString: string): ProjectState => {
    try {
        const projectState: ProjectState = JSON.parse(jsonString);

        // Validate required fields
        if (!projectState.version || !projectState.assets || !projectState.clips) {
            throw new Error('Invalid project file format');
        }

        return projectState;
    } catch (error) {
        console.error('[ProjectService] Failed to import project:', error);
        throw new Error('Failed to import project. Invalid file format.');
    }
};
