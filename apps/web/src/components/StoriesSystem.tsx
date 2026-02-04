'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CloseIcon, CheckCircleIcon } from '@/components/icons';

// ============================================
// TYPES
// ============================================

export interface Story {
    id: string;
    userId: string;
    userName: string;
    userAvatar?: string;
    items: StoryItem[];
    createdAt: Date;
    expiresAt: Date;
    viewCount: number;
    isViewed: boolean;
}

export interface StoryItem {
    id: string;
    type: 'image' | 'video' | 'text';
    mediaUrl?: string;
    text?: string;
    backgroundColor?: string;
    duration: number; // seconds
    reactions: { emoji: string; count: number }[];
}

// ============================================
// STORY RING
// ============================================

interface StoryRingProps {
    story: Story;
    size?: number;
    onClick: () => void;
}

export function StoryRing({ story, size = 64, onClick }: StoryRingProps) {
    const hasUnviewed = !story.isViewed;

    return (
        <button onClick={onClick} className="flex flex-col items-center gap-1">
            <div className={`p-0.5 rounded-full ${hasUnviewed ? 'bg-gradient-to-tr from-purple-500 via-pink-500 to-yellow-500' : 'bg-white/20'}`}
                style={{ width: size + 4, height: size + 4 }}>
                <div className="w-full h-full rounded-full bg-[#0A0A0F] p-0.5">
                    <div className="w-full h-full rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 overflow-hidden">
                        {story.userAvatar ? (
                            <img src={story.userAvatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-white font-medium">
                                {story.userName[0]}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <span className="text-xs text-white/60 truncate max-w-[60px]">{story.userName}</span>
        </button>
    );
}

// ============================================
// STORY VIEWER
// ============================================

interface StoryViewerProps {
    stories: Story[];
    initialIndex?: number;
    onClose: () => void;
    onViewed: (storyId: string, itemId: string) => void;
    onReact: (storyId: string, itemId: string, emoji: string) => void;
    onReply: (storyId: string, message: string) => void;
}

export function StoryViewer({ stories, initialIndex = 0, onClose, onViewed, onReact, onReply }: StoryViewerProps) {
    const [currentStoryIndex, setCurrentStoryIndex] = useState(initialIndex);
    const [currentItemIndex, setCurrentItemIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [reply, setReply] = useState('');
    const [progress, setProgress] = useState(0);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const currentStory = stories[currentStoryIndex];
    const currentItem = currentStory?.items[currentItemIndex];

    useEffect(() => {
        if (!currentItem || isPaused) return;

        const duration = currentItem.duration * 1000;
        const startTime = Date.now();

        const tick = () => {
            const elapsed = Date.now() - startTime;
            setProgress(Math.min(elapsed / duration, 1));

            if (elapsed >= duration) {
                goNext();
            } else {
                timerRef.current = setTimeout(tick, 50);
            }
        };

        timerRef.current = setTimeout(tick, 50);
        onViewed(currentStory.id, currentItem.id);

        return () => { if (timerRef.current) clearTimeout(timerRef.current); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentStoryIndex, currentItemIndex, isPaused]);

    const goNext = () => {
        if (currentItemIndex < currentStory.items.length - 1) {
            setCurrentItemIndex(i => i + 1);
            setProgress(0);
        } else if (currentStoryIndex < stories.length - 1) {
            setCurrentStoryIndex(i => i + 1);
            setCurrentItemIndex(0);
            setProgress(0);
        } else {
            onClose();
        }
    };

    const goPrev = () => {
        if (currentItemIndex > 0) {
            setCurrentItemIndex(i => i - 1);
            setProgress(0);
        } else if (currentStoryIndex > 0) {
            setCurrentStoryIndex(i => i - 1);
            setCurrentItemIndex(stories[currentStoryIndex - 1].items.length - 1);
            setProgress(0);
        }
    };

    const handleReply = () => {
        if (reply.trim()) {
            onReply(currentStory.id, reply);
            setReply('');
        }
    };

    if (!currentStory || !currentItem) return null;

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black flex items-center justify-center"
            onMouseDown={() => setIsPaused(true)} onMouseUp={() => setIsPaused(false)} onTouchStart={() => setIsPaused(true)} onTouchEnd={() => setIsPaused(false)}>

            {/* Close Button */}
            <button onClick={onClose} className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 text-white">
                <CloseIcon size={24} />
            </button>

            {/* Story Content */}
            <div className="relative w-full max-w-md h-full max-h-[800px] bg-[#0A0A0F] rounded-xl overflow-hidden">
                {/* Progress Bars */}
                <div className="absolute top-0 left-0 right-0 z-10 flex gap-1 p-2">
                    {currentStory.items.map((_, i) => (
                        <div key={i} className="flex-1 h-0.5 rounded-full bg-white/30 overflow-hidden">
                            <div className="h-full bg-white rounded-full" style={{
                                width: i < currentItemIndex ? '100%' : i === currentItemIndex ? `${progress * 100}%` : '0%'
                            }} />
                        </div>
                    ))}
                </div>

                {/* User Info */}
                <div className="absolute top-8 left-4 right-4 z-10 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center text-white font-medium">
                        {currentStory.userAvatar ? (
                            <img src={currentStory.userAvatar} alt="" className="w-full h-full rounded-full object-cover" />
                        ) : currentStory.userName[0]}
                    </div>
                    <div>
                        <p className="font-medium text-white">{currentStory.userName}</p>
                        <p className="text-xs text-white/50">Just now</p>
                    </div>
                </div>

                {/* Content */}
                <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: currentItem.backgroundColor || '#0A0A0F' }}>
                    {currentItem.type === 'image' && currentItem.mediaUrl && (
                        <img src={currentItem.mediaUrl} alt="" className="w-full h-full object-contain" />
                    )}
                    {currentItem.type === 'video' && currentItem.mediaUrl && (
                        <video src={currentItem.mediaUrl} autoPlay muted loop className="w-full h-full object-contain" />
                    )}
                    {currentItem.type === 'text' && (
                        <p className="text-3xl font-bold text-white text-center px-8">{currentItem.text}</p>
                    )}
                </div>

                {/* Navigation Areas */}
                <div className="absolute inset-0 flex">
                    <div className="w-1/3 h-full" onClick={goPrev} />
                    <div className="w-2/3 h-full" onClick={goNext} />
                </div>

                {/* Reply Input */}
                <div className="absolute bottom-4 left-4 right-4 flex gap-2">
                    <input type="text" value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Reply to story..."
                        className="flex-1 px-4 py-3 rounded-full bg-white/10 border border-white/20 text-white placeholder:text-white/40"
                        onKeyDown={(e) => e.key === 'Enter' && handleReply()} />
                    <div className="flex gap-1">
                        {['❤️', '🔥', '😂'].map(emoji => (
                            <button key={emoji} onClick={() => onReact(currentStory.id, currentItem.id, emoji)}
                                className="p-3 rounded-full bg-white/10 hover:bg-white/20">{emoji}</button>
                        ))}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

// ============================================
// STORY CREATOR
// ============================================

interface StoryCreatorProps {
    isOpen: boolean;
    onClose: () => void;
    onPublish: (item: Partial<StoryItem>) => Promise<void>;
}

const BACKGROUNDS = ['#1a1a2e', '#16213e', '#0f3460', '#533483', '#e94560', '#1b1b2f', '#162447', '#1f4068'];

export function StoryCreator({ isOpen, onClose, onPublish }: StoryCreatorProps) {
    const [type, setType] = useState<'text' | 'image'>('text');
    const [text, setText] = useState('');
    const [backgroundColor, setBackgroundColor] = useState(BACKGROUNDS[0]);
    const [isPublishing, setIsPublishing] = useState(false);

    const handlePublish = async () => {
        setIsPublishing(true);
        try {
            await onPublish({ type, text: type === 'text' ? text : undefined, backgroundColor, duration: 5 });
            onClose();
        } finally {
            setIsPublishing(false);
        }
    };

    if (!isOpen) return null;

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 bg-black flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
                <button onClick={onClose}><CloseIcon size={24} className="text-white" /></button>
                <h2 className="font-semibold text-white">Create Story</h2>
                <button onClick={handlePublish} disabled={isPublishing || (type === 'text' && !text.trim())}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium disabled:opacity-50">
                    {isPublishing ? 'Posting...' : 'Share'}
                </button>
            </div>

            <div className="flex gap-4 p-4">
                {(['text', 'image'] as const).map(t => (
                    <button key={t} onClick={() => setType(t)}
                        className={`px-4 py-2 rounded-xl capitalize ${type === t ? 'bg-white/20 text-white' : 'text-white/50'}`}>{t}</button>
                ))}
            </div>

            <div className="flex-1 flex items-center justify-center p-8" style={{ backgroundColor }}>
                {type === 'text' ? (
                    <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Type something..."
                        className="w-full max-w-md text-3xl font-bold text-white text-center bg-transparent resize-none focus:outline-none"
                        rows={4} />
                ) : (
                    <div className="w-full max-w-md aspect-[9/16] rounded-xl border-2 border-dashed border-white/30 flex items-center justify-center text-white/50">
                        Tap to add photo
                    </div>
                )}
            </div>

            {type === 'text' && (
                <div className="p-4 flex gap-2">
                    {BACKGROUNDS.map(bg => (
                        <button key={bg} onClick={() => setBackgroundColor(bg)}
                            className={`w-8 h-8 rounded-full ${backgroundColor === bg ? 'ring-2 ring-white' : ''}`} style={{ backgroundColor: bg }} />
                    ))}
                </div>
            )}
        </motion.div>
    );
}

export default StoryViewer;
