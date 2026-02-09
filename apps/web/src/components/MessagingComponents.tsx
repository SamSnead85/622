'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================
// VOICE MESSAGE RECORDER
// Record and send voice messages
// ============================================

interface VoiceMessageRecorderProps {
    onRecordingComplete: (blob: Blob, duration: number) => void;
    maxDuration?: number;
}

export function VoiceMessageRecorder({
    onRecordingComplete,
    maxDuration = 60
}: VoiceMessageRecorderProps) {
    const [isRecording, setIsRecording] = useState(false);
    const [duration, setDuration] = useState(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const startRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                onRecordingComplete(blob, duration);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
            setDuration(0);

            timerRef.current = setInterval(() => {
                setDuration(prev => {
                    if (prev >= maxDuration) {
                        stopRecording();
                        return prev;
                    }
                    return prev + 1;
                });
            }, 1000);
        } catch (error) {
            console.error('Error starting recording:', error);
        }
    }, [maxDuration, onRecordingComplete, duration]);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        }
    }, [isRecording]);

    const cancelRecording = useCallback(() => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            setDuration(0);
            chunksRef.current = [];
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        }
    }, [isRecording]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="flex items-center gap-3">
            {isRecording ? (
                <>
                    <button
                        onClick={cancelRecording}
                        className="w-10 h-10 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center hover:bg-red-500/30 transition-colors"
                    >
                        ✕
                    </button>
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-white font-mono">{formatTime(duration)}</span>
                    </div>
                    <button
                        onClick={stopRecording}
                        className="w-10 h-10 rounded-full bg-[#D4AF37] text-black flex items-center justify-center hover:opacity-90 transition-opacity"
                    >
                        ✓
                    </button>
                </>
            ) : (
                <button
                    onClick={startRecording}
                    className="w-10 h-10 rounded-full bg-white/10 text-white/60 flex items-center justify-center hover:bg-white/20 hover:text-white transition-colors"
                    title="Record voice message"
                >
                    🎤
                </button>
            )}
        </div>
    );
}

// ============================================
// VOICE MESSAGE PLAYER
// Play back recorded voice messages
// ============================================

interface VoiceMessagePlayerProps {
    src: string;
    duration: number;
    isOwn?: boolean;
}

export function VoiceMessagePlayer({ src, duration, isOwn = false }: VoiceMessagePlayerProps) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const handleTimeUpdate = () => {
            setProgress((audio.currentTime / audio.duration) * 100);
            setCurrentTime(audio.currentTime);
        };

        const handleEnded = () => {
            setIsPlaying(false);
            setProgress(0);
        };

        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('ended', handleEnded);

        return () => {
            audio.removeEventListener('timeupdate', handleTimeUpdate);
            audio.removeEventListener('ended', handleEnded);
        };
    }, []);

    const togglePlay = useCallback(() => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    }, [isPlaying]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className={`flex items-center gap-3 p-3 rounded-2xl ${isOwn ? 'bg-[#D4AF37]/20' : 'bg-white/10'}`}>
            <audio ref={audioRef} src={src} preload="metadata" />

            <button
                onClick={togglePlay}
                className={`w-10 h-10 rounded-full flex items-center justify-center ${isOwn ? 'bg-[#D4AF37] text-black' : 'bg-white/20 text-white'
                    }`}
            >
                {isPlaying ? '⏸️' : '▶️'}
            </button>

            <div className="flex-1">
                <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
                    <div
                        className={`h-full ${isOwn ? 'bg-[#D4AF37]' : 'bg-white/60'} transition-all`}
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            <span className="text-xs text-white/60 font-mono min-w-[40px]">
                {isPlaying ? formatTime(currentTime) : formatTime(duration)}
            </span>
        </div>
    );
}

// ============================================
// TYPING INDICATOR
// Show when someone is typing
// ============================================

interface TypingIndicatorProps {
    usernames?: string[];
}

export function TypingIndicator({ usernames = [] }: TypingIndicatorProps) {
    const displayText = usernames.length === 0
        ? 'typing'
        : usernames.length === 1
            ? `${usernames[0]} is typing`
            : `${usernames[0]} and ${usernames.length - 1} others are typing`;

    return (
        <div className="flex items-center gap-2 text-white/50 text-sm py-2">
            <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                    <motion.div
                        key={i}
                        className="w-2 h-2 rounded-full bg-white/40"
                        animate={{ y: [0, -5, 0] }}
                        transition={{
                            duration: 0.6,
                            repeat: Infinity,
                            delay: i * 0.15,
                        }}
                    />
                ))}
            </div>
            <span>{displayText}</span>
        </div>
    );
}

// ============================================
// READ RECEIPTS
// Show message read status
// ============================================

type ReadStatus = 'sent' | 'delivered' | 'read';

interface ReadReceiptsProps {
    status: ReadStatus;
    readAt?: string;
    compact?: boolean;
}

export function ReadReceipts({ status, readAt, compact = false }: ReadReceiptsProps) {
    const getIcon = () => {
        switch (status) {
            case 'sent': return '✓';
            case 'delivered': return '✓✓';
            case 'read': return '✓✓';
        }
    };

    const getColor = () => {
        switch (status) {
            case 'sent': return 'text-white/30';
            case 'delivered': return 'text-white/50';
            case 'read': return 'text-[#D4AF37]';
        }
    };

    return (
        <span className={`${getColor()} ${compact ? 'text-xs' : 'text-sm'}`} title={readAt ? `Read at ${new Date(readAt).toLocaleString()}` : undefined}>
            {getIcon()}
        </span>
    );
}

// ============================================
// MESSAGE REACTIONS
// Add reactions to messages
// ============================================

interface MessageReactionsProps {
    reactions: Array<{
        emoji: string;
        count: number;
        userReacted: boolean;
    }>;
    onReact: (emoji: string) => void;
}

export function MessageReactions({ reactions, onReact }: MessageReactionsProps) {
    const [showPicker, setShowPicker] = useState(false);
    const quickReactions = ['❤️', '👍', '😂', '😮', '😢', '🔥'];

    return (
        <div className="flex items-center gap-1 flex-wrap">
            {reactions.map((reaction) => (
                <button
                    key={reaction.emoji}
                    onClick={() => onReact(reaction.emoji)}
                    className={`px-2 py-0.5 rounded-full text-sm flex items-center gap-1 ${reaction.userReacted
                            ? 'bg-[#D4AF37]/20 border border-[#D4AF37]/30'
                            : 'bg-white/10 hover:bg-white/20'
                        }`}
                >
                    <span>{reaction.emoji}</span>
                    {reaction.count > 1 && <span className="text-xs text-white/60">{reaction.count}</span>}
                </button>
            ))}

            <div className="relative">
                <button
                    onClick={() => setShowPicker(!showPicker)}
                    className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white/60"
                >
                    +
                </button>

                <AnimatePresence>
                    {showPicker && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="absolute bottom-full left-0 mb-2 p-2 rounded-xl bg-[#1A1A1F] border border-white/10 flex gap-1"
                        >
                            {quickReactions.map((emoji) => (
                                <button
                                    key={emoji}
                                    onClick={() => {
                                        onReact(emoji);
                                        setShowPicker(false);
                                    }}
                                    className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-lg"
                                >
                                    {emoji}
                                </button>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

// ============================================
// MESSAGE BUBBLE
// Premium message bubble component
// ============================================

interface MessageBubbleProps {
    content: string;
    isOwn: boolean;
    timestamp: string;
    readStatus?: ReadStatus;
    reactions?: MessageReactionsProps['reactions'];
    onReact?: (emoji: string) => void;
    avatarUrl?: string;
    showAvatar?: boolean;
}

export function MessageBubble({
    content,
    isOwn,
    timestamp,
    readStatus,
    reactions = [],
    onReact,
    avatarUrl,
    showAvatar = true,
}: MessageBubbleProps) {
    const formatTime = (dateString: string) => {
        return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
            {showAvatar && !isOwn && (
                <div className="w-8 h-8 rounded-full overflow-hidden bg-white/10 flex-shrink-0">
                    {avatarUrl ? (
                        <Image src={avatarUrl} alt="Avatar" width={32} height={32} className="object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/60 text-sm">👤</div>
                    )}
                </div>
            )}

            <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                <div
                    className={`px-4 py-2.5 rounded-2xl ${isOwn
                            ? 'bg-gradient-to-r from-[#D4AF37] to-[#B8942D] text-black rounded-br-md'
                            : 'bg-white/10 text-white rounded-bl-md'
                        }`}
                >
                    <p className="text-sm leading-relaxed">{content}</p>
                </div>

                <div className={`flex items-center gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
                    <span className="text-xs text-white/40">{formatTime(timestamp)}</span>
                    {readStatus && isOwn && <ReadReceipts status={readStatus} compact />}
                </div>

                {reactions.length > 0 && onReact && (
                    <MessageReactions reactions={reactions} onReact={onReact} />
                )}
            </div>
        </div>
    );
}
