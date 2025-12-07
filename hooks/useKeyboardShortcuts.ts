
import { useEffect } from 'react';

interface ShortcutMap {
  undo: () => void;
  redo: () => void;
  copy: () => void;
  paste: () => void;
  delete: () => void;
  split: () => void;
  nudgeLeft: (isShift: boolean, isAlt: boolean) => void;
  nudgeRight: (isShift: boolean, isAlt: boolean) => void;
  togglePlay: () => void;
  seekForward: (amount: number) => void;
  seekBackward: (amount: number) => void;
  deselectAll: () => void;
  focusTimer: () => void;
}

export const useKeyboardShortcuts = (
  isEnabled: boolean,
  shortcuts: ShortcutMap
) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isEnabled) return;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName) || (e.target as HTMLElement).isContentEditable) return;

      const isCtrl = e.ctrlKey || e.metaKey;

      if (isCtrl && e.key === 'z') { e.preventDefault(); shortcuts.undo(); return; }
      if (isCtrl && e.key === 'y') { e.preventDefault(); shortcuts.redo(); return; }
      if (isCtrl && e.key === 'c') { e.preventDefault(); shortcuts.copy(); return; }
      if (isCtrl && e.key === 'v') { e.preventDefault(); shortcuts.paste(); return; }
      if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); shortcuts.delete(); return; }
      if (e.key === 's' || e.key === 'S') { e.preventDefault(); shortcuts.split(); return; }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (e.altKey) {
          shortcuts.nudgeLeft(e.shiftKey, true);
        } else {
          shortcuts.seekBackward(e.shiftKey ? 10 : 2);
        }
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (e.altKey) {
          shortcuts.nudgeRight(e.shiftKey, true);
        } else {
          shortcuts.seekForward(e.shiftKey ? 10 : 2);
        }
      }

      if (e.code === 'Space' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        shortcuts.togglePlay();
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        shortcuts.deselectAll();
      }

      if (e.key === 't' || e.key === 'T') {
        // Only prevent default if we're not typing in an input (handled by early return above)
        e.preventDefault();
        shortcuts.focusTimer();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEnabled, shortcuts]);
};
