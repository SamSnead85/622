'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { HeartIcon, MessageIcon, ShareIcon, BookmarkIcon, PlayIcon } from '@/components/icons';
import { apiFetch } from '@/lib/api';

interface PostCardProps {
    post: any;
}

export function PostCard({ post }: PostCardProps) {
    const [isLiked, setIsLiked] = useState(post.isLiked);
    const [likesCount, setLikesCount] = useState(post.likesCount);

    const handleLike = async () => {
        // Optimistic Update
        const newState = !isLiked;
        setIsLiked(newState);
        setLikesCount((prev: number) => newState ? prev + 1 : prev - 1);

        try {
            await apiFetch(`/posts/${post.id}/like`, { method: newState ? 'POST' : 'DELETE' });
        } catch {
            // Revert
            setIsLiked(!newState);
            setLikesCount((prev: number) => !newState ? prev + 1 : prev - 1);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/5 rounded-2xl border border-white/5 hover:border-white/20 transition-all duration-300 overflow-hidden mb-6 group"
        >
            {/* Header */}
            <div className="p-4 flex items-center justify-between">
                <Link href={`/profile/${post.author.username}`} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-white/10 to-white/5 relative overflow-hidden ring-1 ring-white/10">
                        {post.author.avatarUrl ? (
                            <Image src={post.author.avatarUrl} alt="" fill className="object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center font-bold text-white/50 text-sm">
                                {post.author.displayName?.[0]}
                            </div>
                        )}
                    </div>
                    <div>
                        <div className="flex items-center gap-1.5">
                            <h3 className="font-bold text-white leading-tight hover:text-rose-400 transition-colors">{post.author.displayName}</h3>
                            {post.author.isVerified && (
                                <div className="w-3.5 h-3.5 bg-blue-500 rounded-full flex items-center justify-center">
                                    <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                            )}
                        </div>
                        <p className="text-xs text-white/40">@{post.author.username} • {formatDate(post.createdAt)}</p>
                    </div>
                </Link>
                <button className="text-white/20 hover:text-white transition-colors">
                    <div className="flex gap-1">
                        <div className="w-1 h-1 rounded-full bg-current" />
                        <div className="w-1 h-1 rounded-full bg-current" />
                        <div className="w-1 h-1 rounded-full bg-current" />
                    </div>
                </button>
            </div>

            {/* Content */}
            {post.caption && (
                <div className="px-4 pb-3">
                    <p className="text-white/90 whitespace-pre-wrap leading-relaxed">{post.caption}</p>
                </div>
            )}

            {/* Media */}
            {post.mediaUrl && (
                <div className="relative aspect-video bg-black w-full">
                    <Image src={post.mediaUrl} alt="" fill className="object-cover" />
                    {post.type === 'VIDEO' && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/10 transition-colors cursor-pointer">
                            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white ring-1 ring-white/30 transition-transform group-hover:scale-110">
                                <PlayIcon size={32} />
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Actions */}
            <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <button
                        onClick={handleLike}
                        className={`flex items-center gap-2 font-medium transition-colors ${isLiked ? 'text-rose-500' : 'text-white/60 hover:text-rose-500'}`}
                    >
                        <HeartIcon size={22} className={isLiked ? 'fill-current' : ''} />
                        <span className="text-sm">{likesCount}</span>
                    </button>

                    <button className="flex items-center gap-2 text-white/60 hover:text-blue-400 transition-colors">
                        <MessageIcon size={22} />
                        <span className="text-sm">{post.commentsCount || 0}</span>
                    </button>

                    <button className="text-white/60 hover:text-green-400 transition-colors">
                        <ShareIcon size={22} />
                    </button>
                </div>

                <button className="text-white/60 hover:text-yellow-400 transition-colors">
                    <BookmarkIcon size={22} />
                </button>
            </div>
        </motion.div>
    );
}
