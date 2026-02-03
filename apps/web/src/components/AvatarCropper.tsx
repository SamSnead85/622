'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';

// ============================================
// AVATAR CROPPER COMPONENT
// Allows zoom/pan adjustment of uploaded photos
// 0G Branded - Electric Blue Theme
// ============================================

interface AvatarCropperProps {
    imageSrc: string;
    onSave: (croppedBlob: Blob) => void;
    onCancel: () => void;
}

export function AvatarCropper({ imageSrc, onSave, onCancel }: AvatarCropperProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const imageRef = useRef<HTMLImageElement | null>(null);

    // Transform state
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [imageLoaded, setImageLoaded] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Initial scale to fit image
    const [initialScale, setInitialScale] = useState(1);

    // Load image
    useEffect(() => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            imageRef.current = img;

            // Calculate initial scale to fit image in crop area
            const cropSize = 200;
            const minDimension = Math.min(img.width, img.height);
            const fitScale = cropSize / minDimension;

            // Start with the image fitting the crop area
            const startScale = Math.max(fitScale, 0.5);
            setInitialScale(startScale);
            setScale(startScale);
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

        // Clear canvas with dark background
        ctx.fillStyle = '#000000';
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

    // Handle zoom with limits
    const handleZoom = useCallback((newScale: number) => {
        setScale(Math.max(0.3, Math.min(4, newScale)));
    }, []);

    // Mouse wheel zoom
    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        handleZoom(scale + delta);
    }, [scale, handleZoom]);

    // Reset position and zoom
    const handleReset = useCallback(() => {
        setScale(initialScale);
        setPosition({ x: 0, y: 0 });
    }, [initialScale]);

    // Apply crop and save
    const handleSave = async () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        setIsSaving(true);

        canvas.toBlob((blob) => {
            if (blob) {
                onSave(blob);
            }
            setIsSaving(false);
        }, 'image/jpeg', 0.92);
    };

    return (
        <motion.div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <div className="absolute inset-0 bg-black/95 backdrop-blur-xl" onClick={onCancel} />

            <motion.div
                className="relative bg-[#0A1628] rounded-3xl border border-[#00D4FF]/20 p-6 max-w-sm w-full shadow-2xl shadow-[#00D4FF]/10"
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold text-white">
                        Adjust Your Photo
                    </h3>
                    <button
                        onClick={handleReset}
                        className="px-3 py-1.5 text-xs rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-white hover:border-[#00D4FF]/30 transition-colors"
                    >
                        Reset
                    </button>
                </div>

                <p className="text-sm text-white/50 text-center mb-6">
                    Drag to reposition • Scroll or use slider to zoom
                </p>

                {/* Preview canvas with circular mask */}
                <div
                    ref={containerRef}
                    className="relative mx-auto w-[200px] h-[200px] mb-6"
                    onWheel={handleWheel}
                >
                    {/* Circular clip container */}
                    <div
                        className="w-full h-full rounded-full overflow-hidden cursor-move border-4 border-[#00D4FF]/40 shadow-lg shadow-[#00D4FF]/20"
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

                    {/* Corner indicators - Electric Blue */}
                    <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-[#00D4FF] rounded-tl-full" />
                        <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-[#00D4FF] rounded-tr-full" />
                        <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-[#00D4FF] rounded-bl-full" />
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-[#00D4FF] rounded-br-full" />
                    </div>

                    {/* Loading overlay */}
                    {!imageLoaded && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-full">
                            <div className="w-8 h-8 border-3 border-[#00D4FF]/30 border-t-[#00D4FF] rounded-full animate-spin" />
                        </div>
                    )}
                </div>

                {/* Zoom slider */}
                <div className="mb-6">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => handleZoom(scale - 0.2)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-white hover:border-[#00D4FF]/30 transition-colors"
                        >
                            −
                        </button>
                        <div className="flex-1 relative">
                            <input
                                type="range"
                                min="0.3"
                                max="4"
                                step="0.05"
                                value={scale}
                                onChange={(e) => handleZoom(parseFloat(e.target.value))}
                                className="w-full h-2 rounded-full appearance-none cursor-pointer"
                                style={{
                                    background: `linear-gradient(to right, #00D4FF 0%, #00D4FF ${((scale - 0.3) / 3.7) * 100}%, rgba(255,255,255,0.1) ${((scale - 0.3) / 3.7) * 100}%, rgba(255,255,255,0.1) 100%)`
                                }}
                            />
                        </div>
                        <button
                            onClick={() => handleZoom(scale + 0.2)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-white hover:border-[#00D4FF]/30 transition-colors"
                        >
                            +
                        </button>
                        <span className="text-sm text-white/50 w-14 text-right font-mono">{Math.round(scale * 100)}%</span>
                    </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        disabled={isSaving}
                        className="flex-1 py-3 rounded-xl border border-white/10 text-white/70 hover:bg-white/5 transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving || !imageLoaded}
                        className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6] text-black font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {isSaving ? (
                            <>
                                <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                Saving...
                            </>
                        ) : (
                            'Apply'
                        )}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}

export default AvatarCropper;

