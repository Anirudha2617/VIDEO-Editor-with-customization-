import { MediaType } from './Asset';

export interface Track {
    id: string;
    type: MediaType;
    name: string;
    isMuted?: boolean;
    isHidden?: boolean;
    trackType?: 'video' | 'audio'; // Dedicated track type
    volume?: number; // Track-level volume (0-2, default 1)
    solo?: boolean; // Solo this track
}
