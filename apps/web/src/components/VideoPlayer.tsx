'use client';

import React, { useRef, useCallback, useState, useEffect } from 'react';
import { motion } from 'framer-motion';

// ============================================
// PICTURE-IN-PICTURE VIDEO PLAYER
// Video with PiP support and playback controls
// ============================================

interface PiPVideoPlayerProps {
    src: string;
    poster?: string;
    className?: string;
    autoPlay?: boolean;
    muted?: boolean;
    controls?: boolean;
}

export function PiPVideoPlayer({
    src,
    poster,
    className = '',
    autoPlay = false,
    muted = true,
    controls = true,
}: PiPVideoPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isPiP, setIsPiP] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [showControls, setShowControls] = useState(false);

    // Check if PiP is supported
    const isPiPSupported = typeof document !== 'undefined' && 'pictureInPictureEnabled' in document;

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleLoadedMetadata = () => {
            setDuration(video.duration);
        };

        const handleTimeUpdate = () => {
            setProgress((video.currentTime / video.duration) * 100);
        };

        const handleEnterPiP = () => setIsPiP(true);
        const handleLeavePiP = () => setIsPiP(false);

        video.addEventListener('loadedmetadata', handleLoadedMetadata);
        video.addEventListener('timeupdate', handleTimeUpdate);
        video.addEventListener('enterpictureinpicture', handleEnterPiP);
        video.addEventListener('leavepictureinpicture', handleLeavePiP);

        return () => {
            video.removeEventListener('loadedmetadata', handleLoadedMetadata);
            video.removeEventListener('timeupdate', handleTimeUpdate);
            video.removeEventListener('enterpictureinpicture', handleEnterPiP);
            video.removeEventListener('leavepictureinpicture', handleLeavePiP);
        };
    }, []);

    const togglePlay = useCallback(() => {
        if (!videoRef.current) return;
        if (isPlaying) {
            videoRef.current.pause();
        } else {
            videoRef.current.play();
        }
        setIsPlaying(!isPlaying);
    }, [isPlaying]);

    const togglePiP = useCallback(async () => {
        if (!videoRef.current || !isPiPSupported) return;

        try {
            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
            } else {
                await videoRef.current.requestPictureInPicture();
            }
        } catch (error) {
            console.error('PiP error:', error);
        }
    }, [isPiPSupported]);

    const changePlaybackRate = useCallback(() => {
        if (!videoRef.current) return;
        const rates = [0.5, 0.75, 1, 1.25, 1.5, 2];
        const currentIndex = rates.indexOf(playbackRate);
        const nextRate = rates[(currentIndex + 1) % rates.length];
        videoRef.current.playbackRate = nextRate;
        setPlaybackRate(nextRate);
    }, [playbackRate]);

    const seekTo = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!videoRef.current) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        videoRef.current.currentTime = percent * videoRef.current.duration;
    }, []);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div
            className={`relative group ${className}`}
            onMouseEnter={() => setShowControls(true)}
            onMouseLeave={() => setShowControls(false)}
        >
            <video
                ref={videoRef}
                src={src}
                poster={poster}
                autoPlay={autoPlay}
                muted={muted}
                loop
                playsInline
                className="w-full h-full object-cover"
            />

            {controls && (
                <motion.div
                    className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"
                    initial={false}
                    animate={{ opacity: showControls ? 1 : 0 }}
                >
                    {/* Center Play Button */}
                    <div
                        className="absolute inset-0 flex items-center justify-center cursor-pointer"
                        onClick={togglePlay}
                    >
                        {!isPlaying && (
                            <div className="w-16 h-16 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center">
                                <span className="text-3xl ml-1">▶️</span>
                            </div>
                        )}
                    </div>

                    {/* Bottom Controls */}
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                        {/* Progress Bar */}
                        <div
                            className="w-full h-1.5 bg-white/20 rounded-full cursor-pointer mb-3"
                            onClick={seekTo}
                        >
                            <div
                                className="h-full bg-gradient-to-r from-[#7C8FFF] to-[#6070EE] rounded-full"
                                style={{ width: `${progress}%` }}
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                {/* Play/Pause */}
                                <button
                                    onClick={togglePlay}
                                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                                >
                                    {isPlaying ? '⏸️' : '▶️'}
                                </button>

                                {/* Time */}
                                <span className="text-xs text-white/70 font-mono">
                                    {formatTime(videoRef.current?.currentTime || 0)} / {formatTime(duration)}
                                </span>
                            </div>

                            <div className="flex items-center gap-2">
                                {/* Playback Rate */}
                                <button
                                    onClick={changePlaybackRate}
                                    className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-xs text-white/70 transition-colors"
                                >
                                    {playbackRate}x
                                </button>

                                {/* PiP Button */}
                                {isPiPSupported && (
                                    <button
                                        onClick={togglePiP}
                                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isPiP ? 'bg-[#7C8FFF] text-white' : 'bg-white/10 hover:bg-white/20 text-white'
                                            }`}
                                        title="Picture-in-Picture"
                                    >
                                        📺
                                    </button>
                                )}

                                {/* Fullscreen */}
                                <button
                                    onClick={() => videoRef.current?.requestFullscreen?.()}
                                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                                    title="Fullscreen"
                                >
                                    ⛶
                                </button>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </div>
    );
}

// ============================================
// QUOTE REPOST
// Repost with commentary
// ============================================

interface QuoteRepostProps {
    isOpen: boolean;
    onClose: () => void;
    originalPost: {
        id: string;
        author: {
            displayName: string;
            username: string;
            avatarUrl?: string;
        };
        content?: string;
        mediaUrl?: string;
    };
    onSubmit: (comment: string) => void;
}

export function QuoteRepost({ isOpen, onClose, originalPost, onSubmit }: QuoteRepostProps) {
    const [comment, setComment] = useState('');
    const maxLength = 280;

    const handleSubmit = useCallback(() => {
        if (comment.trim()) {
            onSubmit(comment);
            setComment('');
            onClose();
        }
    }, [comment, onSubmit, onClose]);

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
                className="bg-[#1A1A1F] rounded-2xl w-full max-w-lg border border-white/10"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-6 border-b border-white/10">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        🔄 Quote Repost
                    </h3>
                </div>

                <div className="p-6 space-y-4">
                    {/* Comment Input */}
                    <div>
                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value.slice(0, maxLength))}
                            placeholder="Add your thoughts..."
                            className="w-full h-24 bg-white/5 border border-white/10 rounded-xl p-4 text-white placeholder:text-white/40 resize-none focus:outline-none focus:border-[#7C8FFF]/50"
                            autoFocus
                        />
                        <div className="text-right mt-1">
                            <span className={`text-xs ${comment.length > maxLength - 20 ? 'text-orange-400' : 'text-white/40'}`}>
                                {comment.length}/{maxLength}
                            </span>
                        </div>
                    </div>

                    {/* Original Post Preview */}
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#7C8FFF] to-[#6070EE] flex items-center justify-center text-white font-bold text-sm">
                                {originalPost.author.displayName[0]}
                            </div>
                            <div>
                                <span className="font-medium text-white text-sm">{originalPost.author.displayName}</span>
                                <span className="text-white/40 text-sm ml-1">@{originalPost.author.username}</span>
                            </div>
                        </div>
                        {originalPost.content && (
                            <p className="text-white/70 text-sm line-clamp-3">{originalPost.content}</p>
                        )}
                    </div>
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
                        disabled={!comment.trim()}
                        className="flex-1 py-3 rounded-xl bg-[#7C8FFF] text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                        Repost
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}
