import { Asset, MediaType } from '../../models/Asset';

/**
 * MediaLibraryEngine
 * 
 * Responsible for the "Cold Path" of asset ingestion.
 * Handles validation, metadata extraction, and proxy generation triggers.
 * Pure logic, no React state.
 */
export class MediaLibraryEngine {

    /**
     * Creates a Blob URL for a file.
     * NOTE: You must call revokeMediaUrl when deleting this asset.
     */
    static createBlobUrl(file: File): string {
        return URL.createObjectURL(file);
    }

    /**
     * Revokes a Blob URL to free memory.
     */
    static revokeMediaUrl(url: string): void {
        if (url && url.startsWith('blob:')) {
            URL.revokeObjectURL(url);
        }
    }

    /**
     * Detects the media type from a file.
     */
    static detectMediaType(file: File): MediaType {
        if (file.type.startsWith('video')) return MediaType.VIDEO;
        if (file.type.startsWith('audio')) return MediaType.AUDIO;
        if (file.type.startsWith('image')) return MediaType.IMAGE;
        return MediaType.IMAGE; // Default fallback
    }

    /**
     * Formats seconds into HH:MM:SS
     */
    static formatDuration(seconds: number): string {
        if (!seconds || isNaN(seconds)) return '00:00';

        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);

        if (h > 0) {
            return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

    /**
     * Extracts metadata (duration, dimensions) from a file.
     * This is an async operation that loads the media into a temporary element.
     */
    static getMediaMetadata(file: File, type: MediaType): Promise<{ duration?: number; width?: number; height?: number }> {
        return new Promise((resolve) => {
            // Images
            if (type === MediaType.IMAGE) {
                const img = new Image();
                img.onload = () => {
                    resolve({ width: img.width, height: img.height, duration: 5 }); // Default 5s for images
                    URL.revokeObjectURL(img.src);
                };
                img.onerror = () => resolve({ duration: 5 });
                img.src = URL.createObjectURL(file);
                return;
            }

            // Video
            if (type === MediaType.VIDEO) {
                const video = document.createElement('video');
                video.preload = 'metadata';
                video.onloadedmetadata = () => {
                    resolve({
                        duration: video.duration,
                        width: video.videoWidth,
                        height: video.videoHeight
                    });
                    URL.revokeObjectURL(video.src);
                };
                video.onerror = () => resolve({ duration: 0 });
                video.src = URL.createObjectURL(file);
                return;
            }

            // Audio
            if (type === MediaType.AUDIO) {
                const audio = document.createElement('audio');
                audio.onloadedmetadata = () => {
                    resolve({ duration: audio.duration });
                    URL.revokeObjectURL(audio.src); // Cleanup temp
                };
                audio.onerror = () => resolve({ duration: 0 });
                audio.src = URL.createObjectURL(file);
                return;
            }

            resolve({});
        });
    }

    /**
     * Generates a unique name by appending (n) if conflict exists.
     * e.g., "image.png" -> "image (1).png" -> "image (2).png"
     */
    static getUniqueName(name: string, existingNames: string[]): string {
        if (!existingNames.includes(name)) return name;

        // Split extension
        const lastDot = name.lastIndexOf('.');
        let base = name;
        let ext = '';

        if (lastDot > 0) {
            base = name.substring(0, lastDot);
            ext = name.substring(lastDot);
        }

        let counter = 1;
        let candidate = `${base} (${counter})${ext}`;

        while (existingNames.includes(candidate)) {
            counter++;
            candidate = `${base} (${counter})${ext}`;
        }

        return candidate;
    }
}
