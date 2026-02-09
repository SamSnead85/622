'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================
// YOUTUBE EMBED HELPER - Detect and render YouTube videos natively
// ============================================
export function isYouTubeUrl(url: string): boolean {
    return url.includes('youtube.com') || url.includes('youtube-nocookie.com') || url.includes('youtu.be');
}

export function getYouTubeEmbedUrl(url: string): string {
    // If already an embed URL, return as-is with extra params
    if (url.includes('/embed/')) {
        if (!url.includes('modestbranding')) {
            return url + (url.includes('?') ? '&' : '?') + 'modestbranding=1&rel=0&showinfo=0&autoplay=1&mute=1';
        }
        return url.replace('autoplay=0', 'autoplay=1') + '&mute=1';
    }
    // Extract video ID from various YouTube URL formats
    let videoId = '';
    if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1]?.split('?')[0] || '';
    } else if (url.includes('/shorts/')) {
        // Handle YouTube Shorts URLs
        videoId = url.split('/shorts/')[1]?.split('?')[0] || '';
    } else if (url.includes('watch?v=')) {
        videoId = url.split('watch?v=')[1]?.split('&')[0] || '';
    }
    if (videoId) {
        return `https://www.youtube-nocookie.com/embed/${videoId}?modestbranding=1&rel=0&showinfo=0&autoplay=1&mute=1&controls=1`;
    }
    return url;
}

export function YouTubeEmbed({ src }: { src: string }) {
    const embedUrl = getYouTubeEmbedUrl(src);
    return (
        <div className="relative w-full aspect-video bg-black">
            <iframe
                src={embedUrl}
                className="absolute inset-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                frameBorder="0"
                title="Video"
            />
        </div>
    );
}

// ============================================
// AUTOPLAY VIDEO - TikTok/Instagram style (plays when in view)
// ============================================
export function AutoPlayVideo({ src, className = '' }: { src: string; className?: string }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false); // Start unmuted - TikTok style
    const [progress, setProgress] = useState(0);
    const [showControls, setShowControls] = useState(false);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        // Update progress bar
        const handleTimeUpdate = () => {
            if (video.duration) {
                setProgress((video.currentTime / video.duration) * 100);
            }
        };

        video.addEventListener('timeupdate', handleTimeUpdate);

        // Intersection Observer for autoplay when in view
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
                        // TikTok-style: Try to play with sound first
                        video.muted = false;
                        video.play()
                            .then(() => {
                                // Successfully playing with sound
                                setIsMuted(false);
                                setIsPlaying(true);
                            })
                            .catch(() => {
                                // Browser blocked autoplay with sound, fallback to muted
                                console.log('Autoplay with sound blocked, playing muted');
                                video.muted = true;
                                setIsMuted(true);
                                video.play()
                                    .then(() => setIsPlaying(true))
                                    .catch(() => {
                                        console.log('Autoplay completely blocked');
                                    });
                            });
                    } else {
                        video.pause();
                        setIsPlaying(false);
                    }
                });
            },
            {
                threshold: 0.5,
            }
        );

        observer.observe(video);

        return () => {
            observer.disconnect();
            video.removeEventListener('timeupdate', handleTimeUpdate);
        };
    }, []);

    const toggleMute = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        if (videoRef.current) {
            videoRef.current.muted = !videoRef.current.muted;
            setIsMuted(!isMuted);
        }
    }, [isMuted]);

    const togglePlay = useCallback(() => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
            } else {
                videoRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    }, [isPlaying]);

    const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (videoRef.current) {
            const rect = e.currentTarget.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            videoRef.current.currentTime = percent * videoRef.current.duration;
        }
    }, []);

    return (
        <div
            className="relative group"
            onMouseEnter={() => setShowControls(true)}
            onMouseLeave={() => setShowControls(false)}
        >
            <video
                ref={videoRef}
                src={src}
                className={`w-full max-h-[600px] object-contain bg-black ${className}`}
                loop
                muted={isMuted}
                playsInline
                preload="metadata"
            />
            {/* Play/Pause Overlay */}
            <div
                className="absolute inset-0 flex items-center justify-center cursor-pointer"
                onClick={togglePlay}
            >
                <AnimatePresence>
                    {!isPlaying && (
                        <motion.div
                            className="w-16 h-16 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center border border-white/20"
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                        >
                            <span className="text-3xl ml-1">▶️</span>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Controls Overlay - Bottom */}
            <motion.div
                className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent"
                initial={false}
                animate={{ opacity: showControls || !isPlaying ? 1 : 0 }}
                transition={{ duration: 0.2 }}
            >
                {/* Progress Bar - Clickable */}
                <div
                    className="w-full h-1.5 bg-white/20 rounded-full cursor-pointer mb-2 group/progress"
                    onClick={handleSeek}
                >
                    <motion.div
                        className="h-full bg-gradient-to-r from-[#D4AF37] to-[#B8942D] rounded-full relative"
                        style={{ width: `${progress}%` }}
                    >
                        {/* Scrubber Handle */}
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-md opacity-0 group-hover/progress:opacity-100 transition-opacity" />
                    </motion.div>
                </div>

                {/* Control Buttons */}
                <div className="flex items-center justify-between">
                    <button
                        onClick={toggleMute}
                        className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                    >
                        <span className="text-lg">{isMuted ? '🔇' : '🔊'}</span>
                    </button>
                    <span className="text-xs text-white/60 font-medium">
                        {videoRef.current ? `${Math.floor(videoRef.current.currentTime)}s` : '0s'}
                    </span>
                </div>
            </motion.div>
        </div>
    );
}
