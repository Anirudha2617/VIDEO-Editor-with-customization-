

import React, { useRef, useCallback } from 'react';
import { Clip, Track } from '../types';

export const useEditorHistory = (
  setClips: React.Dispatch<React.SetStateAction<Clip[]>>,
  setTracks: React.Dispatch<React.SetStateAction<Track[]>>,
  clips: Clip[],
  tracks: Track[]
) => {
  const historyRef = useRef<{ clips: Clip[], tracks: Track[] }[]>([]);
  const historyIndexRef = useRef<number>(-1);

  const addToHistory = useCallback((newClips: Clip[], newTracks: Track[]) => {
    const currentHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
    const newItem = { clips: JSON.parse(JSON.stringify(newClips)), tracks: JSON.parse(JSON.stringify(newTracks)) };

    if (currentHistory.length > 50) currentHistory.shift();

    historyRef.current = [...currentHistory, newItem];
    historyIndexRef.current = historyRef.current.length - 1;
  }, []);

  // Initial history entry
  const initHistory = useCallback(() => {
    if (historyRef.current.length === 0) {
      addToHistory(clips, tracks);
    }
  }, [clips, tracks, addToHistory]);

  const undo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current--;
      const state = historyRef.current[historyIndexRef.current];
      setClips(state.clips);
      setTracks(state.tracks);
      return true;
    }
    return false;
  }, [setClips, setTracks]);

  const redo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current++;
      const state = historyRef.current[historyIndexRef.current];
      setClips(state.clips);
      setTracks(state.tracks);
      return true;
    }
    return false;
  }, [setClips, setTracks]);

  return { addToHistory, undo, redo, historyIndex: historyIndexRef.current, historyLength: historyRef.current.length, initHistory };
};
