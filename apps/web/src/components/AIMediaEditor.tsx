'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

// ============================================
// TYPES
// ============================================
type MediaType = 'image' | 'video';
type FilterType = 'none' | 'vivid' | 'warm' | 'cool' | 'noir' | 'vintage' | 'dramatic' | 'fade';

interface AIEdit {
    id: string;
    label: string;
    icon: string;
    description: string;
    processing?: boolean;
}

interface MediaEditorProps {
    file: File | null;
    mediaUrl: string | null;
    mediaType: MediaType;
    onSave: (editedUrl: string, edits: object) => void;
    onClose: () => void;
}

// ============================================
// FILTER DEFINITIONS
// ============================================
const FILTERS: { id: FilterType; label: string; css: string; icon: string }[] = [
    { id: 'none', label: 'Original', css: '', icon: '○' },
    { id: 'vivid', label: 'Vivid', css: 'saturate(1.3) contrast(1.1)', icon: '🌈' },
    { id: 'warm', label: 'Warm', css: 'sepia(0.2) saturate(1.2) hue-rotate(-10deg)', icon: '🌅' },
    { id: 'cool', label: 'Cool', css: 'saturate(0.9) hue-rotate(20deg) brightness(1.05)', icon: '❄️' },
    { id: 'noir', label: 'Noir', css: 'grayscale(1) contrast(1.2)', icon: '🎬' },
    { id: 'vintage', label: 'Vintage', css: 'sepia(0.4) contrast(0.9) brightness(1.1)', icon: '📷' },
    { id: 'dramatic', label: 'Drama', css: 'contrast(1.3) brightness(0.95) saturate(1.1)', icon: '🎭' },
    { id: 'fade', label: 'Fade', css: 'contrast(0.9) brightness(1.1) saturate(0.8)', icon: '🌫️' },
];

// ============================================
// AI EDITING OPTIONS
// ============================================
const AI_EDITS: AIEdit[] = [
    { id: 'enhance', label: 'AI Enhance', icon: '✨', description: 'Auto-improve lighting, colors, and sharpness' },
    { id: 'background', label: 'Remove BG', icon: '🪄', description: 'Remove or blur background' },
    { id: 'retouch', label: 'AI Retouch', icon: '💫', description: 'Smooth skin, remove blemishes' },
    { id: 'upscale', label: 'Upscale 4x', icon: '🔍', description: 'Increase resolution with AI' },
    { id: 'colorize', label: 'Colorize', icon: '🎨', description: 'Add color to B&W photos' },
    { id: 'caption', label: 'AI Caption', icon: '💬', description: 'Generate smart captions' },
];

// ============================================
// ADJUSTMENT SLIDER
// ============================================
function AdjustmentSlider({
    label,
    icon,
    value,
    onChange,
    min = -100,
    max = 100,
}: {
    label: string;
    icon: string;
    value: number;
    onChange: (v: number) => void;
    min?: number;
    max?: number;
}) {
    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-white/70">
                    <span>{icon}</span>
                    {label}
                </span>
                <span className="text-white/50 font-mono text-xs">{value > 0 ? `+${value}` : value}</span>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                value={value}
                onChange={(e) => onChange(parseInt(e.target.value))}
                className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer
                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 
                    [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-lg
                    [&::-webkit-slider-thumb]:hover:scale-110 [&::-webkit-slider-thumb]:transition-transform"
            />
        </div>
    );
}

// ============================================
// AI MEDIA EDITOR COMPONENT
// ============================================
export function AIMediaEditor({ mediaUrl, mediaType, onSave, onClose }: MediaEditorProps) {
    const [activeTab, setActiveTab] = useState<'filters' | 'adjust' | 'ai' | 'crop'>('filters');
    const [selectedFilter, setSelectedFilter] = useState<FilterType>('none');
    const [adjustments, setAdjustments] = useState({
        brightness: 0,
        contrast: 0,
        saturation: 0,
        warmth: 0,
        sharpen: 0,
        vignette: 0,
    });
    const [aiProcessing, setAiProcessing] = useState<string | null>(null);
    const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        // Simulate AI analysis
        setTimeout(() => {
            setAiSuggestions(['Try Vivid filter for more pop', 'Increase brightness +15', 'This would look great as a Journey']);
        }, 1500);
    }, []);

    // Generate CSS filter string from adjustments
    const getAdjustmentFilter = useCallback(() => {
        const b = 100 + adjustments.brightness;
        const c = 100 + adjustments.contrast;
        const s = 100 + adjustments.saturation;
        const warmth = adjustments.warmth;

        let filter = `brightness(${b / 100}) contrast(${c / 100}) saturate(${s / 100})`;
        if (warmth !== 0) {
            filter += ` sepia(${Math.abs(warmth) / 200}) hue-rotate(${warmth > 0 ? -10 : 10}deg)`;
        }
        return filter;
    }, [adjustments]);

    // Combined filter
    const combinedFilter = () => {
        const filterDef = FILTERS.find(f => f.id === selectedFilter);
        const baseFilter = filterDef?.css || '';
        const adjFilter = getAdjustmentFilter();
        return `${baseFilter} ${adjFilter}`.trim();
    };

    // Handle AI edit
    const handleAIEdit = async (editId: string) => {
        setAiProcessing(editId);

        // Simulate AI processing
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Apply mock results
        switch (editId) {
            case 'enhance':
                setAdjustments(prev => ({
                    ...prev,
                    brightness: 10,
                    contrast: 8,
                    saturation: 12,
                    sharpen: 15,
                }));
                break;
            case 'retouch':
                // Would apply face smoothing in production
                setAdjustments(prev => ({ ...prev, contrast: -5, brightness: 5 }));
                break;
        }

        setAiProcessing(null);
    };

    // Save edited media
    const handleSave = () => {
        const edits = {
            filter: selectedFilter,
            adjustments,
        };
        onSave(mediaUrl || '', edits);
    };

    if (!mounted || !mediaUrl) return null;

    const tabs = [
        { id: 'filters', icon: '🎨', label: 'Filters' },
        { id: 'adjust', icon: '⚙️', label: 'Adjust' },
        { id: 'ai', icon: '✨', label: 'AI Magic' },
        { id: 'crop', icon: '📐', label: 'Crop' },
    ] as const;

    return (
        <motion.div
            className="fixed inset-0 z-50 bg-black/95 flex flex-col"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            {/* Header */}
            <header className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                <button onClick={onClose} className="text-white/70 hover:text-white transition-colors px-3 py-2">
                    Cancel
                </button>
                <h1 className="font-semibold text-white">Edit</h1>
                <button
                    onClick={handleSave}
                    className="px-4 py-2 rounded-full bg-gradient-to-r from-orange-400 via-rose-500 to-violet-500 text-white font-semibold text-sm"
                >
                    Done
                </button>
            </header>

            {/* AI Suggestions Banner */}
            <AnimatePresence>
                {aiSuggestions.length > 0 && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="px-4 py-3 bg-gradient-to-r from-violet-500/20 to-cyan-500/20 border-b border-white/5">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-sm">💡</span>
                                <span className="text-xs font-medium text-white/80">AI Suggestions</span>
                                <button
                                    onClick={() => setAiSuggestions([])}
                                    className="ml-auto text-white/40 hover:text-white/60 text-xs"
                                >
                                    Dismiss
                                </button>
                            </div>
                            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                                {aiSuggestions.map((suggestion, i) => (
                                    <button
                                        key={i}
                                        className="flex-shrink-0 px-3 py-1.5 rounded-full bg-white/10 text-xs text-white/80 hover:bg-white/20 transition-colors"
                                    >
                                        {suggestion}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Media Preview */}
            <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
                <div className="relative max-w-full max-h-full">
                    {mediaType === 'image' ? (
                        <div
                            className="relative rounded-2xl overflow-hidden shadow-2xl"
                            style={{ filter: combinedFilter() }}
                        >
                            <Image
                                src={mediaUrl}
                                alt="Edit preview"
                                width={600}
                                height={800}
                                className="max-h-[60vh] w-auto object-contain"
                                priority
                            />
                            {/* Vignette overlay */}
                            {adjustments.vignette !== 0 && (
                                <div
                                    className="absolute inset-0 pointer-events-none"
                                    style={{
                                        background: `radial-gradient(circle, transparent ${100 - adjustments.vignette}%, rgba(0,0,0,0.8))`,
                                    }}
                                />
                            )}
                        </div>
                    ) : (
                        <video
                            src={mediaUrl}
                            controls
                            className="max-h-[60vh] rounded-2xl"
                            style={{ filter: combinedFilter() }}
                        />
                    )}

                    {/* AI Processing Overlay */}
                    <AnimatePresence>
                        {aiProcessing && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 bg-black/70 rounded-2xl flex flex-col items-center justify-center"
                            >
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                    className="w-12 h-12 border-2 border-violet-500 border-t-transparent rounded-full mb-4"
                                />
                                <p className="text-white font-medium">AI Processing...</p>
                                <p className="text-white/50 text-sm mt-1">
                                    {AI_EDITS.find(e => e.id === aiProcessing)?.label}
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
                <canvas ref={canvasRef} className="hidden" />
            </div>

            {/* Tab Navigation */}
            <div className="flex border-t border-white/10">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${activeTab === tab.id
                            ? 'text-white bg-white/5'
                            : 'text-white/50 hover:text-white/70'
                            }`}
                    >
                        <span className="text-lg">{tab.icon}</span>
                        <span className="text-xs">{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="p-4 border-t border-white/10 bg-[#0a0a0f] min-h-[200px] max-h-[30vh] overflow-y-auto">
                <AnimatePresence mode="wait">
                    {/* Filters Tab */}
                    {activeTab === 'filters' && (
                        <motion.div
                            key="filters"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide scroll-x"
                        >
                            {FILTERS.map((filter) => (
                                <button
                                    key={filter.id}
                                    onClick={() => setSelectedFilter(filter.id)}
                                    className={`flex flex-col items-center gap-2 flex-shrink-0 ${selectedFilter === filter.id ? 'text-white' : 'text-white/50'
                                        }`}
                                >
                                    <div
                                        className={`w-16 h-16 rounded-xl overflow-hidden ring-2 transition-all ${selectedFilter === filter.id
                                            ? 'ring-white ring-offset-2 ring-offset-[#0a0a0f]'
                                            : 'ring-transparent'
                                            }`}
                                    >
                                        {mediaUrl && (
                                            <Image
                                                src={mediaUrl}
                                                alt={filter.label}
                                                width={64}
                                                height={64}
                                                className="w-full h-full object-cover"
                                                style={{ filter: filter.css }}
                                            />
                                        )}
                                    </div>
                                    <span className="text-xs">{filter.label}</span>
                                </button>
                            ))}
                        </motion.div>
                    )}

                    {/* Adjustments Tab */}
                    {activeTab === 'adjust' && (
                        <motion.div
                            key="adjust"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-4"
                        >
                            <AdjustmentSlider
                                label="Brightness"
                                icon="☀️"
                                value={adjustments.brightness}
                                onChange={(v) => setAdjustments(prev => ({ ...prev, brightness: v }))}
                            />
                            <AdjustmentSlider
                                label="Contrast"
                                icon="◐"
                                value={adjustments.contrast}
                                onChange={(v) => setAdjustments(prev => ({ ...prev, contrast: v }))}
                            />
                            <AdjustmentSlider
                                label="Saturation"
                                icon="🎨"
                                value={adjustments.saturation}
                                onChange={(v) => setAdjustments(prev => ({ ...prev, saturation: v }))}
                            />
                            <AdjustmentSlider
                                label="Warmth"
                                icon="🌡️"
                                value={adjustments.warmth}
                                onChange={(v) => setAdjustments(prev => ({ ...prev, warmth: v }))}
                            />
                            <AdjustmentSlider
                                label="Sharpen"
                                icon="🔪"
                                value={adjustments.sharpen}
                                min={0}
                                max={100}
                                onChange={(v) => setAdjustments(prev => ({ ...prev, sharpen: v }))}
                            />
                            <AdjustmentSlider
                                label="Vignette"
                                icon="⚫"
                                value={adjustments.vignette}
                                min={0}
                                max={100}
                                onChange={(v) => setAdjustments(prev => ({ ...prev, vignette: v }))}
                            />
                        </motion.div>
                    )}

                    {/* AI Magic Tab */}
                    {activeTab === 'ai' && (
                        <motion.div
                            key="ai"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="grid grid-cols-2 md:grid-cols-3 gap-3"
                        >
                            {AI_EDITS.map((edit) => (
                                <button
                                    key={edit.id}
                                    onClick={() => handleAIEdit(edit.id)}
                                    disabled={!!aiProcessing}
                                    className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/10 transition-all disabled:opacity-50"
                                >
                                    <span className="text-2xl">{edit.icon}</span>
                                    <span className="text-sm font-medium text-white">{edit.label}</span>
                                    <span className="text-[10px] text-white/50 text-center line-clamp-2">{edit.description}</span>
                                </button>
                            ))}
                        </motion.div>
                    )}

                    {/* Crop Tab */}
                    {activeTab === 'crop' && (
                        <motion.div
                            key="crop"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide"
                        >
                            {[
                                { id: 'free', label: 'Free', icon: '⬜' },
                                { id: '1:1', label: '1:1', icon: '⏹️' },
                                { id: '4:5', label: '4:5', icon: '📱' },
                                { id: '16:9', label: '16:9', icon: '📺' },
                                { id: '9:16', label: '9:16', icon: '📲' },
                            ].map((ratio) => (
                                <button
                                    key={ratio.id}
                                    className="flex flex-col items-center gap-2 px-6 py-3 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all"
                                >
                                    <span className="text-xl">{ratio.icon}</span>
                                    <span className="text-xs text-white/70">{ratio.label}</span>
                                </button>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}

export default AIMediaEditor;
