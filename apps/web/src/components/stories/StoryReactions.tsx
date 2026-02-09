'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface StoryReactionsProps {
    storyId: string;
    authorId: string;
    onReact: (emoji: string) => void;
    onReply: (text: string) => void;
}

const QUICK_REACTIONS = ['❤️', '🔥', '😂', '😮', '😢', '👏'];

export function StoryReactions({ storyId, authorId, onReact, onReply }: StoryReactionsProps) {
    const [replyText, setReplyText] = useState('');
    const [showReactions, setShowReactions] = useState(true);
    const [sentReaction, setSentReaction] = useState<string | null>(null);

    const handleReact = (emoji: string) => {
        setSentReaction(emoji);
        onReact(emoji);
        setTimeout(() => setSentReaction(null), 1500);
    };

    const handleReply = () => {
        if (!replyText.trim()) return;
        onReply(replyText.trim());
        setReplyText('');
    };

    return (
        <div className="absolute bottom-0 left-0 right-0 z-20">
            {/* Floating reaction animation */}
            <AnimatePresence>
                {sentReaction && (
                    <motion.div
                        className="absolute bottom-24 left-1/2 text-5xl pointer-events-none"
                        initial={{ y: 0, x: '-50%', scale: 0.5, opacity: 0 }}
                        animate={{ y: -120, scale: 1.5, opacity: [0, 1, 1, 0] }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1.2, ease: 'easeOut' }}
                    >
                        {sentReaction}
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-16 pb-6 px-4">
                {/* Quick reactions */}
                {showReactions && (
                    <div className="flex justify-center gap-3 mb-3">
                        {QUICK_REACTIONS.map((emoji) => (
                            <motion.button
                                key={emoji}
                                onClick={() => handleReact(emoji)}
                                className="w-10 h-10 rounded-full bg-white/10 backdrop-blur flex items-center justify-center text-xl hover:bg-white/20 transition-colors"
                                whileTap={{ scale: 1.3 }}
                                aria-label={`React with ${emoji}`}
                            >
                                {emoji}
                            </motion.button>
                        ))}
                    </div>
                )}

                {/* Reply input */}
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleReply()}
                        onFocus={() => setShowReactions(false)}
                        onBlur={() => setTimeout(() => setShowReactions(true), 200)}
                        placeholder="Reply to story..."
                        className="flex-1 bg-white/10 backdrop-blur border border-white/10 rounded-full px-4 py-2.5 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37]/50"
                    />
                    {replyText.trim() && (
                        <motion.button
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            onClick={handleReply}
                            className="w-10 h-10 rounded-full bg-[#D4AF37] flex items-center justify-center flex-shrink-0"
                            aria-label="Send reply"
                        >
                            <svg width={18} height={18} viewBox="0 0 24 24" fill="black">
                                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                            </svg>
                        </motion.button>
                    )}
                </div>
            </div>
        </div>
    );
}
