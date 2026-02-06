'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

interface PhotoEditorProps {
    imageUrl: string;
    onSave: (editedBlob: Blob) => void;
    onCancel: () => void;
}

interface Adjustments {
    brightness: number;
    contrast: number;
    saturation: number;
    warmth: number;
    vignette: number;
}

const defaultAdjustments: Adjustments = {
    brightness: 0,
    contrast: 0,
    saturation: 0,
    warmth: 0,
    vignette: 0,
};

const filters: { name: string; adjustments: Partial<Adjustments> }[] = [
    { name: 'Original', adjustments: {} },
    { name: 'Vivid', adjustments: { saturation: 40, contrast: 15 } },
    { name: 'Warm', adjustments: { warmth: 30, saturation: 10 } },
    { name: 'Cool', adjustments: { warmth: -30, saturation: 5 } },
    { name: 'Dramatic', adjustments: { contrast: 40, saturation: -10, vignette: 30 } },
    { name: 'Fade', adjustments: { contrast: -20, brightness: 10, saturation: -20 } },
    { name: 'Noir', adjustments: { saturation: -100, contrast: 30 } },
    { name: 'Golden', adjustments: { warmth: 40, saturation: 20, brightness: 5 } },
    { name: 'Moody', adjustments: { brightness: -15, contrast: 25, saturation: -15, vignette: 40 } },
    { name: 'Bright', adjustments: { brightness: 20, contrast: 10, saturation: 15 } },
];

export function PhotoEditor({ imageUrl, onSave, onCancel }: PhotoEditorProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imageRef = useRef<HTMLImageElement | null>(null);
    const [adjustments, setAdjustments] = useState<Adjustments>(defaultAdjustments);
    const [activeTab, setActiveTab] = useState<'filters' | 'adjust' | 'crop'>('filters');
    const [cropAspect, setCropAspect] = useState<string>('free');
    const [isSaving, setIsSaving] = useState(false);

    // Load image
    useEffect(() => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            imageRef.current = img;
            renderCanvas();
        };
        img.src = imageUrl;
    }, [imageUrl]);

    // Re-render canvas when adjustments change
    useEffect(() => {
        renderCanvas();
    }, [adjustments]);

    const renderCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        const img = imageRef.current;
        if (!canvas || !img) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set canvas size to match image (capped at 1200px)
        const maxDim = 1200;
        const scale = Math.min(maxDim / img.width, maxDim / img.height, 1);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;

        // Apply CSS filter for brightness/contrast/saturation
        const b = 100 + adjustments.brightness;
        const c = 100 + adjustments.contrast;
        const s = 100 + adjustments.saturation;

        ctx.filter = `brightness(${b}%) contrast(${c}%) saturate(${s}%)`;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        ctx.filter = 'none';

        // Apply warmth (color overlay)
        if (adjustments.warmth !== 0) {
            const warmAmount = Math.abs(adjustments.warmth) / 100;
            ctx.globalCompositeOperation = 'overlay';
            ctx.fillStyle = adjustments.warmth > 0
                ? `rgba(255, 140, 0, ${warmAmount * 0.15})`
                : `rgba(0, 100, 255, ${warmAmount * 0.15})`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.globalCompositeOperation = 'source-over';
        }

        // Apply vignette
        if (adjustments.vignette > 0) {
            const cx = canvas.width / 2;
            const cy = canvas.height / 2;
            const radius = Math.max(cx, cy);
            const gradient = ctx.createRadialGradient(cx, cy, radius * 0.5, cx, cy, radius);
            gradient.addColorStop(0, 'rgba(0,0,0,0)');
            gradient.addColorStop(1, `rgba(0,0,0,${adjustments.vignette / 100})`);
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    }, [adjustments]);

    const applyFilter = (filter: typeof filters[0]) => {
        setAdjustments({ ...defaultAdjustments, ...filter.adjustments } as Adjustments);
    };

    const handleSave = async () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        setIsSaving(true);
        canvas.toBlob((blob) => {
            if (blob) onSave(blob);
            setIsSaving(false);
        }, 'image/jpeg', 0.92);
    };

    const SliderControl = ({ label, value, onChange, min = -100, max = 100 }: {
        label: string; value: number; onChange: (v: number) => void; min?: number; max?: number;
    }) => (
        <div className="flex items-center gap-3">
            <span className="text-white/60 text-xs w-20">{label}</span>
            <input
                type="range"
                min={min}
                max={max}
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                className="flex-1 accent-[#00D4FF] h-1"
                aria-label={`${label}: ${value}`}
            />
            <span className="text-white/40 text-xs w-8 text-right">{value}</span>
        </div>
    );

    return (
        <div className="flex flex-col h-full bg-black">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
                <button onClick={onCancel} className="text-white/60 hover:text-white text-sm">Cancel</button>
                <h2 className="text-white font-semibold">Edit Photo</h2>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="text-[#00D4FF] font-semibold text-sm hover:opacity-80 disabled:opacity-50"
                >
                    {isSaving ? 'Saving...' : 'Done'}
                </button>
            </div>

            {/* Canvas preview */}
            <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
                <canvas
                    ref={canvasRef}
                    className="max-w-full max-h-full object-contain rounded-lg"
                />
            </div>

            {/* Controls */}
            <div className="border-t border-white/10">
                {/* Tab switcher */}
                <div className="flex border-b border-white/5">
                    {(['filters', 'adjust', 'crop'] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-1 py-3 text-sm font-medium capitalize ${
                                activeTab === tab ? 'text-[#00D4FF] border-b-2 border-[#00D4FF]' : 'text-white/40'
                            }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                <div className="p-4 max-h-48 overflow-y-auto">
                    {activeTab === 'filters' && (
                        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                            {filters.map((filter) => (
                                <button
                                    key={filter.name}
                                    onClick={() => applyFilter(filter)}
                                    className="flex flex-col items-center gap-1 flex-shrink-0"
                                >
                                    <div className="w-16 h-16 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center text-xs text-white/60">
                                        {filter.name[0]}
                                    </div>
                                    <span className="text-xs text-white/60">{filter.name}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {activeTab === 'adjust' && (
                        <div className="space-y-3">
                            <SliderControl label="Brightness" value={adjustments.brightness}
                                onChange={(v) => setAdjustments(a => ({ ...a, brightness: v }))} />
                            <SliderControl label="Contrast" value={adjustments.contrast}
                                onChange={(v) => setAdjustments(a => ({ ...a, contrast: v }))} />
                            <SliderControl label="Saturation" value={adjustments.saturation}
                                onChange={(v) => setAdjustments(a => ({ ...a, saturation: v }))} />
                            <SliderControl label="Warmth" value={adjustments.warmth}
                                onChange={(v) => setAdjustments(a => ({ ...a, warmth: v }))} />
                            <SliderControl label="Vignette" value={adjustments.vignette}
                                onChange={(v) => setAdjustments(a => ({ ...a, vignette: v }))} min={0} />
                        </div>
                    )}

                    {activeTab === 'crop' && (
                        <div className="flex gap-2 flex-wrap">
                            {['free', '1:1', '4:5', '16:9', '9:16'].map((aspect) => (
                                <button
                                    key={aspect}
                                    onClick={() => setCropAspect(aspect)}
                                    className={`px-4 py-2 rounded-lg text-sm ${
                                        cropAspect === aspect
                                            ? 'bg-[#00D4FF] text-black font-semibold'
                                            : 'bg-white/10 text-white/60'
                                    }`}
                                >
                                    {aspect}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
