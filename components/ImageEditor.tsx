import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, RotateCw, RotateCcw, FlipHorizontal, FlipVertical, Check, RefreshCcw, Crop } from 'lucide-react';

interface ImageEditorProps {
    src: string;
    onSave: (blobUrl: string) => void;
    onCancel: () => void;
}

const ImageEditor: React.FC<ImageEditorProps> = ({ src, onSave, onCancel }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [image, setImage] = useState<HTMLImageElement | null>(null);

    // Transform State
    const [rotation, setRotation] = useState(0);
    const [flipH, setFlipH] = useState(false);
    const [flipV, setFlipV] = useState(false);

    // Crop State (percentage 0-1)
    const [crop, setCrop] = useState({ x: 0, y: 0, w: 1, h: 1 });
    const [isDragging, setIsDragging] = useState<null | 'move' | 'nw' | 'ne' | 'sw' | 'se'>(null);
    const dragStartRef = useRef({ x: 0, y: 0, crop: { x: 0, y: 0, w: 1, h: 1 } });

    useEffect(() => {
        const img = new Image();
        // Enable CORS for remote headers to prevent Tainted Canvas security errors
        if (src.startsWith('http://') || src.startsWith('https://')) {
            img.crossOrigin = "anonymous";
        }
        img.src = src;
        img.onload = () => setImage(img);
        img.onerror = () => {
            console.error('Failed to load image:', src);
            setImage(null);
        };
    }, [src]);

    useEffect(() => {
        drawPreview();
    }, [image, rotation, flipH, flipV]);

    // Handle Dragging Logic for Crop Box
    const handleMouseDown = (e: React.MouseEvent, type: 'move' | 'nw' | 'ne' | 'sw' | 'se') => {
        setIsDragging(type);
        dragStartRef.current = {
            x: e.clientX,
            y: e.clientY,
            crop: { ...crop }
        };
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !containerRef.current) return;

        const containerRect = containerRef.current.getBoundingClientRect();
        const dx = (e.clientX - dragStartRef.current.x) / containerRect.width;
        const dy = (e.clientY - dragStartRef.current.y) / containerRect.height;
        const startCrop = dragStartRef.current.crop;

        let newCrop = { ...crop };

        if (isDragging === 'move') {
            newCrop.x = Math.max(0, Math.min(1 - startCrop.w, startCrop.x + dx));
            newCrop.y = Math.max(0, Math.min(1 - startCrop.h, startCrop.y + dy));
        } else if (isDragging === 'se') {
            newCrop.w = Math.max(0.1, Math.min(1 - startCrop.x, startCrop.w + dx));
            newCrop.h = Math.max(0.1, Math.min(1 - startCrop.y, startCrop.h + dy));
        } else if (isDragging === 'sw') {
            newCrop.x = Math.max(0, Math.min(startCrop.x + startCrop.w - 0.1, startCrop.x + dx));
            newCrop.w = startCrop.w + (startCrop.x - newCrop.x);
            newCrop.h = Math.max(0.1, Math.min(1 - startCrop.y, startCrop.h + dy));
        } else if (isDragging === 'ne') {
            newCrop.y = Math.max(0, Math.min(startCrop.y + startCrop.h - 0.1, startCrop.y + dy));
            newCrop.h = startCrop.h + (startCrop.y - newCrop.y);
            newCrop.w = Math.max(0.1, Math.min(1 - startCrop.x, startCrop.w + dx));
        } else if (isDragging === 'nw') {
            newCrop.x = Math.max(0, Math.min(startCrop.x + startCrop.w - 0.1, startCrop.x + dx));
            newCrop.w = startCrop.w + (startCrop.x - newCrop.x);
            newCrop.y = Math.max(0, Math.min(startCrop.y + startCrop.h - 0.1, startCrop.y + dy));
            newCrop.h = startCrop.h + (startCrop.y - newCrop.y);
        }

        setCrop(newCrop);
    };

    const handleMouseUp = () => setIsDragging(null);

    const drawPreview = () => {
        if (!image || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Ensure image is ready
        if (!image.complete) {
            image.onload = () => drawPreview();
            return;
        }

        // Use rAF to ensure we draw when ready, preventing race conditions
        requestAnimationFrame(() => {
            if (!image || !canvasRef.current) return; // Re-check inside frame

            // 1. Calculate dimensions after rotation
            const isRotated90 = Math.abs(rotation) % 180 !== 0; // 90 or 270
            const cw = isRotated90 ? image.naturalHeight : image.naturalWidth;
            const ch = isRotated90 ? image.naturalWidth : image.naturalHeight;

            canvas.width = cw;
            canvas.height = ch;

            // Clear canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // 2. Transform Context
            ctx.save();
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate((rotation * Math.PI) / 180);
            ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);

            // 3. Draw Image
            ctx.drawImage(
                image,
                -image.naturalWidth / 2,
                -image.naturalHeight / 2
            );
            ctx.restore();
        });
    };

    const handleSave = () => {
        if (!image) return;

        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            // 1. Calculate dimensions after rotation
            const isRotated90 = Math.abs(rotation) % 180 !== 0; // 90 or 270
            const cw = isRotated90 ? image.naturalHeight : image.naturalWidth;
            const ch = isRotated90 ? image.naturalWidth : image.naturalHeight;

            canvas.width = cw;
            canvas.height = ch;

            // 2. Transform Context
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate((rotation * Math.PI) / 180);
            ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);

            // 3. Draw Image to fit base + rotation
            ctx.drawImage(
                image,
                -image.naturalWidth / 2,
                -image.naturalHeight / 2
            );

            // 4. Handle Crop (Create new canvas for cropping)
            const cropCanvas = document.createElement('canvas');
            cropCanvas.width = cw * crop.w;
            cropCanvas.height = ch * crop.h;
            const cropCtx = cropCanvas.getContext('2d');

            if (cropCtx) {
                cropCtx.drawImage(
                    canvas,
                    cw * crop.x, ch * crop.y, cw * crop.w, ch * crop.h, // Source
                    0, 0, cropCanvas.width, cropCanvas.height // Dest
                );

                // 5. Export
                cropCanvas.toBlob((blob) => {
                    if (blob) {
                        onSave(URL.createObjectURL(blob));
                    } else {
                        console.error('Failed to create blob from canvas');
                    }
                }, 'image/png');
            }
        } catch (error) {
            console.error('Failed to save edited image (Tainted Canvas?):', error);
            alert('Failed to save image. Cross-origin security restriction.');
        }
    };

    const reset = () => {
        setRotation(0);
        setFlipH(false);
        setFlipV(false);
        setCrop({ x: 0, y: 0, w: 1, h: 1 });
    };

    if (!image) return <div className="flex items-center justify-center h-full text-white">Loading...</div>;

    // Calculate auto-scale to fit rotated image within container
    // If rotated 90/270, the "Visual Height" becomes the "Layout Width".
    // We need to ensure Visual Height <= Container Height (approx equal to Max Layout Height).
    // A safe heuristic is scaling by the aspect ratio if landscape.
    let fitScale = 1;
    if (Math.abs(rotation) % 180 !== 0 && image) {
        if (image.naturalWidth > image.naturalHeight) {
            fitScale = image.naturalHeight / image.naturalWidth;
        }
    }

    // Apply CSS transforms for visual preview
    const previewStyle = {
        transform: `rotate(${rotation}deg) scale(${fitScale}) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`,
        transition: isDragging ? 'none' : 'transform 0.3s ease',
        maxWidth: '100%',
        maxHeight: '100%',
        display: 'block'
    };

    const overlay = (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        >
            <div className="bg-[#18181b] border border-[#27272a] rounded-lg shadow-2xl flex flex-col w-[800px] h-[600px] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-[#27272a] bg-[#18181b]">
                    <h3 className="text-sm font-semibold text-white">Edit Image</h3>
                    <div className="flex gap-2">
                        <button onClick={reset} className="text-gray-400 hover:text-white flex items-center gap-1 text-xs px-2 py-1 rounded hover:bg-[#27272a]">
                            <RefreshCcw size={14} /> Reset
                        </button>
                        <button onClick={onCancel} className="text-gray-400 hover:text-white p-1 rounded hover:bg-[#27272a]">
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Main Workspace */}
                <div className="flex-1 overflow-hidden relative bg-[#09090b] flex items-center justify-center p-8 select-none">
                    {/* Image Container */}
                    <div ref={containerRef} className="relative inline-block border border-gray-700 shadow-xl" style={{ maxHeight: '100%', maxWidth: '100%' }}>
                        {/* Preview Canvas */}
                        <canvas
                            ref={canvasRef} // Reusing canvasRef for the preview as well? No, need separate ref. Let's use a new one.
                            style={{
                                maxWidth: '100%',
                                maxHeight: '380px',
                                display: 'block',
                                backgroundColor: 'black'
                            }}
                            draggable={false}
                        />

                        {/* Crop Overlay */}
                        <div
                            className="absolute border-2 border-white box-content shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"
                            style={{
                                left: `${crop.x * 100}%`,
                                top: `${crop.y * 100}%`,
                                width: `${crop.w * 100}%`,
                                height: `${crop.h * 100}%`,
                                cursor: isDragging ? 'grabbing' : 'move'
                            }}
                            onMouseDown={(e) => handleMouseDown(e, 'move')}
                        >
                            {/* Grid Lines */}
                            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-50">
                                <div className="border-r border-b border-white/30" /><div className="border-r border-b border-white/30" /><div className="border-b border-white/30" />
                                <div className="border-r border-b border-white/30" /><div className="border-r border-b border-white/30" /><div className="border-b border-white/30" />
                                <div className="border-r border-white/30" /><div className="border-r border-white/30" /><div />
                            </div>

                            {/* Resize Handles */}
                            <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border border-black cursor-nw-resize" onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, 'nw'); }} />
                            <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border border-black cursor-ne-resize" onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, 'ne'); }} />
                            <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border border-black cursor-sw-resize" onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, 'sw'); }} />
                            <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border border-black cursor-se-resize" onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, 'se'); }} />
                        </div>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="h-14 border-t border-[#27272a] bg-[#18181b] flex items-center justify-between px-6">
                    <div className="flex items-center gap-4">
                        <div className="flex bg-[#27272a] rounded p-1 gap-1">
                            <button onClick={() => setRotation(r => r - 90)} className="p-1.5 text-gray-400 hover:text-white rounded hover:bg-[#3f3f46]" title="Rotate Left">
                                <RotateCcw size={16} />
                            </button>
                            <button onClick={() => setRotation(r => r + 90)} className="p-1.5 text-gray-400 hover:text-white rounded hover:bg-[#3f3f46]" title="Rotate Right">
                                <RotateCw size={16} />
                            </button>
                        </div>
                        <div className="flex bg-[#27272a] rounded p-1 gap-1">
                            <button onClick={() => setFlipH(!flipH)} className={`p-1.5 rounded hover:bg-[#3f3f46] ${flipH ? 'text-blue-400' : 'text-gray-400 hover:text-white'}`} title="Flip Horizontal">
                                <FlipHorizontal size={16} />
                            </button>
                            <button onClick={() => setFlipV(!flipV)} className={`p-1.5 rounded hover:bg-[#3f3f46] ${flipV ? 'text-blue-400' : 'text-gray-400 hover:text-white'}`} title="Flip Vertical">
                                <FlipVertical size={16} />
                            </button>
                        </div>

                    </div>

                    <button
                        onClick={handleSave}
                        className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold shadow transition-colors"
                    >
                        <Check size={14} /> Save Changes
                    </button>
                </div>
            </div>
        </div>
    );

    return createPortal(overlay, document.body);
};

export default ImageEditor;
