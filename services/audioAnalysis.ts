/**
 * Audio Analysis Service
 * Generates waveforms and analyzes audio for visualization
 */

export interface WaveformOptions {
    width: number;
    height: number;
    backgroundColor?: string;
    waveColor?: string;
    centerLineColor?: string;
}

/**
 * Generates a waveform visualization from an audio URL
 * Returns a data URL of the waveform image
 */
export async function generateWaveform(
    audioUrl: string,
    options: WaveformOptions = { width: 1000, height: 100 }
): Promise<string> {
    const {
        width,
        height,
        backgroundColor = 'transparent',
        waveColor = '#3b82f6',
        centerLineColor = '#6b7280'
    } = options;

    try {
        // Fetch audio file
        const response = await fetch(audioUrl);
        const arrayBuffer = await response.arrayBuffer();

        // Create audio context and decode
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        // Get audio channel data
        const channelData = audioBuffer.getChannelData(0); // Use first channel
        const samples = channelData.length;
        const samplesPerPixel = Math.floor(samples / width);

        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;

        // Draw background
        if (backgroundColor !== 'transparent') {
            ctx.fillStyle = backgroundColor;
            ctx.fillRect(0, 0, width, height);
        }

        // Draw center line
        ctx.strokeStyle = centerLineColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();

        // Draw waveform
        ctx.fillStyle = waveColor;
        ctx.strokeStyle = waveColor;
        ctx.lineWidth = 1;

        for (let x = 0; x < width; x++) {
            const start = x * samplesPerPixel;
            const end = start + samplesPerPixel;

            // Get min and max values in this segment
            let min = 1.0;
            let max = -1.0;

            for (let i = start; i < end && i < samples; i++) {
                const sample = channelData[i];
                if (sample < min) min = sample;
                if (sample > max) max = sample;
            }

            // Convert to pixel coordinates
            const yMax = ((1 - max) / 2) * height;
            const yMin = ((1 - min) / 2) * height;
            const barHeight = Math.max(1, yMin - yMax);

            // Draw vertical bar
            ctx.fillRect(x, yMax, 1, barHeight);
        }

        // Convert to data URL
        return canvas.toDataURL('image/png');
    } catch (error) {
        console.error('Waveform generation error:', error);

        // Return fallback empty waveform
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, width, height);
        return canvas.toDataURL('image/png');
    }
}

/**
 * Gets audio duration from URL
 */
export async function getAudioDuration(audioUrl: string): Promise<number> {
    return new Promise((resolve, reject) => {
        const audio = new Audio();
        audio.addEventListener('loadedmetadata', () => {
            resolve(audio.duration);
        });
        audio.addEventListener('error', reject);
        audio.src = audioUrl;
    });
}

/**
 * Analyzes audio volume peaks
 */
export async function analyzeAudioPeaks(audioUrl: string): Promise<number[]> {
    try {
        const response = await fetch(audioUrl);
        const arrayBuffer = await response.arrayBuffer();
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        const channelData = audioBuffer.getChannelData(0);
        const sampleRate = audioBuffer.sampleRate;
        const windowSize = Math.floor(sampleRate * 0.1); // 100ms windows
        const peaks: number[] = [];

        for (let i = 0; i < channelData.length; i += windowSize) {
            let max = 0;
            for (let j = i; j < i + windowSize && j < channelData.length; j++) {
                max = Math.max(max, Math.abs(channelData[j]));
            }
            peaks.push(max);
        }

        return peaks;
    } catch (error) {
        console.error('Peak analysis error:', error);
        return [];
    }
}

/**
 * Cache for generated waveforms
 */
const waveformCache = new Map<string, string>();

export async function getCachedWaveform(
    audioUrl: string,
    options: WaveformOptions
): Promise<string> {
    const cacheKey = `${audioUrl}_${options.width}_${options.height}`;

    if (waveformCache.has(cacheKey)) {
        return waveformCache.get(cacheKey)!;
    }

    const waveform = await generateWaveform(audioUrl, options);
    waveformCache.set(cacheKey, waveform);
    return waveform;
}

export function clearWaveformCache(): void {
    waveformCache.clear();
}
