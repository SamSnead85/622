'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { ReactNode, useState, useRef, useEffect, useCallback } from 'react';

// ============================================
// MESSAGING COMPONENTS
// ZeroG Silk Road Renaissance Chat UI
// ============================================

// ============================================
// CHAT BUBBLE
// Message bubble with variants
// ============================================

interface ChatBubbleProps {
    content: string;
    time: string;
    isSent?: boolean;
    isDelivered?: boolean;
    isRead?: boolean;
    avatar?: string;
    media?: { type: 'image' | 'video'; src: string }[];
    reactions?: { emoji: string; count: number }[];
    onReact?: (emoji: string) => void;
    className?: string;
}

export function ChatBubble({
    content,
    time,
    isSent = false,
    isDelivered = false,
    isRead = false,
    avatar,
    media,
    reactions = [],
    onReact,
    className = '',
}: ChatBubbleProps) {
    const [showReactions, setShowReactions] = useState(false);

    const quickReactions = ['❤️', '👍', '😂', '😮', '😢', '🔥'];

    return (
        <div className={`flex ${isSent ? 'justify-end' : 'justify-start'} ${className}`}>
            <div className={`flex gap-2 max-w-[80%] ${isSent ? 'flex-row-reverse' : ''}`}>
                {!isSent && avatar && (
                    <div className="w-8 h-8 rounded-full overflow-hidden shrink-0">
                        <Image src={avatar} alt="" width={32} height={32} className="object-cover" />
                    </div>
                )}

                <div className="relative group">
                    {/* Media */}
                    {media && media.length > 0 && (
                        <div className={`mb-1 rounded-2xl overflow-hidden ${media.length > 1 ? 'grid grid-cols-2 gap-0.5' : ''}`}>
                            {media.map((item, i) => (
                                item.type === 'image' ? (
                                    <Image
                                        key={i}
                                        src={item.src}
                                        alt=""
                                        width={300}
                                        height={200}
                                        className="object-cover"
                                    />
                                ) : (
                                    <video key={i} src={item.src} controls className="w-full" />
                                )
                            ))}
                        </div>
                    )}

                    {/* Message */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        onDoubleClick={() => setShowReactions(!showReactions)}
                        className={`
                            px-4 py-2 rounded-2xl
                            ${isSent
                                ? 'bg-gradient-to-br from-violet-500 to-rose-500 text-white rounded-br-md'
                                : 'bg-white/10 text-white rounded-bl-md'}
                        `}
                    >
                        <p className="whitespace-pre-wrap break-words">{content}</p>

                        <div className={`flex items-center gap-1.5 mt-1 ${isSent ? 'justify-end' : ''}`}>
                            <span className="text-[10px] opacity-60">{time}</span>
                            {isSent && (
                                <span className="text-[10px]">
                                    {isRead ? '✓✓' : isDelivered ? '✓' : '○'}
                                </span>
                            )}
                        </div>
                    </motion.div>

                    {/* Reactions */}
                    {reactions.length > 0 && (
                        <div className={`absolute -bottom-3 ${isSent ? 'right-2' : 'left-2'} flex gap-0.5`}>
                            {reactions.map((r, i) => (
                                <span
                                    key={i}
                                    className="px-1.5 py-0.5 bg-white/10 backdrop-blur-sm rounded-full text-xs"
                                >
                                    {r.emoji}{r.count > 1 && ` ${r.count}`}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Quick Reactions */}
                    <AnimatePresence>
                        {showReactions && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.8, y: 10 }}
                                className={`absolute ${isSent ? 'right-0' : 'left-0'} -top-12 flex gap-1 bg-[#0a0a12] border border-white/10 rounded-full px-2 py-1 z-10`}
                            >
                                {quickReactions.map(emoji => (
                                    <button
                                        key={emoji}
                                        onClick={() => { onReact?.(emoji); setShowReactions(false); }}
                                        className="hover:scale-125 transition-transform p-1"
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}

// ============================================
// MESSAGE INPUT
// Chat input with attachments
// ============================================

interface MessageInputProps {
    value?: string;
    onChange?: (value: string) => void;
    onSend?: (message: string) => void;
    onAttach?: () => void;
    onVoice?: () => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
}

export function MessageInput({
    value: controlledValue,
    onChange,
    onSend,
    onAttach,
    onVoice,
    placeholder = 'Type a message...',
    disabled = false,
    className = '',
}: MessageInputProps) {
    const [internalValue, setInternalValue] = useState('');
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const value = controlledValue !== undefined ? controlledValue : internalValue;

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        setInternalValue(newValue);
        onChange?.(newValue);

        // Auto-resize
        if (inputRef.current) {
            inputRef.current.style.height = 'auto';
            inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
        }
    };

    const handleSend = () => {
        if (value.trim()) {
            onSend?.(value.trim());
            setInternalValue('');
            onChange?.('');
            if (inputRef.current) {
                inputRef.current.style.height = 'auto';
            }
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className={`flex items-end gap-2 p-3 bg-[#0a0a12] border-t border-white/10 ${className}`}>
            {onAttach && (
                <button
                    onClick={onAttach}
                    disabled={disabled}
                    className="w-10 h-10 shrink-0 rounded-full hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white/70 transition-colors"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                </button>
            )}

            <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-2">
                <textarea
                    ref={inputRef}
                    value={value}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    disabled={disabled}
                    rows={1}
                    className="w-full bg-transparent text-white placeholder:text-white/30 resize-none focus:outline-none"
                    style={{ maxHeight: 120 }}
                />
            </div>

            {value.trim() ? (
                <motion.button
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    onClick={handleSend}
                    disabled={disabled}
                    className="w-10 h-10 shrink-0 rounded-full bg-gradient-to-br from-violet-500 to-rose-500 flex items-center justify-center text-white"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                </motion.button>
            ) : onVoice && (
                <button
                    onClick={onVoice}
                    disabled={disabled}
                    className="w-10 h-10 shrink-0 rounded-full hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white/70 transition-colors"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                </button>
            )}
        </div>
    );
}

// ============================================
// CONVERSATION LIST ITEM
// Chat preview in list
// ============================================

interface ConversationItemProps {
    user: {
        name: string;
        avatar?: string;
        isOnline?: boolean;
    };
    lastMessage: string;
    time: string;
    unreadCount?: number;
    isTyping?: boolean;
    isSelected?: boolean;
    onClick?: () => void;
}

export function ConversationItem({
    user,
    lastMessage,
    time,
    unreadCount = 0,
    isTyping = false,
    isSelected = false,
    onClick,
}: ConversationItemProps) {
    return (
        <motion.button
            onClick={onClick}
            whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
            className={`
                w-full flex items-center gap-3 p-3 rounded-xl text-left
                transition-colors
                ${isSelected ? 'bg-violet-500/20' : ''}
            `}
        >
            <div className="relative shrink-0">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-rose-500 p-0.5">
                    <div className="w-full h-full rounded-full bg-[#0a0a12] overflow-hidden">
                        {user.avatar ? (
                            <Image src={user.avatar} alt={user.name} width={44} height={44} className="object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-white font-medium">
                                {user.name.charAt(0)}
                            </div>
                        )}
                    </div>
                </div>
                {user.isOnline && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#0a0a12]" />
                )}
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                    <span className="font-semibold text-white truncate">{user.name}</span>
                    <span className="text-xs text-white/40 shrink-0">{time}</span>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                    {isTyping ? (
                        <motion.span
                            animate={{ opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                            className="text-sm text-violet-400 italic"
                        >
                            typing...
                        </motion.span>
                    ) : (
                        <span className={`text-sm truncate ${unreadCount > 0 ? 'text-white' : 'text-white/50'}`}>
                            {lastMessage}
                        </span>
                    )}
                    {unreadCount > 0 && (
                        <span className="w-5 h-5 bg-violet-500 rounded-full flex items-center justify-center text-xs text-white shrink-0 ml-2">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </div>
            </div>
        </motion.button>
    );
}

// ============================================
// TYPING INDICATOR
// Animated typing dots
// ============================================

export function TypingIndicator({ className = '' }: { className?: string }) {
    return (
        <div className={`flex gap-1 px-4 py-2 ${className}`}>
            {[0, 1, 2].map(i => (
                <motion.div
                    key={i}
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.1 }}
                    className="w-2 h-2 bg-white/50 rounded-full"
                />
            ))}
        </div>
    );
}

// ============================================
// VOICE MESSAGE
// Audio message with waveform
// ============================================

interface VoiceMessageProps {
    duration: number; // in seconds
    audioUrl?: string;
    isSent?: boolean;
    className?: string;
}

export function VoiceMessage({
    duration,
    audioUrl,
    isSent = false,
    className = '',
}: VoiceMessageProps) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const audioRef = useRef<HTMLAudioElement>(null);

    const formatDuration = (secs: number) => {
        const mins = Math.floor(secs / 60);
        const s = Math.floor(secs % 60);
        return `${mins}:${s.toString().padStart(2, '0')}`;
    };

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

    // Generate fake waveform bars
    const bars = Array.from({ length: 30 }, () => Math.random() * 0.8 + 0.2);

    return (
        <div className={`flex items-center gap-3 ${className}`}>
            {audioUrl && <audio ref={audioRef} src={audioUrl} onTimeUpdate={(e) => setProgress((e.currentTarget.currentTime / duration) * 100)} onEnded={() => { setIsPlaying(false); setProgress(0); }} />}

            <button
                onClick={togglePlay}
                className={`
                    w-10 h-10 rounded-full flex items-center justify-center shrink-0
                    ${isSent ? 'bg-white/20' : 'bg-violet-500'}
                `}
            >
                {isPlaying ? (
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                    </svg>
                ) : (
                    <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                    </svg>
                )}
            </button>

            <div className="flex-1">
                <div className="flex items-center gap-0.5 h-8">
                    {bars.map((height, i) => {
                        const isActive = (i / bars.length) * 100 <= progress;
                        return (
                            <motion.div
                                key={i}
                                animate={isPlaying && isActive ? { scaleY: [1, height, 1] } : {}}
                                transition={{ duration: 0.3 }}
                                className={`w-1 rounded-full ${isActive ? (isSent ? 'bg-white' : 'bg-violet-400') : 'bg-white/30'}`}
                                style={{ height: `${height * 100}%` }}
                            />
                        );
                    })}
                </div>
                <span className={`text-xs ${isSent ? 'text-white/60' : 'text-white/40'}`}>
                    {formatDuration(duration)}
                </span>
            </div>
        </div>
    );
}

// ============================================
// EXPORTS
// ============================================

export {
    type ChatBubbleProps,
    type MessageInputProps,
    type ConversationItemProps,
    type VoiceMessageProps,
};
