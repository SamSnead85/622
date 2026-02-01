'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';

// ============================================
// TYPES
// ============================================
export interface MediaDisplayProps {
    src: string;
    type?: 'image' | 'video' | 'auto';
    alt?: string;
    className?: string;
    aspectRatio?: string;
    fill?: boolean;
    width?: number;
    height?: number;
    priority?: boolean;
    showControls?: boolean;
    autoPlay?: boolean;
    muted?: boolean;
    loop?: boolean;
    onClick?: () => void;
}

// ============================================
// MEDIA DISPLAY COMPONENT
// ============================================
export function MediaDisplay({
    src,
    type = 'auto',
    alt = 'Media',
    className = '',
    aspectRatio = '16/9',
    fill = false,
    width,
    height,
    priority = false,
    showControls = true,
    autoPlay = false,
    muted = true,
    loop = false,
    onClick,
}: MediaDisplayProps) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    // Detect media type from URL
    const detectedType = type === 'auto'
        ? /\.(mp4|webm|mov)$/i.test(src) ? 'video' : 'image'
        : type;

    // Handle video play on hover
    const handleMouseEnter = () => {
        if (detectedType === 'video' && videoRef.current && !showControls) {
            videoRef.current.play();
        }
    };

    const handleMouseLeave = () => {
        if (detectedType === 'video' && videoRef.current && !showControls) {
            videoRef.current.pause();
            videoRef.current.currentTime = 0;
        }
    };

    // Reset state when src changes
    useEffect(() => {
        setLoading(true);
        setError(false);
    }, [src]);

    // Loading skeleton
    const LoadingSkeleton = () => (
        <motion.div
            className="absolute inset-0 bg-white/5"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
        />
    );

    // Error fallback
    const ErrorFallback = () => (
        <div className="absolute inset-0 bg-white/5 flex items-center justify-center">
            <div className="text-center">
                <span className="text-3xl mb-2 block">🖼️</span>
                <p className="text-white/40 text-sm">Failed to load</p>
            </div>
        </div>
    );

    // Container styles
    const containerStyle = fill
        ? {}
        : { aspectRatio, width: width || '100%', height: height || 'auto' };

    if (detectedType === 'video') {
        return (
            <div
                className={`relative overflow-hidden bg-black rounded-xl ${className}`}
                style={containerStyle}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onClick={onClick}
            >
                {loading && <LoadingSkeleton />}
                {error && <ErrorFallback />}
                <video
                    ref={videoRef}
                    src={src}
                    className={`w-full h-full object-cover transition-opacity ${loading ? 'opacity-0' : 'opacity-100'}`}
                    controls={showControls}
                    autoPlay={autoPlay}
                    muted={muted}
                    loop={loop}
                    playsInline
                    onLoadedData={() => setLoading(false)}
                    onError={() => {
                        setLoading(false);
                        setError(true);
                    }}
                />
                {/* Play icon overlay for non-controls videos */}
                {!showControls && !loading && !error && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-12 h-12 rounded-full bg-black/50 flex items-center justify-center">
                            <span className="text-white text-lg ml-1">▶</span>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Image
    return (
        <div
            className={`relative overflow-hidden bg-white/5 rounded-xl ${className}`}
            style={containerStyle}
            onClick={onClick}
        >
            {loading && <LoadingSkeleton />}
            {error && <ErrorFallback />}
            <Image
                src={src}
                alt={alt}
                fill={fill || true}
                priority={priority}
                className={`object-cover transition-opacity ${loading ? 'opacity-0' : 'opacity-100'}`}
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                onLoad={() => setLoading(false)}
                onError={() => {
                    setLoading(false);
                    setError(true);
                }}
            />
        </div>
    );
}

export default MediaDisplay;
