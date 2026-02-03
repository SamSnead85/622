'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';

// ============================================
// AVATAR CROPPER COMPONENT
// Allows zoom/pan adjustment of uploaded photos
// ============================================

interface AvatarCropperProps {
    imageSrc: string;
    onSave: (croppedBlob: Blob) => void;
    onCancel: () => void;
}

export function AvatarCropper({ imageSrc, onSave, onCancel }: AvatarCropperProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imageRef = useRef<HTMLImageElement | null>(null);

    // Transform state
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [imageLoaded, setImageLoaded] = useState(false);

    // Load image
    useEffect(() => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            imageRef.current = img;
            setImageLoaded(true);
        };
        img.src = imageSrc;
    }, [imageSrc]);

    // Draw the preview
    const drawPreview = useCallback(() => {
        const canvas = canvasRef.current;
        const img = imageRef.current;
        if (!canvas || !img) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const size = 200; // Canvas size
        canvas.width = size;
        canvas.height = size;

        // Clear canvas
        ctx.fillStyle = '#050508';
        ctx.fillRect(0, 0, size, size);

        // Calculate scaled dimensions
        const scaledWidth = img.width * scale;
        const scaledHeight = img.height * scale;

        // Center the image, then apply position offset
        const x = (size - scaledWidth) / 2 + position.x;
        const y = (size - scaledHeight) / 2 + position.y;

        // Draw the image
        ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
    }, [scale, position]);

    // Redraw on state changes
    useEffect(() => {
        if (imageLoaded) {
            drawPreview();
        }
    }, [imageLoaded, scale, position, drawPreview]);

    // Handle mouse/touch dragging
    const handlePointerDown = (e: React.PointerEvent) => {
        setIsDragging(true);
        setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDragging) return;
        setPosition({
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y,
        });
    };

    const handlePointerUp = () => {
        setIsDragging(false);
    };

    // Handle zoom
    const handleZoom = (newScale: number) => {
        setScale(Math.max(0.5, Math.min(3, newScale)));
    };

    // Apply crop and save
    const handleSave = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.toBlob((blob) => {
            if (blob) {
                onSave(blob);
            }
        }, 'image/jpeg', 0.9);
    };

    return (
        <motion.div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={onCancel} />

            <motion.div
                className="relative bg-[#0a0a0f] rounded-3xl border border-white/10 p-6 max-w-sm w-full"
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
            >
                <h3 className="text-xl font-semibold text-white text-center mb-4">
                    Adjust Your Photo
                </h3>
                <p className="text-sm text-white/50 text-center mb-6">
                    Drag to reposition • Use slider to zoom
                </p>

                {/* Preview canvas with circular mask */}
                <div className="relative mx-auto w-[200px] h-[200px] mb-6">
                    {/* Circular clip container */}
                    <div
                        className="w-full h-full rounded-full overflow-hidden cursor-move border-4 border-white/20"
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerLeave={handlePointerUp}
                        style={{ touchAction: 'none' }}
                    >
                        <canvas
                            ref={canvasRef}
                            className="w-full h-full"
                            style={{
                                cursor: isDragging ? 'grabbing' : 'grab',
                            }}
                        />
                    </div>

                    {/* Corner indicators */}
                    <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-violet-500 rounded-tl-full" />
                        <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-violet-500 rounded-tr-full" />
                        <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-violet-500 rounded-bl-full" />
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-violet-500 rounded-br-full" />
                    </div>
                </div>

                {/* Zoom slider */}
                <div className="mb-6">
                    <div className="flex items-center gap-3">
                        <span className="text-lg">🔍</span>
                        <input
                            type="range"
                            min="0.5"
                            max="3"
                            step="0.1"
                            value={scale}
                            onChange={(e) => handleZoom(parseFloat(e.target.value))}
                            className="flex-1 h-2 rounded-full appearance-none cursor-pointer"
                            style={{
                                background: `linear-gradient(to right, #8B5CF6 0%, #8B5CF6 ${((scale - 0.5) / 2.5) * 100}%, rgba(255,255,255,0.1) ${((scale - 0.5) / 2.5) * 100}%, rgba(255,255,255,0.1) 100%)`
                            }}
                        />
                        <span className="text-sm text-white/50 w-12 text-right">{Math.round(scale * 100)}%</span>
                    </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        className="flex-1 py-3 rounded-xl border border-white/10 text-white/70 hover:bg-white/5 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-semibold hover:opacity-90 transition-opacity"
                    >
                        Apply
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}

export default AvatarCropper;
