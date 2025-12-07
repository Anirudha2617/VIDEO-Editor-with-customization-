import { useEffect, useRef, useState } from 'react';
import { autosaveProject, ProjectState } from '../services/projectService';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export const useAutosave = (
    state: Partial<ProjectState>,
    enabled: boolean = true,
    debounceMs: number = 2000
) => {
    const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
    const [lastSaved, setLastSaved] = useState<number | null>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const previousStateRef = useRef<string>('');

    useEffect(() => {
        if (!enabled) return;

        // Serialize current state for comparison
        const currentState = JSON.stringify(state);

        // Skip if state hasn't changed
        if (currentState === previousStateRef.current) {
            return;
        }

        // Clear existing timeout
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        // Set status to saving (will trigger after debounce)
        setSaveStatus('saving');

        // Debounce the save operation
        timeoutRef.current = setTimeout(() => {
            try {
                autosaveProject(state);
                setSaveStatus('saved');
                setLastSaved(Date.now());
                previousStateRef.current = currentState;

                // Reset to idle after 2 seconds
                setTimeout(() => {
                    setSaveStatus('idle');
                }, 2000);
            } catch (error) {
                console.error('[useAutosave] Autosave failed:', error);
                setSaveStatus('error');
            }
        }, debounceMs);

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [state, enabled, debounceMs]);

    const manualSave = () => {
        try {
            setSaveStatus('saving');
            autosaveProject(state);
            setSaveStatus('saved');
            setLastSaved(Date.now());
            previousStateRef.current = JSON.stringify(state);

            setTimeout(() => {
                setSaveStatus('idle');
            }, 2000);
        } catch (error) {
            console.error('[useAutosave] Manual save failed:', error);
            setSaveStatus('error');
        }
    };

    return {
        saveStatus,
        lastSaved,
        manualSave
    };
};
