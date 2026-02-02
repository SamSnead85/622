'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { useState } from 'react';
import { CrescentMoon } from './OasisBackground';

// ============================================
// ARCH CARD
// Distinctive card with mihrab-inspired arch top
// Premium glass morphism with desert warmth
// ============================================

interface ArchCardProps {
    post: {
        id: string;
        author: string;
        avatar: string;
        image?: string;
        caption: string;
        likes: number;
        time: string;
        isLiked?: boolean;
    };
    onClick?: () => void;
    onLike?: () => void;
    delay?: number;
}

export function ArchCard({ post, onClick, onLike, delay = 0 }: ArchCardProps) {
    const [isLiked, setIsLiked] = useState(post.isLiked || false);
    const [likes, setLikes] = useState(post.likes);
    const [imageError, setImageError] = useState(false);

    const handleLike = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsLiked(!isLiked);
        setLikes(prev => isLiked ? prev - 1 : prev + 1);
        onLike?.();
    };

    return (
        <motion.article
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay, ease: [0.23, 1, 0.32, 1] }}
            whileHover={{ y: -4, scale: 1.01 }}
            onClick={onClick}
            className="relative cursor-pointer group"
        >
            {/* Arch-shaped card container */}
            <div
                className="relative overflow-hidden"
                style={{
                    // Mihrab-inspired arch shape using clip-path
                    clipPath: 'polygon(0 15%, 5% 8%, 15% 3%, 50% 0, 85% 3%, 95% 8%, 100% 15%, 100% 100%, 0 100%)',
                }}
            >
                {/* Glass morphism background */}
                <div className="absolute inset-0 bg-gradient-to-b from-[#1A1512]/90 via-[#1A1512]/95 to-[#0A0908]/98 backdrop-blur-xl" />

                {/* Golden arch border glow */}
                <div
                    className="absolute inset-0 opacity-40 group-hover:opacity-60 transition-opacity"
                    style={{
                        background: 'linear-gradient(180deg, rgba(212,175,55,0.3) 0%, rgba(212,175,55,0.1) 20%, transparent 40%)',
                    }}
                />

                {/* Content */}
                <div className="relative p-4 pt-6">
                    {/* Header - Author info */}
                    <div className="flex items-center gap-3 mb-4">
                        {/* Arch-shaped avatar */}
                        <div className="relative w-11 h-11">
                            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 44 44">
                                <defs>
                                    <clipPath id={`avatar-arch-${post.id}`}>
                                        <path d="M22 0 C35 0, 44 10, 44 22 L44 44 L0 44 L0 22 C0 10, 9 0, 22 0" />
                                    </clipPath>
                                    <linearGradient id="avatar-border-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#D4AF37" />
                                        <stop offset="100%" stopColor="#E8927C" />
                                    </linearGradient>
                                </defs>
                                <path
                                    d="M22 1 C34 1, 43 10, 43 22 L43 43 L1 43 L1 22 C1 10, 10 1, 22 1"
                                    fill="none"
                                    stroke="url(#avatar-border-grad)"
                                    strokeWidth="1.5"
                                    className="opacity-60"
                                />
                            </svg>
                            <div
                                className="w-full h-full overflow-hidden"
                                style={{
                                    clipPath: 'path("M22 2 C33 2, 42 11, 42 22 L42 42 L2 42 L2 22 C2 11, 11 2, 22 2")',
                                }}
                            >
                                <Image
                                    src={post.avatar}
                                    alt={post.author}
                                    width={44}
                                    height={44}
                                    className="w-full h-full object-cover"
                                    onError={() => setImageError(true)}
                                />
                            </div>
                        </div>

                        <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-white/90 truncate text-sm">
                                {post.author}
                            </h3>
                            <div className="flex items-center gap-1.5 text-xs text-white/40">
                                <CrescentMoon size={10} />
                                <span>{post.time}</span>
                            </div>
                        </div>

                        {/* More options */}
                        <button className="p-2 rounded-full hover:bg-white/5 transition-colors text-white/40 hover:text-white/60">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                            </svg>
                        </button>
                    </div>

                    {/* Media - with arch top */}
                    {post.image && !imageError && (
                        <div
                            className="relative aspect-[4/5] mb-4 overflow-hidden"
                            style={{
                                clipPath: 'polygon(0 8%, 10% 2%, 50% 0, 90% 2%, 100% 8%, 100% 100%, 0 100%)',
                                borderRadius: '0 0 12px 12px',
                            }}
                        >
                            <Image
                                src={post.image}
                                alt="Post media"
                                fill
                                className="object-cover group-hover:scale-105 transition-transform duration-500"
                                onError={() => setImageError(true)}
                            />
                            {/* Warm overlay gradient */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                    )}

                    {/* Caption */}
                    {post.caption && (
                        <p className="text-white/80 text-sm leading-relaxed mb-4 line-clamp-3">
                            {post.caption}
                        </p>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-4 pt-3 border-t border-white/5">
                        {/* Like button */}
                        <motion.button
                            onClick={handleLike}
                            whileTap={{ scale: 0.9 }}
                            className="flex items-center gap-2 text-sm"
                        >
                            <motion.div
                                animate={isLiked ? { scale: [1, 1.3, 1] } : {}}
                                transition={{ duration: 0.3 }}
                            >
                                {isLiked ? (
                                    <svg className="w-5 h-5 text-rose-500" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                                    </svg>
                                ) : (
                                    <svg className="w-5 h-5 text-white/50 hover:text-white/70" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                                    </svg>
                                )}
                            </motion.div>
                            <span className={isLiked ? 'text-rose-400' : 'text-white/50'}>
                                {likes > 0 ? likes.toLocaleString() : 'Like'}
                            </span>
                        </motion.button>

                        {/* Comment button */}
                        <button className="flex items-center gap-2 text-sm text-white/50 hover:text-white/70 transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <span>Comment</span>
                        </button>

                        {/* Share button */}
                        <button className="flex items-center gap-2 text-sm text-white/50 hover:text-white/70 transition-colors ml-auto">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* Decorative arch shadow */}
            <div
                className="absolute -bottom-2 left-4 right-4 h-8 bg-gradient-to-b from-amber-900/10 to-transparent blur-xl -z-10"
            />
        </motion.article>
    );
}

// ============================================
// ARABESQUE DIVIDER
// Flowing decorative divider between sections
// ============================================
export function ArabesqueDivider({ className = '' }: { className?: string }) {
    return (
        <div className={`flex items-center justify-center gap-4 py-6 ${className}`}>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-700/30 to-transparent" />
            <svg width="24" height="24" viewBox="0 0 24 24" className="text-amber-600/40">
                <path
                    d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z"
                    fill="currentColor"
                />
            </svg>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-700/30 to-transparent" />
        </div>
    );
}

export default ArchCard;
