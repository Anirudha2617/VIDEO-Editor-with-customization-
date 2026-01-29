import React from 'react';
import { Rnd } from 'react-rnd';
import { Clip, MediaType } from '../models';

interface TransformOverlayProps {
    activeClip: Clip | null;
    onChange: (updates: Partial<Clip>) => void;
    containerWidth: number;
    containerHeight: number;
    canvasWidth: number;
    canvasHeight: number;
    currentTime: number;
}

const TransformOverlay: React.FC<TransformOverlayProps> = ({
    activeClip,
    onChange,
    containerWidth,
    containerHeight,
    canvasWidth,
    canvasHeight,
    currentTime,
}) => {
    // State for Shift Key
    const [isShiftPressed, setIsShiftPressed] = React.useState(false);

    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Shift') setIsShiftPressed(true);
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.key === 'Shift') setIsShiftPressed(false);
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    // Only show overlay if the clip is currently visible on the canvas at the current time
    if (currentTime < activeClip.start || currentTime > activeClip.start + activeClip.duration) {
        return null;
    }

    // Hide for Audio
    if (activeClip.type === MediaType.AUDIO) return null;

    // Calculate scaling factors
    const displayScaleFactor = containerWidth / 1280; // Renderer uses base width 1280

    // Calculate Box Dimensions
    // Default to 1280x720 only if NO dimensions exist (shouldn't happen for visual media now)
    const baseW = activeClip.width ?? 1280;
    const baseH = activeClip.height ?? 720;
    const currentScale = activeClip.scale || 1;

    const width = baseW * currentScale * displayScaleFactor;
    const height = baseH * currentScale * displayScaleFactor;

    // Calculate Box Position (Center Origin)
    // Renderer: centerX = (canvasWidth / 2) + (clip.x * scaleFactor)
    // Here we map that to container coordinates
    const centerX = (containerWidth / 2) + ((activeClip.x || 0) * displayScaleFactor);
    const centerY = (containerHeight / 2) + ((activeClip.y || 0) * displayScaleFactor);

    // Rnd uses Top-Left coordinates
    const x = centerX - (width / 2);
    const y = centerY - (height / 2);

    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <Rnd
                size={{ width, height }}
                position={{ x, y }}
                onDragStop={(e, d) => {
                    // Update X/Y based on drag delta
                    const newBoxCenterX = d.x + (width / 2);
                    const newBoxCenterY = d.y + (height / 2);

                    const newClipX = (newBoxCenterX - (containerWidth / 2)) / displayScaleFactor;
                    const newClipY = (newBoxCenterY - (containerHeight / 2)) / displayScaleFactor;

                    onChange({
                        x: newClipX,
                        y: newClipY
                    });
                }}
                onResizeStop={(e, direction, ref, delta, position) => {
                    const newBoxW = parseFloat(ref.style.width);
                    const newBoxH = parseFloat(ref.style.height);

                    // Update position as well (resize might shift center)
                    const newBoxCenterX = position.x + (newBoxW / 2);
                    const newBoxCenterY = position.y + (newBoxH / 2);

                    const newClipX = (newBoxCenterX - (containerWidth / 2)) / displayScaleFactor;
                    const newClipY = (newBoxCenterY - (containerHeight / 2)) / displayScaleFactor;

                    if (isShiftPressed) {
                        // Unlocked: Update Width & Height (Non-uniform)
                        // Preserve current "scale" value, update base dimensions
                        const s = activeClip.scale || 1;
                        const newW = newBoxW / (displayScaleFactor * s);
                        const newH = newBoxH / (displayScaleFactor * s);

                        onChange({
                            width: newW,
                            height: newH,
                            x: newClipX,
                            y: newClipY
                        });
                    } else {
                        // Locked: Update Scale (Uniform)
                        // newWidth = baseW * newScale * displayScaleFactor
                        const newScale = newBoxW / (baseW * displayScaleFactor);

                        onChange({
                            scale: newScale,
                            x: newClipX,
                            y: newClipY
                        });
                    }
                }}
                lockAspectRatio={!isShiftPressed}
                className="pointer-events-auto border-2 border-blue-500 z-50 shadow-[0_0_0_1px_rgba(255,255,255,0.5)]"
                handleStyles={{
                    topLeft: { width: 10, height: 10, background: 'white', borderRadius: '50%', border: '2px solid #3b82f6', left: -6, top: -6 },
                    topRight: { width: 10, height: 10, background: 'white', borderRadius: '50%', border: '2px solid #3b82f6', right: -6, top: -6 },
                    bottomLeft: { width: 10, height: 10, background: 'white', borderRadius: '50%', border: '2px solid #3b82f6', left: -6, bottom: -6 },
                    bottomRight: { width: 10, height: 10, background: 'white', borderRadius: '50%', border: '2px solid #3b82f6', right: -6, bottom: -6 },
                }}
            >
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg whitespace-nowrap">
                    {activeClip.name}
                </div>
            </Rnd>
        </div>
    );
};

export default TransformOverlay;
