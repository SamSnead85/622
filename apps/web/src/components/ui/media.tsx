'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ReactNode, useState, useRef, useEffect, useCallback } from 'react';

// ============================================
// MEDIA COMPONENTS
// ZeroG Silk Road Renaissance Media Players
// ============================================

// ============================================
// VIDEO PLAYER
// Custom video player with controls
// ============================================

interface VideoPlayerProps {
    src: string;
    poster?: string;
    autoPlay?: boolean;
    muted?: boolean;
    loop?: boolean;
    onEnded?: () => void;
    className?: string;
}

export function VideoPlayer({
    src,
    poster,
    autoPlay = false,
    muted = false,
    loop = false,
    onEnded,
    className = '',
}: VideoPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(autoPlay);
    const [isMuted, setIsMuted] = useState(muted);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const controlsTimeoutRef = useRef<NodeJS.Timeout>();

    const togglePlay = () => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
            } else {
                videoRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const toggleMute = () => {
        if (videoRef.current) {
            videoRef.current.muted = !isMuted;
            setIsMuted(!isMuted);
        }
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const time = Number(e.target.value);
        if (videoRef.current) {
            videoRef.current.currentTime = time;
            setCurrentTime(time);
        }
    };

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const vol = Number(e.target.value);
        if (videoRef.current) {
            videoRef.current.volume = vol;
            setVolume(vol);
            setIsMuted(vol === 0);
        }
    };

    const toggleFullscreen = () => {
        if (videoRef.current?.parentElement) {
            if (!document.fullscreenElement) {
                videoRef.current.parentElement.requestFullscreen();
                setIsFullscreen(true);
            } else {
                document.exitFullscreen();
                setIsFullscreen(false);
            }
        }
    };

    const formatTime = (time: number) => {
        const mins = Math.floor(time / 60);
        const secs = Math.floor(time % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleMouseMove = () => {
        setShowControls(true);
        if (controlsTimeoutRef.current) {
            clearTimeout(controlsTimeoutRef.current);
        }
        if (isPlaying) {
            controlsTimeoutRef.current = setTimeout(() => {
                setShowControls(false);
            }, 3000);
        }
    };

    useEffect(() => {
        return () => {
            if (controlsTimeoutRef.current) {
                clearTimeout(controlsTimeoutRef.current);
            }
        };
    }, []);

    return (
        <div
            className={`relative bg-black rounded-xl overflow-hidden group ${className}`}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => isPlaying && setShowControls(false)}
        >
            <video
                ref={videoRef}
                src={src}
                poster={poster}
                autoPlay={autoPlay}
                muted={muted}
                loop={loop}
                onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
                onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
                onEnded={onEnded}
                onClick={togglePlay}
                className="w-full h-full object-contain cursor-pointer"
            />

            {/* Play/Pause Overlay */}
            <AnimatePresence>
                {!isPlaying && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 flex items-center justify-center bg-black/30"
                    >
                        <button
                            onClick={togglePlay}
                            className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"
                        >
                            <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" />
                            </svg>
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Controls */}
            <AnimatePresence>
                {showControls && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent"
                    >
                        {/* Progress Bar */}
                        <div className="relative h-1 bg-white/20 rounded-full mb-3 cursor-pointer">
                            <div
                                className="absolute h-full bg-violet-500 rounded-full"
                                style={{ width: `${(currentTime / duration) * 100}%` }}
                            />
                            <input
                                type="range"
                                min="0"
                                max={duration}
                                value={currentTime}
                                onChange={handleSeek}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                        </div>

                        <div className="flex items-center gap-4">
                            <button onClick={togglePlay} className="text-white">
                                {isPlaying ? (
                                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                                    </svg>
                                ) : (
                                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M8 5v14l11-7z" />
                                    </svg>
                                )}
                            </button>

                            <div className="flex items-center gap-2 group/volume">
                                <button onClick={toggleMute} className="text-white">
                                    {isMuted ? (
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                                        </svg>
                                    ) : (
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                                        </svg>
                                    )}
                                </button>
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.1"
                                    value={volume}
                                    onChange={handleVolumeChange}
                                    className="w-0 group-hover/volume:w-20 transition-all"
                                />
                            </div>

                            <span className="text-white/60 text-sm">
                                {formatTime(currentTime)} / {formatTime(duration)}
                            </span>

                            <div className="flex-1" />

                            <button onClick={toggleFullscreen} className="text-white">
                                {isFullscreen ? (
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
                                    </svg>
                                ) : (
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ============================================
// AUDIO PLAYER
// Custom audio player with waveform
// ============================================

interface AudioPlayerProps {
    src: string;
    title?: string;
    artist?: string;
    cover?: string;
    onEnded?: () => void;
    className?: string;
}

export function AudioPlayer({
    src,
    title,
    artist,
    cover,
    onEnded,
    className = '',
}: AudioPlayerProps) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    const togglePlay = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const time = Number(e.target.value);
        if (audioRef.current) {
            audioRef.current.currentTime = time;
            setCurrentTime(time);
        }
    };

    const formatTime = (time: number) => {
        const mins = Math.floor(time / 60);
        const secs = Math.floor(time % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className={`flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-2xl ${className}`}>
            <audio
                ref={audioRef}
                src={src}
                onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
                onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
                onEnded={onEnded}
            />

            {cover && (
                <motion.div
                    animate={{ rotate: isPlaying ? 360 : 0 }}
                    transition={{ duration: 3, repeat: isPlaying ? Infinity : 0, ease: 'linear' }}
                    className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-500 to-rose-500 p-0.5 shrink-0"
                >
                    <div className="w-full h-full rounded-full overflow-hidden">
                        <img src={cover} alt="" className="w-full h-full object-cover" />
                    </div>
                </motion.div>
            )}

            <div className="flex-1 min-w-0">
                {(title || artist) && (
                    <div className="mb-2">
                        {title && <p className="font-medium text-white truncate">{title}</p>}
                        {artist && <p className="text-sm text-white/50 truncate">{artist}</p>}
                    </div>
                )}

                <div className="flex items-center gap-3">
                    <button
                        onClick={togglePlay}
                        className="w-10 h-10 rounded-full bg-violet-500 flex items-center justify-center text-white shrink-0"
                    >
                        {isPlaying ? (
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                            </svg>
                        ) : (
                            <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" />
                            </svg>
                        )}
                    </button>

                    <div className="flex-1">
                        <div className="relative h-2 bg-white/10 rounded-full">
                            <div
                                className="absolute h-full bg-gradient-to-r from-violet-500 to-rose-500 rounded-full"
                                style={{ width: `${(currentTime / duration) * 100}%` }}
                            />
                            <input
                                type="range"
                                min="0"
                                max={duration || 0}
                                value={currentTime}
                                onChange={handleSeek}
                                className="absolute inset-0 w-full opacity-0 cursor-pointer"
                            />
                        </div>
                        <div className="flex justify-between mt-1 text-xs text-white/40">
                            <span>{formatTime(currentTime)}</span>
                            <span>{formatTime(duration)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ============================================
// IMAGE GALLERY
// Lightbox image gallery
// ============================================

interface GalleryImage {
    src: string;
    alt?: string;
    caption?: string;
}

interface ImageGalleryProps {
    images: GalleryImage[];
    columns?: number;
    gap?: number;
    className?: string;
}

export function ImageGallery({
    images,
    columns = 3,
    gap = 8,
    className = '',
}: ImageGalleryProps) {
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

    const handlePrev = useCallback(() => {
        if (selectedIndex !== null) {
            setSelectedIndex(selectedIndex > 0 ? selectedIndex - 1 : images.length - 1);
        }
    }, [selectedIndex, images.length]);

    const handleNext = useCallback(() => {
        if (selectedIndex !== null) {
            setSelectedIndex(selectedIndex < images.length - 1 ? selectedIndex + 1 : 0);
        }
    }, [selectedIndex, images.length]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (selectedIndex === null) return;
            if (e.key === 'ArrowLeft') handlePrev();
            if (e.key === 'ArrowRight') handleNext();
            if (e.key === 'Escape') setSelectedIndex(null);
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedIndex, handlePrev, handleNext]);

    return (
        <>
            <div
                className={`grid ${className}`}
                style={{
                    gridTemplateColumns: `repeat(${columns}, 1fr)`,
                    gap,
                }}
            >
                {images.map((image, i) => (
                    <motion.button
                        key={i}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedIndex(i)}
                        className="relative aspect-square rounded-xl overflow-hidden bg-white/5"
                    >
                        <img
                            src={image.src}
                            alt={image.alt || ''}
                            className="w-full h-full object-cover"
                        />
                    </motion.button>
                ))}
            </div>

            {/* Lightbox */}
            <AnimatePresence>
                {selectedIndex !== null && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center"
                        onClick={() => setSelectedIndex(null)}
                    >
                        <button
                            onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                            className="absolute left-4 w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20"
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>

                        <motion.img
                            key={selectedIndex}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            src={images[selectedIndex].src}
                            alt={images[selectedIndex].alt || ''}
                            className="max-w-[90vw] max-h-[90vh] object-contain rounded-xl"
                            onClick={(e) => e.stopPropagation()}
                        />

                        <button
                            onClick={(e) => { e.stopPropagation(); handleNext(); }}
                            className="absolute right-4 w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20"
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>

                        <button
                            onClick={() => setSelectedIndex(null)}
                            className="absolute top-4 right-4 w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20"
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>

                        {images[selectedIndex].caption && (
                            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white text-center">
                                <p>{images[selectedIndex].caption}</p>
                                <p className="text-sm text-white/50 mt-1">
                                    {selectedIndex + 1} / {images.length}
                                </p>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}

// ============================================
// CAROUSEL
// Swipeable content carousel
// ============================================

interface CarouselProps {
    children: ReactNode[];
    autoPlay?: boolean;
    interval?: number;
    showDots?: boolean;
    showArrows?: boolean;
    className?: string;
}

export function Carousel({
    children,
    autoPlay = false,
    interval = 5000,
    showDots = true,
    showArrows = true,
    className = '',
}: CarouselProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const intervalRef = useRef<NodeJS.Timeout>();

    const goTo = (index: number) => {
        setCurrentIndex(index);
    };

    const goToPrev = () => {
        setCurrentIndex(i => (i > 0 ? i - 1 : children.length - 1));
    };

    const goToNext = useCallback(() => {
        setCurrentIndex(i => (i < children.length - 1 ? i + 1 : 0));
    }, [children.length]);

    useEffect(() => {
        if (autoPlay) {
            intervalRef.current = setInterval(goToNext, interval);
            return () => clearInterval(intervalRef.current);
        }
    }, [autoPlay, interval, goToNext]);

    return (
        <div className={`relative overflow-hidden ${className}`}>
            <motion.div
                className="flex"
                animate={{ x: `-${currentIndex * 100}%` }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
                {children.map((child, i) => (
                    <div key={i} className="w-full shrink-0">
                        {child}
                    </div>
                ))}
            </motion.div>

            {showArrows && children.length > 1 && (
                <>
                    <button
                        onClick={goToPrev}
                        className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <button
                        onClick={goToNext}
                        className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </>
            )}

            {showDots && children.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                    {children.map((_, i) => (
                        <button
                            key={i}
                            onClick={() => goTo(i)}
                            className={`
                                w-2 h-2 rounded-full transition-all
                                ${i === currentIndex
                                    ? 'bg-white w-6'
                                    : 'bg-white/30 hover:bg-white/50'}
                            `}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// ============================================
// AVATAR STACK
// Overlapping avatar group
// ============================================

interface AvatarStackProps {
    avatars: { src?: string; name: string }[];
    max?: number;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

export function AvatarStack({
    avatars,
    max = 4,
    size = 'md',
    className = '',
}: AvatarStackProps) {
    const displayAvatars = avatars.slice(0, max);
    const remaining = avatars.length - max;

    const sizes = {
        sm: 'w-6 h-6 text-xs -ml-2',
        md: 'w-8 h-8 text-sm -ml-2.5',
        lg: 'w-10 h-10 text-base -ml-3',
    };

    return (
        <div className={`flex ${className}`}>
            {displayAvatars.map((avatar, i) => (
                <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={`
                        ${sizes[size]}
                        ${i === 0 ? 'ml-0' : ''}
                        rounded-full border-2 border-[#0a0a12] bg-gradient-to-br from-violet-500 to-rose-500 flex items-center justify-center overflow-hidden
                    `}
                >
                    {avatar.src ? (
                        <img src={avatar.src} alt={avatar.name} className="w-full h-full object-cover" />
                    ) : (
                        <span className="text-white font-medium">{avatar.name.charAt(0)}</span>
                    )}
                </motion.div>
            ))}

            {remaining > 0 && (
                <div className={`
                    ${sizes[size]}
                    rounded-full border-2 border-[#0a0a12] bg-white/10 flex items-center justify-center text-white/60
                `}>
                    +{remaining}
                </div>
            )}
        </div>
    );
}

// ============================================
// EXPORTS
// ============================================

export {
    type VideoPlayerProps,
    type AudioPlayerProps,
    type GalleryImage,
    type ImageGalleryProps,
    type CarouselProps,
    type AvatarStackProps,
};
