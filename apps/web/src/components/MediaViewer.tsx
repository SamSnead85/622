'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';

// ============================================
// CAROUSEL VIEWER
// Swipeable carousel for multiple images/videos
// ============================================

interface CarouselItem {
    type: 'image' | 'video';
    url: string;
}

interface CarouselViewerProps {
    items: CarouselItem[];
    initialIndex?: number;
    onClose?: () => void;
    showDots?: boolean;
    autoPlay?: boolean;
}

export function CarouselViewer({
    items,
    initialIndex = 0,
    onClose,
    showDots = true,
    autoPlay = false,
}: CarouselViewerProps) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const containerRef = useRef<HTMLDivElement>(null);

    const goTo = useCallback((index: number) => {
        setCurrentIndex(Math.max(0, Math.min(items.length - 1, index)));
    }, [items.length]);

    const goNext = useCallback(() => goTo(currentIndex + 1), [currentIndex, goTo]);
    const goPrev = useCallback(() => goTo(currentIndex - 1), [currentIndex, goTo]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight') goNext();
            else if (e.key === 'ArrowLeft') goPrev();
            else if (e.key === 'Escape') onClose?.();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [goNext, goPrev, onClose]);

    // Auto-play for videos
    useEffect(() => {
        if (!autoPlay) return;
        const timer = setInterval(() => {
            setCurrentIndex(prev => (prev + 1) % items.length);
        }, 5000);
        return () => clearInterval(timer);
    }, [autoPlay, items.length]);

    return (
        <div ref={containerRef} className="relative w-full h-full overflow-hidden bg-black">
            {/* Items */}
            <div
                className="flex transition-transform duration-300 h-full"
                style={{ transform: `translateX(-${currentIndex * 100}%)` }}
            >
                {items.map((item, index) => (
                    <div key={index} className="min-w-full h-full flex items-center justify-center">
                        {item.type === 'image' ? (
                            <Image
                                src={item.url}
                                alt={`Slide ${index + 1}`}
                                fill
                                className="object-contain"
                            />
                        ) : (
                            <video
                                src={item.url}
                                className="max-h-full max-w-full"
                                controls
                                autoPlay={index === currentIndex}
                                muted
                            />
                        )}
                    </div>
                ))}
            </div>

            {/* Navigation Arrows */}
            {items.length > 1 && (
                <>
                    {currentIndex > 0 && (
                        <button
                            onClick={goPrev}
                            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/70 transition-colors"
                        >
                            ←
                        </button>
                    )}
                    {currentIndex < items.length - 1 && (
                        <button
                            onClick={goNext}
                            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/70 transition-colors"
                        >
                            →
                        </button>
                    )}
                </>
            )}

            {/* Dots */}
            {showDots && items.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                    {items.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => goTo(index)}
                            className={`w-2 h-2 rounded-full transition-colors ${index === currentIndex ? 'bg-white' : 'bg-white/40'
                                }`}
                        />
                    ))}
                </div>
            )}

            {/* Close Button */}
            {onClose && (
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/70 transition-colors"
                >
                    ✕
                </button>
            )}
        </div>
    );
}

// ============================================
// IMAGE ZOOM
// Pinch-to-zoom and pan for images
// ============================================

interface ImageZoomProps {
    src: string;
    alt?: string;
    className?: string;
}

export function ImageZoom({ src, alt = 'Image', className = '' }: ImageZoomProps) {
    const [isZoomed, setIsZoomed] = useState(false);
    const scale = useMotionValue(1);
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const handleDoubleTap = useCallback(() => {
        if (isZoomed) {
            scale.set(1);
            x.set(0);
            y.set(0);
            setIsZoomed(false);
        } else {
            scale.set(2);
            setIsZoomed(true);
        }
    }, [isZoomed, scale, x, y]);

    return (
        <motion.div
            className={`overflow-hidden cursor-zoom-in ${className}`}
            onDoubleClick={handleDoubleTap}
        >
            <motion.div
                style={{ scale, x, y }}
                drag={isZoomed}
                dragConstraints={{ left: -200, right: 200, top: -200, bottom: 200 }}
                dragElastic={0.1}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
                <Image
                    src={src}
                    alt={alt}
                    fill
                    className="object-contain"
                />
            </motion.div>

            {isZoomed && (
                <button
                    onClick={() => {
                        scale.set(1);
                        x.set(0);
                        y.set(0);
                        setIsZoomed(false);
                    }}
                    className="absolute top-4 right-4 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-sm text-white text-sm"
                >
                    Reset Zoom
                </button>
            )}
        </motion.div>
    );
}

// ============================================
// CONTENT REPORT MODAL
// Flag/report inappropriate content
// ============================================

interface ContentReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    contentId: string;
    contentType: 'post' | 'comment' | 'user' | 'message';
    onSubmit: (reason: string, details: string) => void;
}

const REPORT_REASONS = [
    { id: 'spam', label: 'Spam or misleading', emoji: '🚫' },
    { id: 'harassment', label: 'Harassment or bullying', emoji: '😠' },
    { id: 'hate', label: 'Hate speech or discrimination', emoji: '⚠️' },
    { id: 'violence', label: 'Violence or dangerous content', emoji: '🔴' },
    { id: 'nudity', label: 'Nudity or sexual content', emoji: '🔞' },
    { id: 'misinformation', label: 'False information', emoji: '📰' },
    { id: 'scam', label: 'Scam or fraud', emoji: '💰' },
    { id: 'other', label: 'Other', emoji: '📝' },
];

export function ContentReportModal({
    isOpen,
    onClose,
    contentId,
    contentType,
    onSubmit,
}: ContentReportModalProps) {
    const [selectedReason, setSelectedReason] = useState('');
    const [details, setDetails] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = useCallback(async () => {
        if (!selectedReason) return;
        setIsSubmitting(true);
        await onSubmit(selectedReason, details);
        setIsSubmitting(false);
        setSelectedReason('');
        setDetails('');
        onClose();
    }, [selectedReason, details, onSubmit, onClose]);

    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-[#1A1A1F] rounded-2xl w-full max-w-md border border-white/10 max-h-[80vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-6 border-b border-white/10">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        🚩 Report {contentType}
                    </h3>
                    <p className="text-sm text-white/50 mt-1">
                        Help us understand why you&apos;re reporting this content
                    </p>
                </div>

                <div className="p-6 space-y-4 overflow-y-auto max-h-[50vh]">
                    {REPORT_REASONS.map((reason) => (
                        <label
                            key={reason.id}
                            className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${selectedReason === reason.id
                                    ? 'bg-[#7C8FFF]/10 border border-[#7C8FFF]/30'
                                    : 'bg-white/5 border border-transparent hover:bg-white/10'
                                }`}
                        >
                            <input
                                type="radio"
                                name="reason"
                                value={reason.id}
                                checked={selectedReason === reason.id}
                                onChange={() => setSelectedReason(reason.id)}
                                className="sr-only"
                            />
                            <span className="text-lg">{reason.emoji}</span>
                            <span className="text-white">{reason.label}</span>
                        </label>
                    ))}

                    {selectedReason && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                        >
                            <textarea
                                value={details}
                                onChange={(e) => setDetails(e.target.value)}
                                placeholder="Add more details (optional)"
                                className="w-full h-24 bg-white/5 border border-white/10 rounded-xl p-4 text-white placeholder:text-white/40 resize-none focus:outline-none focus:border-[#7C8FFF]/50"
                            />
                        </motion.div>
                    )}
                </div>

                <div className="p-6 pt-0 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 rounded-xl bg-white/10 text-white font-medium hover:bg-white/15 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!selectedReason || isSubmitting}
                        className="flex-1 py-3 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
                    >
                        {isSubmitting ? 'Submitting...' : 'Submit Report'}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}
