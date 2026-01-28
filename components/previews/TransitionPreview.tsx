import React, { useEffect, useRef, useState } from 'react';
import { Transition, TransitionContext, Asset, MediaType } from '../../models';
import { Play, Pause, RefreshCw } from 'lucide-react';

interface TransitionPreviewProps {
    transition: Transition;
    params: Record<string, any>;
    width?: number;
    height?: number;
    duration?: number;
    sourceA?: Asset | string; // Asset object, URL, or color string
    sourceB?: Asset | string;
}

const TransitionPreview: React.FC<TransitionPreviewProps> = ({
    transition,
    params,
    width = 320,
    height = 180,
    duration = 2000,
    sourceA,
    sourceB
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isPlaying, setIsPlaying] = useState(true);
    const [progress, setProgress] = useState(0);
    const requestRef = useRef<number>();
    const startTimeRef = useRef<number>(0);

    // Create source canvases/images/videos
    const sourceARef = useRef<HTMLCanvasElement | HTMLImageElement | HTMLVideoElement | null>(null);
    const sourceBRef = useRef<HTMLCanvasElement | HTMLImageElement | HTMLVideoElement | null>(null);

    // Helpers to create fallback/color sources
    const createColorSource = (color: string, text: string) => {
        const c = document.createElement('canvas');
        c.width = width;
        c.height = height;
        const ctx = c.getContext('2d');
        if (ctx) {
            ctx.fillStyle = color;
            ctx.fillRect(0, 0, width, height);
            ctx.font = 'bold 40px Arial';
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, width / 2, height / 2);
        }
        return c;
    };

    // Load sources when props change
    useEffect(() => {
        const loadSource = async (src: Asset | string | undefined, label: string, defaultColor: string) => {
            if (!src) return createColorSource(defaultColor, label);

            if (typeof src === 'string') {
                // Check if it's a color (hex/rgb)
                if (src.startsWith('#') || src.startsWith('rgb')) {
                    return createColorSource(src, label);
                }
                // Assume URL is image for now unless extension check?
                // Simple check
                if (src.endsWith('.mp4') || src.endsWith('.webm')) {
                    const v = document.createElement('video');
                    v.src = src;
                    v.crossOrigin = "anonymous";
                    v.muted = true;
                    v.loop = true;
                    v.autoplay = true; // Auto play for preview
                    await new Promise(r => {
                        v.onloadeddata = r;
                        v.onerror = r; // Proceed even if error
                    });
                    return v;
                }

                const img = new Image();
                img.src = src;
                img.crossOrigin = "anonymous";
                await new Promise(r => img.onload = r);
                return img;
            } else {
                // Asset
                if (src.type === MediaType.VIDEO) {
                    const v = document.createElement('video');
                    v.src = src.src;
                    v.crossOrigin = "anonymous";
                    v.muted = true;
                    v.loop = true;
                    v.play().catch(() => { });
                    await new Promise(r => {
                        v.onloadeddata = r;
                        v.onerror = r;
                    });
                    return v;
                }
                if (src.type === MediaType.IMAGE) {
                    const img = new Image();
                    img.src = src.src;
                    img.crossOrigin = "anonymous";
                    await new Promise(r => img.onload = r).catch(() => { });
                    return img;
                }
                return createColorSource(defaultColor, src.name);
            }
        };

        const init = async () => {
            sourceARef.current = await loadSource(sourceA, 'Clip A', '#3b82f6');
            sourceBRef.current = await loadSource(sourceB, 'Clip B', '#ef4444');
        };
        init();
    }, [sourceA, sourceB, width, height]);

    const animate = (time: number) => {
        if (!isPlaying) {
            // If paused, just render current progress
            drawFrame(progress);
            return;
        }

        if (startTimeRef.current === 0) startTimeRef.current = time;
        const elapsed = time - startTimeRef.current;
        let p = elapsed / duration;

        if (p >= 1.5) { // 1.5s loop (1s anim + 0.5s hold)
            p = 0;
            startTimeRef.current = time;
        }

        const effectiveProgress = Math.min(1, Math.max(0, p)); // Clamp 0-1
        setProgress(effectiveProgress);
        drawFrame(effectiveProgress);

        requestRef.current = requestAnimationFrame(animate);
    };

    const drawFrame = (p: number) => {
        const canvas = canvasRef.current;
        if (!canvas || !sourceARef.current || !sourceBRef.current) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Reset
        ctx.clearRect(0, 0, width, height);

        // Draw Source A
        if (sourceARef.current) {
            ctx.drawImage(sourceARef.current, 0, 0, width, height);
        }

        // Prepare Context for Transition
        // We need to match the signature of TransitionContext
        const context: TransitionContext = {
            ctx,
            width,
            height,
            progress: p,
            isExit: false, // Usually transition effects handle "enter" logic mostly
            params: params || {},
            sources: {
                current: sourceARef.current as any, // Cast to any/canvas because context expects canvas but Image is also valid for drawImage
                next: sourceBRef.current as any
            }
        };

        try {
            // Apply Transition
            // Most transitions in our system modify the context (rotation/scale) 
            // OR draw the "next" clip over the current one with opacity/transform.
            // Let's assume the transition.apply returns a result we might need to handle, 
            // OR it draws directly if it's a custom draw type.

            ctx.save();
            const result = transition.apply(context);

            if (result.customDraw) {
                result.customDraw(ctx, width, height, sourceBRef.current);
            } else {
                // Standard transforms (opacity, scale, etc.) applied to Source B usually
                const { opacity = 1, scale = 1, rotation = 0, offsetX = 0, offsetY = 0 } = result;

                // We want to verify if this transition is erasing A or drawing B?
                // Typically transitions revealing B over A:
                // Draw A (done).
                // Draw B with transforms.

                ctx.globalAlpha = opacity;
                ctx.translate(width / 2 + offsetX, height / 2 + offsetY);
                ctx.rotate(rotation * Math.PI / 180);
                ctx.scale(scale, scale);
                ctx.translate(-width / 2, -height / 2);

                if (sourceBRef.current) {
                    ctx.drawImage(sourceBRef.current, 0, 0, width, height);
                }
            }
            ctx.restore();

        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        requestRef.current = requestAnimationFrame(animate);
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [isPlaying, duration, transition, params]); // Re-start loop if params change? 
    // Actually we want smooth update, so depend on isPlaying.
    // But if params change, drawFrame picks them up on next tick.

    return (
        <div className="flex flex-col gap-2 mb-4 bg-black/20 p-2 rounded">
            <div className="relative rounded overflow-hidden border border-white/10 mx-auto" style={{ width, height }}>
                <canvas ref={canvasRef} width={width} height={height} />
                <div className="absolute bottom-2 right-2 flex gap-1">
                    <button
                        onClick={() => { setIsPlaying(!isPlaying); startTimeRef.current = 0; }}
                        className="p-1 bg-black/50 hover:bg-black/70 rounded text-white"
                    >
                        {isPlaying ? <Pause size={12} /> : <Play size={12} />}
                    </button>
                    <button
                        onClick={() => { startTimeRef.current = 0; setProgress(0); }}
                        className="p-1 bg-black/50 hover:bg-black/70 rounded text-white"
                    >
                        <RefreshCw size={12} />
                    </button>
                </div>
            </div>
            <div className="text-[10px] text-center text-gray-500">
                Preview: {Math.round(progress * 100)}%
            </div>
        </div>
    );
};

export default TransitionPreview;
