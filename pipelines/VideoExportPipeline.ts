import { Project, Clip, Asset, MediaType, ExportSettings } from '../models';
import { renderCanvas } from '../engines/render/CanvasRenderer';
// @ts-ignore
import * as MP4BoxModule from 'mp4box';
// @ts-ignore
const MP4Box = (MP4BoxModule as any).default || MP4BoxModule;

// --- WebCodecs Declarations for TypeScript (if missing) ---
declare class VideoEncoder {
    constructor(init: { output: (chunk: EncodedVideoChunk, meta: any) => void; error: (e: any) => void });
    configure(config: any): void;
    encode(frame: VideoFrame, options?: { keyFrame: boolean }): void;
    flush(): Promise<void>;
    close(): void;
    static isConfigSupported(config: any): Promise<{ supported: boolean }>;
}

declare class VideoFrame {
    constructor(image: CanvasImageSource, init?: { timestamp: number; duration?: number });
    close(): void;
}

declare type EncodedVideoChunk = {
    type: 'key' | 'delta';
    timestamp: number; // microseconds
    duration: number; // microseconds (may be 0/undefined depending on browser)
    byteLength: number;
    copyTo(dest: BufferSource): void;
};

declare class AudioEncoder {
    constructor(init: { output: (chunk: EncodedAudioChunk, meta: any) => void; error: (e: any) => void });
    configure(config: any): void;
    encode(data: AudioData): void;
    flush(): Promise<void>;
    close(): void;
    static isConfigSupported(config: any): Promise<{ supported: boolean }>;
}

declare class AudioData {
    constructor(init: any);
    close(): void;
}

declare type EncodedAudioChunk = {
    type: 'key' | 'delta';
    timestamp: number; // microseconds
    duration: number; // microseconds
    byteLength: number;
    copyTo(dest: BufferSource): void;
};

export class VideoExportPipeline {
    private ctx: OffscreenCanvasRenderingContext2D | null = null;
    private canvas: OffscreenCanvas | null = null;
    private mp4File: any = null;

    // NOTE: keep AudioBuffer in cache for export audio render
    private mediaCache = new Map<string, HTMLImageElement | HTMLVideoElement | AudioBuffer>();

    constructor() { }

    // ---------- Helpers (normalize description / buffers) ----------
    // WebCodecs may give ArrayBuffer | SharedArrayBuffer | TypedArray views.
    // MP4Box is happiest with a real ArrayBuffer (not SharedArrayBuffer).
    private toTightArrayBuffer(input: ArrayBufferLike | Uint8Array): ArrayBuffer {
        // Uint8Array view -> copy only the visible bytes
        if (input instanceof Uint8Array) {
            return input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength);
        }

        // Already a normal ArrayBuffer
        if (input instanceof ArrayBuffer) {
            return input;
        }

        // SharedArrayBuffer (or other ArrayBufferLike) -> make a copy into ArrayBuffer
        // (This is what fixes your TS error + MP4Box compatibility)
        const u8 = new Uint8Array(input);
        const copy = new Uint8Array(u8.byteLength);
        copy.set(u8);
        return copy.buffer;
    }

    // AAC AudioSpecificConfig for mp4a.40.2 (AAC-LC)
    private buildAACASC(sampleRate: number, channels: number): ArrayBuffer {
        const frequencyIndices: Record<number, number> = {
            96000: 0,
            88200: 1,
            64000: 2,
            48000: 3,
            44100: 4,
            32000: 5,
            24000: 6,
            22050: 7,
            16000: 8,
            12000: 9,
            11025: 10,
            8000: 11,
            7350: 12
        };
        const objectType = 2; // AAC-LC
        const sampleRateIndex = frequencyIndices[sampleRate] ?? 4;
        const channelConfig = channels;

        const asc = new Uint8Array(2);
        asc[0] = (objectType << 3) | ((sampleRateIndex >> 1) & 0x07);
        asc[1] = ((sampleRateIndex & 1) << 7) | ((channelConfig & 0x0f) << 3);

        return this.toTightArrayBuffer(asc);
    }

    private async preloadAssets(assets: Asset[], clips: Clip[]): Promise<void> {
        console.log('[Export] Preloading assets...');
        const uniqueAssets = Array.from(new Set(clips.map((c) => c.assetId)));

        // Use a single OfflineAudioContext for decoding to avoid hitting hardware constraints (max 6 contexts)
        const decodeCtx = new OfflineAudioContext(1, 1, 44100);

        try {
            await Promise.all(
                uniqueAssets.map(async (assetId) => {
                    const asset = assets.find((a) => a.id === assetId);
                    if (!asset) return;
                    if (this.mediaCache.has(assetId)) return;

                    if (asset.type === MediaType.IMAGE) {
                        const img = new Image();
                        img.crossOrigin = 'anonymous';
                        img.src = asset.src;
                        await new Promise((resolve) => {
                            img.onload = resolve;
                            img.onerror = resolve;
                        });
                        this.mediaCache.set(assetId, img);
                    } else if (asset.type === MediaType.VIDEO) {
                        // 1) Video element for visuals
                        const vid = document.createElement('video');
                        vid.crossOrigin = 'anonymous';
                        vid.src = asset.src;
                        vid.muted = true;

                        // Important: setting preload to auto might help
                        vid.preload = 'auto';

                        await new Promise((resolve) => {
                            vid.onloadedmetadata = resolve;
                            vid.onerror = resolve;
                        });
                        this.mediaCache.set(assetId, vid);

                        // 2) Decode audio track via WebAudio
                        try {
                            const response = await fetch(asset.src);
                            const arrayBuffer = await response.arrayBuffer();

                            // Use the shared context to decode
                            const audioBuffer = await decodeCtx.decodeAudioData(arrayBuffer);

                            this.mediaCache.set(assetId + '_audio', audioBuffer);
                            console.log(`[Export] Decoded audio from video: ${asset.name}, channels: ${audioBuffer.numberOfChannels}, rate: ${audioBuffer.sampleRate}`);
                        } catch (e) {
                            console.warn(`[Export] Failed to decode audio from video ${asset.name}:`, e);
                        }
                    } else if (asset.type === MediaType.AUDIO) {
                        try {
                            const response = await fetch(asset.src);
                            const arrayBuffer = await response.arrayBuffer();

                            // Use the shared context to decode
                            const audioBuffer = await decodeCtx.decodeAudioData(arrayBuffer);

                            this.mediaCache.set(assetId, audioBuffer);
                            console.log(`[Export] Decoded audio asset: ${asset.name}`);
                        } catch (e) {
                            console.error(`[Export] User-facing Error: Failed to load audio for export: ${asset.name}`, e);
                        }
                    }
                })
            );
        } catch (err) {
            console.error("[Export] Fatal error during preload:", err);
        }

        console.log('[Export] Preload complete. Cache keys:', Array.from(this.mediaCache.keys()));
    }

    private async renderUseOfflineAudio(clips: Clip[], assets: Asset[], settings: ExportSettings): Promise<AudioBuffer | null> {
        console.log('[Export] Rendering Offline Audio...');
        const sampleRate = 44100;
        const duration = settings.endTime - settings.startTime;
        if (duration <= 0) return null;

        const offlineCtx = new OfflineAudioContext(2, sampleRate * duration, sampleRate);
        const audioClips = clips.filter((c) => c.type === MediaType.AUDIO || c.type === MediaType.VIDEO);
        console.log(`[Export] Found ${audioClips.length} audio/video clips for offscreen rendering.`);
        if (audioClips.length === 0) {
            console.log('[Export] No audio/video clips found.');
            return null;
        }

        let hasAudio = false;

        for (const clip of audioClips) {
            if (clip.start >= settings.endTime || clip.start + clip.duration <= settings.startTime) continue;

            const mediaItem = this.mediaCache.get(clip.assetId);
            let buffer: AudioBuffer | null = null;

            if (mediaItem instanceof AudioBuffer) {
                buffer = mediaItem;
            } else if (clip.type === MediaType.VIDEO) {
                const videoAudio = this.mediaCache.get(clip.assetId + '_audio');
                if (videoAudio instanceof AudioBuffer) buffer = videoAudio;
            }

            if (!buffer) {
                console.warn(`[Export] Clip ${clip.id} has no loaded audio buffer. (Type: ${clip.type}, AssetId: ${clip.assetId})`);
                continue;
            }

            const source = offlineCtx.createBufferSource();
            source.buffer = buffer;

            const clipRelativeStart = clip.start - settings.startTime;
            const offset = clip.offset ?? 0;

            let startWhen = Math.max(0, clipRelativeStart);
            let startOffset = offset;
            if (clipRelativeStart < 0) startOffset += Math.abs(clipRelativeStart);

            const available = buffer.duration - startOffset;
            const wanted = Math.min(clip.duration, available, settings.endTime - clip.start);

            if (wanted > 0.001) {
                source.connect(offlineCtx.destination);
                source.start(startWhen, startOffset, wanted);
                console.log(`[Export] Scheduled clip ${clip.id} at ${startWhen}s (offset ${startOffset}s, dur ${wanted}s)`);
                hasAudio = true;
            } else {
                console.warn(`[Export] Clip ${clip.id} skipped (wanted duration ${wanted} <= 0.001)`);
            }
        }

        console.log(`[Export] hasAudio = ${hasAudio}. Starting offline rendering...`);

        if (!hasAudio) return null;
        try {
            const rendered = await offlineCtx.startRendering();
            console.log('[Export] Offline rendering complete. Duration:', rendered.duration, 'Channels:', rendered.numberOfChannels);
            return rendered;
        } catch (err) {
            console.error('[Export] Offline rendering failed:', err);
            return null;
        }
    }

    public async export(project: Project, onProgress: (progress: number) => void): Promise<void> {
        const { clips, assets, exportSettings: settings } = project.state;

        const width = project.state.canvasWidth || 1920;
        const height = project.state.canvasHeight || 1080;
        const fps = settings.fps || 30;

        const duration = settings.endTime - settings.startTime;
        const totalFrames = Math.ceil(duration * fps);
        const filename = 'export';

        console.log(`[Export] Starting export: ${width}x${height} @ ${fps}fps, ${duration}s`);

        // 1) Init MP4Box
        console.log('[Export] MP4Box version/object:', MP4Box);
        this.mp4File = MP4Box.createFile();
        console.log('[Export] Created MP4File:', this.mp4File);

        let videoTrackId: number | null = null;
        let audioTrackId: number | null = null;

        // 2) Preload sources
        await this.preloadAssets(assets, clips);

        // 3) Render + encode audio first (Offline mix -> AAC -> addSample)
        const audioBuffer = await this.renderUseOfflineAudio(clips, assets, settings);

        if (audioBuffer) {
            console.log('[Export] Audio Buffer Details:', {
                duration: audioBuffer.duration,
                sampleRate: audioBuffer.sampleRate,
                channels: audioBuffer.numberOfChannels
            });

            const audioSampleRate = audioBuffer.sampleRate;
            const audioChannels = audioBuffer.numberOfChannels;

            const audioConfig = {
                codec: 'mp4a.40.2',
                sampleRate: audioSampleRate,
                numberOfChannels: audioChannels,
                bitrate: 128_000
            };

            // @ts-ignore
            const audioSupport = await AudioEncoder.isConfigSupported(audioConfig);
            console.log('[Export] Audio Support:', audioSupport);

            if (!audioSupport.supported) {
                console.error('AudioEncoder config not supported', audioConfig);
            } else {
                const AAC_SAMPLES_PER_FRAME = 1024;
                let nextDts = 0;
                let audioSamplesAdded = 0;

                const audioEncoder = new AudioEncoder({
                    output: (chunk: any, meta: any) => {
                        if (audioTrackId === null) {
                            let desc: ArrayBuffer;

                            const provided = meta?.decoderConfig?.description as ArrayBufferLike | Uint8Array | undefined;
                            if (provided) {
                                // provided can be ArrayBuffer | SharedArrayBuffer | TypedArray
                                const u8 = provided instanceof Uint8Array ? provided : new Uint8Array(provided);
                                desc = this.toTightArrayBuffer(u8);
                            } else {
                                desc = this.buildAACASC(audioSampleRate, audioChannels);
                            }

                            console.log('[Export] Creating MP4 Audio Track. Timescale:', audioSampleRate, 'Channels:', audioChannels, 'Desc bytes:', desc.byteLength);

                            const attemptAddTrack = (description: ArrayBuffer) => {
                                try {
                                    return this.mp4File.addTrack({
                                        type: 'audio',
                                        hdlr: 'soun',
                                        codec: 'mp4a.40.2',
                                        timescale: audioSampleRate,
                                        samplerate: audioSampleRate,
                                        channel_count: audioChannels,
                                        description: description
                                    });
                                } catch (e) {
                                    console.error('[Export] addTrack(audio) attempt failed:', e);
                                    return null;
                                }
                            };

                            // Attempt 1: Use provided description or built one
                            audioTrackId = attemptAddTrack(desc);

                            // Attempt 2: If failed and we used a provided description, try forcing a manual build
                            if (audioTrackId == null && meta?.decoderConfig?.description) {
                                console.warn('[Export] Audio track failed with encoder description. Retrying with manual ASC...');
                                const manualDesc = this.buildAACASC(audioSampleRate, audioChannels);
                                audioTrackId = attemptAddTrack(manualDesc);
                            }

                            console.log('[Export] ✅ audioTrackId =', audioTrackId);
                            if (audioTrackId == null) {
                                console.error('MP4Box rejected audio track config (audioTrackId is null/undefined).');
                                return;
                            }
                        }

                        if (audioTrackId === null) {
                            console.warn('[Export] Audio chunk received but audioTrackId is still null! Dropping sample.');
                            return;
                        }

                        const buf = new ArrayBuffer(chunk.byteLength);
                        chunk.copyTo(buf);

                        this.mp4File.addSample(audioTrackId, buf, {
                            duration: AAC_SAMPLES_PER_FRAME,
                            dts: nextDts,
                            cts: nextDts,
                            is_sync: true
                        });

                        nextDts += AAC_SAMPLES_PER_FRAME;
                        audioSamplesAdded++;

                        if (audioSamplesAdded <= 5) {
                            console.log('[Export] 🔊 AAC chunk', {
                                audioSamplesAdded,
                                chunkTs: chunk.timestamp,
                                chunkDur: chunk.duration,
                                bytes: chunk.byteLength,
                                nextDts
                            });
                        }
                    },
                    error: (e: any) => console.error('AudioEncoder error:', e)
                });

                audioEncoder.configure(audioConfig);

                const numberOfFrames = audioBuffer.length;
                const interleaved = new Float32Array(numberOfFrames * audioChannels);

                for (let i = 0; i < numberOfFrames; i++) {
                    for (let c = 0; c < audioChannels; c++) {
                        interleaved[i * audioChannels + c] = audioBuffer.getChannelData(c)[i];
                    }
                }

                const frameSize = 1024;
                for (let i = 0; i < numberOfFrames; i += frameSize) {
                    const length = Math.min(frameSize, numberOfFrames - i);
                    const chunkData = interleaved.subarray(i * audioChannels, (i + length) * audioChannels);

                    const audioData = new AudioData({
                        format: 'f32',
                        sampleRate: audioSampleRate,
                        numberOfChannels: audioChannels,
                        numberOfFrames: length,
                        timestamp: (i * 1_000_000) / audioSampleRate,
                        data: chunkData
                    });

                    audioEncoder.encode(audioData);
                    audioData.close();
                }

                await audioEncoder.flush();
                audioEncoder.close();
                console.log('[Export] ✅ total AAC chunks encoded:', audioSamplesAdded);
            }
        } else {
            console.warn('[Export] No audioBuffer rendered (no active audio clips?)');
        }

        // 4) Video canvas setup
        this.canvas = new OffscreenCanvas(width, height);
        this.ctx = this.canvas.getContext('2d') as OffscreenCanvasRenderingContext2D;

        // 5) Video encoder setup
        const config = {
            codec: 'avc1.42001f',
            width,
            height,
            bitrate: 5_000_000,
            framerate: fps
        };

        const support = await VideoEncoder.isConfigSupported(config);
        if (!support.supported) {
            console.error('VideoEncoder config not supported', config);
            config.codec = 'avc1.4d002a';
        }

        const VIDEO_TIMESCALE = 90000;
        const frameDur90k = Math.round(VIDEO_TIMESCALE / fps);
        let videoFrameIndex = 0;

        const encoder = new VideoEncoder({
            output: (chunk: EncodedVideoChunk, meta: any) => {
                if (videoTrackId === null && meta?.decoderConfig?.description) {
                    const raw = meta.decoderConfig.description as ArrayBufferLike | Uint8Array;

                    // normalize avcC record
                    const avccU8 = raw instanceof Uint8Array ? raw : new Uint8Array(raw);
                    const avccAB = this.toTightArrayBuffer(avccU8);

                    try {
                        videoTrackId = this.mp4File.addTrack({
                            type: 'video',
                            hdlr: 'vide',
                            codec: config.codec,
                            timescale: VIDEO_TIMESCALE,
                            width,
                            height,
                            avcDecoderConfigRecord: new Uint8Array(avccAB)
                        });
                    } catch (e) {
                        console.error('[Export] addTrack(video) threw:', e);
                    }

                    console.log('[Export] ✅ videoTrackId =', videoTrackId);
                    if (videoTrackId == null) {
                        console.error('MP4Box rejected video track config (videoTrackId is null/undefined)');
                    }
                }

                if (videoTrackId !== null) {
                    const buf = new ArrayBuffer(chunk.byteLength);
                    chunk.copyTo(buf);

                    const dts = videoFrameIndex * frameDur90k;

                    this.mp4File.addSample(videoTrackId, buf, {
                        duration: frameDur90k,
                        dts,
                        cts: dts,
                        is_sync: chunk.type === 'key'
                    });

                    videoFrameIndex++;
                }
            },
            error: (e: any) => console.error('VideoEncoder error:', e)
        });

        encoder.configure(config);

        // 6) Render loop
        const dt = 1 / fps;

        for (let i = 0; i < totalFrames; i++) {
            const time = settings.startTime + i * dt;

            this.ctx!.clearRect(0, 0, width, height);

            renderCanvas(this.ctx! as any, clips, assets, this.mediaCache as any, time, width, height);

            const frame = new VideoFrame(this.canvas!, {
                timestamp: Math.round((i * 1_000_000) / fps)
            });

            const keyFrame = i % (fps * 2) === 0;
            encoder.encode(frame, { keyFrame });
            frame.close();

            onProgress((i / totalFrames) * 100);

            if (i % 10 === 0) await new Promise((r) => setTimeout(r, 0));
        }

        await encoder.flush();
        encoder.close();

        // 7) Finalize (simple + reliable)
        try {
            this.mp4File.flush();
            this.mp4File.save(`${filename}.mp4`);
            console.log('[Export] Complete (save)');
            onProgress(100);
        } catch (e) {
            console.error('[Export] MP4 finalize failed:', e);
            throw e;
        }
    }
}
