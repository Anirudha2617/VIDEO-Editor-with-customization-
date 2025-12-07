/**
 * Audio Mixer Service
 * Handles multi-track audio mixing with Web Audio API
 */

export class AudioMixer {
    private audioContext: AudioContext | null = null;
    private masterGain: GainNode | null = null;
    private tracks: Map<string, GainNode> = new Map();
    private sources: Map<string, AudioBufferSourceNode> = new Map();

    constructor() {
        this.initializeContext();
    }

    private initializeContext() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            this.masterGain = this.audioContext.createGain();
            this.masterGain.connect(this.audioContext.destination);
        }
    }

    /**
     * Add a new audio track
     */
    addTrack(trackId: string, initialVolume: number = 1): GainNode {
        this.initializeContext();

        if (this.tracks.has(trackId)) {
            return this.tracks.get(trackId)!;
        }

        const gainNode = this.audioContext!.createGain();
        gainNode.gain.value = initialVolume;
        gainNode.connect(this.masterGain!);

        this.tracks.set(trackId, gainNode);
        return gainNode;
    }

    /**
     * Remove a track
     */
    removeTrack(trackId: string): void {
        const gainNode = this.tracks.get(trackId);
        if (gainNode) {
            gainNode.disconnect();
            this.tracks.delete(trackId);
        }
    }

    /**
     * Set track volume
     */
    setTrackVolume(trackId: string, volume: number): void {
        const gainNode = this.tracks.get(trackId);
        if (gainNode) {
            gainNode.gain.value = Math.max(0, Math.min(2, volume));
        }
    }

    /**
     * Set master volume
     */
    setMasterVolume(volume: number): void {
        if (this.masterGain) {
            this.masterGain.gain.value = Math.max(0, Math.min(2, volume));
        }
    }

    /**
     * Get track gain node
     */
    getTrackGain(trackId: string): GainNode | null {
        return this.tracks.get(trackId) || null;
    }

    /**
     * Mute a track
     */
    muteTrack(trackId: string, muted: boolean): void {
        this.setTrackVolume(trackId, muted ? 0 : 1);
    }

    /**
     * Solo a track (mute all others)
     */
    soloTrack(trackId: string): void {
        this.tracks.forEach((gainNode, id) => {
            gainNode.gain.value = id === trackId ? 1 : 0;
        });
    }

    /**
     * Un-solo all tracks
     */
    unsoloAll(): void {
        this.tracks.forEach((gainNode) => {
            gainNode.gain.value = 1;
        });
    }

    /**
     * Apply fade in effect
     */
    applyFadeIn(gainNode: GainNode, duration: number, targetVolume: number = 1): void {
        if (!this.audioContext) return;

        const currentTime = this.audioContext.currentTime;
        gainNode.gain.setValueAtTime(0, currentTime);
        gainNode.gain.linearRampToValueAtTime(targetVolume, currentTime + duration);
    }

    /**
     * Apply fade out effect
     */
    applyFadeOut(gainNode: GainNode, startTime: number, duration: number): void {
        if (!this.audioContext) return;

        const currentValue = gainNode.gain.value;
        gainNode.gain.setValueAtTime(currentValue, startTime);
        gainNode.gain.linearRampToValueAtTime(0, startTime + duration);
    }

    /**
     * Get current master volume
     */
    getMasterVolume(): number {
        return this.masterGain?.gain.value || 1;
    }

    /**
     * Get audio context
     */
    getContext(): AudioContext | null {
        return this.audioContext;
    }

    /**
     * Cleanup
     */
    dispose(): void {
        this.sources.forEach(source => {
            source.stop();
            source.disconnect();
        });
        this.sources.clear();

        this.tracks.forEach(gainNode => {
            gainNode.disconnect();
        });
        this.tracks.clear();

        if (this.masterGain) {
            this.masterGain.disconnect();
            this.masterGain = null;
        }

        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
    }
}

// Global mixer instance
let globalMixer: AudioMixer | null = null;

export function getGlobalMixer(): AudioMixer {
    if (!globalMixer) {
        globalMixer = new AudioMixer();
    }
    return globalMixer;
}

export function disposeGlobalMixer(): void {
    if (globalMixer) {
        globalMixer.dispose();
        globalMixer = null;
    }
}
