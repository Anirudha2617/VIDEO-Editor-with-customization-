import { Track } from './Track';
import { Clip } from './Clip';
import { Asset } from './Asset';

export interface ExportSettings {
    resolution: '720p' | '1080p' | '4k' | 'custom';
    width?: number;
    height?: number;
    quality: 'high' | 'medium' | 'low';
    filename: string;
    startTime: number;
    endTime: number;
    fps?: number; // Frames per second for export
    format?: 'webm' | 'mp4' | 'json'; // Export format
}

export interface CustomFont {
    name: string;
    src: string; // Data URL or URL
    type: 'ttf' | 'otf' | 'woff';
}

export interface EditorState {
    tracks: Track[];
    clips: Clip[];
    assets: Asset[];
    currentTime: number; // In seconds
    duration: number; // Total timeline duration
    isPlaying: boolean;
    selectedClipId: string | null;
    zoom: number; // Pixels per second
}

export interface Project {
    id: string;
    name: string;
    version: string;
    lastModified: number;
    state: {
        tracks: Track[];
        clips: Clip[];
        assets: Asset[];
        duration: number;
        exportSettings?: ExportSettings;
        canvasWidth?: number;
        canvasHeight?: number;
        customFonts?: CustomFont[];
    };
}
