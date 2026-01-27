import { useState, useEffect } from 'react';
import { CommandManager } from './CommandManager';

export const useCommandManager = (manager: CommandManager) => {
    const [historyInfo, setHistoryInfo] = useState(manager.getHistoryInfo());
    const [canUndo, setCanUndo] = useState(manager.canUndo());
    const [canRedo, setCanRedo] = useState(manager.canRedo());

    useEffect(() => {
        // Initial sync
        setHistoryInfo(manager.getHistoryInfo());
        setCanUndo(manager.canUndo());
        setCanRedo(manager.canRedo());

        // Subscribe
        const unsubscribe = manager.subscribe(() => {
            setHistoryInfo(manager.getHistoryInfo());
            setCanUndo(manager.canUndo());
            setCanRedo(manager.canRedo());
        });

        return unsubscribe;
    }, [manager]);

    return {
        undo: () => manager.undo(),
        redo: () => manager.redo(),
        canUndo,
        canRedo,
        historyInfo
    };
};
