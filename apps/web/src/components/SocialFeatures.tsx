'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================
// FOLLOW SUGGESTIONS
// Suggested users to follow
// ============================================

interface SuggestedUser {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
    bio?: string;
    followerCount: number;
    isVerified?: boolean;
    mutualFollowers?: number;
}

interface FollowSuggestionsProps {
    suggestions?: SuggestedUser[];
    onFollow: (userId: string) => void;
    onDismiss?: (userId: string) => void;
    loading?: boolean;
}

export function FollowSuggestions({
    suggestions = [],
    onFollow,
    onDismiss,
    loading = false
}: FollowSuggestionsProps) {
    const [dismissed, setDismissed] = useState<Set<string>>(new Set());
    const [followed, setFollowed] = useState<Set<string>>(new Set());

    const handleFollow = useCallback((userId: string) => {
        setFollowed(prev => new Set(Array.from(prev).concat(userId)));
        onFollow(userId);
    }, [onFollow]);

    const handleDismiss = useCallback((userId: string) => {
        setDismissed(prev => new Set(Array.from(prev).concat(userId)));
        onDismiss?.(userId);
    }, [onDismiss]);

    const visibleSuggestions = suggestions.filter(s => !dismissed.has(s.id));

    if (loading) {
        return (
            <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3 animate-pulse">
                        <div className="w-12 h-12 rounded-full bg-white/10" />
                        <div className="flex-1">
                            <div className="h-4 w-24 rounded bg-white/10 mb-2" />
                            <div className="h-3 w-16 rounded bg-white/5" />
                        </div>
                        <div className="w-20 h-8 rounded-full bg-white/10" />
                    </div>
                ))}
            </div>
        );
    }

    if (visibleSuggestions.length === 0) {
        return null;
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="font-semibold text-white">Suggested for you</h3>
                <Link href="/explore?tab=people" className="text-xs text-[#00D4FF] hover:underline">
                    See All
                </Link>
            </div>

            <div className="space-y-3">
                {visibleSuggestions.slice(0, 5).map((user) => (
                    <motion.div
                        key={user.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        className="flex items-center gap-3"
                    >
                        <Link href={`/profile/${user.username}`} className="flex-shrink-0">
                            <div className="w-11 h-11 rounded-full overflow-hidden bg-gradient-to-br from-[#00D4FF] to-[#8B5CF6] p-[2px]">
                                <div className="w-full h-full rounded-full overflow-hidden bg-[#1A1A1F]">
                                    {user.avatarUrl ? (
                                        <Image
                                            src={user.avatarUrl}
                                            alt={user.displayName}
                                            width={44}
                                            height={44}
                                            className="object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-white/60 font-bold">
                                            {user.displayName[0]}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Link>

                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1">
                                <Link href={`/profile/${user.username}`} className="font-medium text-white text-sm truncate hover:underline">
                                    {user.displayName}
                                </Link>
                                {user.isVerified && <span className="text-[#00D4FF]">✓</span>}
                            </div>
                            <p className="text-xs text-white/40 truncate">
                                {user.mutualFollowers ? `${user.mutualFollowers} mutual followers` : `@${user.username}`}
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            {followed.has(user.id) ? (
                                <span className="text-xs text-white/40 px-3 py-1.5">Following</span>
                            ) : (
                                <button
                                    onClick={() => handleFollow(user.id)}
                                    className="px-4 py-1.5 rounded-full bg-[#00D4FF] text-black text-xs font-semibold hover:opacity-90 transition-opacity"
                                >
                                    Follow
                                </button>
                            )}
                            {onDismiss && (
                                <button
                                    onClick={() => handleDismiss(user.id)}
                                    className="text-white/40 hover:text-white transition-colors"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}

// ============================================
// MUTUAL FRIENDS
// Show mutual connections
// ============================================

interface MutualFriendsProps {
    friends: Array<{
        id: string;
        username: string;
        displayName: string;
        avatarUrl?: string;
    }>;
    totalCount: number;
    onClick?: () => void;
}

export function MutualFriends({ friends, totalCount, onClick }: MutualFriendsProps) {
    if (friends.length === 0) return null;

    const displayed = friends.slice(0, 3);
    const remaining = totalCount - displayed.length;

    return (
        <button
            onClick={onClick}
            className="flex items-center gap-2 text-sm text-white/50 hover:text-white/70 transition-colors"
        >
            <div className="flex -space-x-2">
                {displayed.map((friend) => (
                    <div
                        key={friend.id}
                        className="w-6 h-6 rounded-full overflow-hidden border-2 border-[#1A1A1F] bg-white/10"
                    >
                        {friend.avatarUrl ? (
                            <Image
                                src={friend.avatarUrl}
                                alt={friend.displayName}
                                width={24}
                                height={24}
                                className="object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-[10px] font-bold">
                                {friend.displayName[0]}
                            </div>
                        )}
                    </div>
                ))}
            </div>
            <span>
                Followed by {displayed[0]?.displayName}
                {remaining > 0 && ` and ${remaining} others you follow`}
            </span>
        </button>
    );
}

// ============================================
// STORY CIRCLES
// Instagram-style story circles
// ============================================

interface Story {
    id: string;
    user: {
        id: string;
        username: string;
        displayName: string;
        avatarUrl?: string;
    };
    hasUnseenStory: boolean;
    storyCount: number;
}

interface StoryCirclesProps {
    stories: Story[];
    onStoryClick: (userId: string) => void;
    onAddStory?: () => void;
    currentUserId?: string;
}

export function StoryCircles({ stories, onStoryClick, onAddStory, currentUserId }: StoryCirclesProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    return (
        <div className="relative">
            <div
                ref={scrollRef}
                className="flex gap-4 overflow-x-auto scrollbar-hide py-2 px-1"
            >
                {/* Add Story (for current user) */}
                {onAddStory && (
                    <button
                        onClick={onAddStory}
                        className="flex flex-col items-center gap-2 flex-shrink-0"
                    >
                        <div className="w-16 h-16 rounded-full border-2 border-dashed border-white/30 flex items-center justify-center hover:border-[#00D4FF] transition-colors">
                            <span className="text-2xl">+</span>
                        </div>
                        <span className="text-xs text-white/60">Add Story</span>
                    </button>
                )}

                {/* Story Circles */}
                {stories.map((story) => (
                    <button
                        key={story.id}
                        onClick={() => onStoryClick(story.user.id)}
                        className="flex flex-col items-center gap-2 flex-shrink-0"
                    >
                        <div className={`p-[3px] rounded-full ${story.hasUnseenStory
                            ? 'bg-gradient-to-br from-[#00D4FF] via-[#8B5CF6] to-[#F43F5E]'
                            : 'bg-white/20'
                            }`}>
                            <div className="w-14 h-14 rounded-full overflow-hidden bg-[#1A1A1F] border-2 border-[#1A1A1F]">
                                {story.user.avatarUrl ? (
                                    <Image
                                        src={story.user.avatarUrl}
                                        alt={story.user.displayName}
                                        width={56}
                                        height={56}
                                        className="object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#00D4FF] to-[#8B5CF6] text-white font-bold text-lg">
                                        {story.user.displayName[0]}
                                    </div>
                                )}
                            </div>
                        </div>
                        <span className="text-xs text-white/60 truncate max-w-[64px]">
                            {story.user.id === currentUserId ? 'Your Story' : story.user.displayName.split(' ')[0]}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
}

// ============================================
// THREAD VIEWER
// View reply threads/conversations
// ============================================

interface ThreadComment {
    id: string;
    author: {
        id: string;
        username: string;
        displayName: string;
        avatarUrl?: string;
        isVerified?: boolean;
    };
    content: string;
    createdAt: string;
    likeCount: number;
    replyCount: number;
    isLiked?: boolean;
}

interface ThreadViewerProps {
    isOpen: boolean;
    onClose: () => void;
    parentComment: ThreadComment;
    replies: ThreadComment[];
    onReply: (content: string, parentId: string) => void;
    onLike: (commentId: string) => void;
    loading?: boolean;
}

export function ThreadViewer({
    isOpen,
    onClose,
    parentComment,
    replies,
    onReply,
    onLike,
    loading = false,
}: ThreadViewerProps) {
    const [replyContent, setReplyContent] = useState('');

    const handleSubmitReply = useCallback(() => {
        if (replyContent.trim()) {
            onReply(replyContent, parentComment.id);
            setReplyContent('');
        }
    }, [replyContent, onReply, parentComment.id]);

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(hours / 24);
        if (hours < 1) return 'now';
        if (hours < 24) return `${hours}h`;
        return `${days}d`;
    };

    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center"
            onClick={onClose}
        >
            <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                className="bg-[#1A1A1F] rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[80vh] overflow-hidden border border-white/10"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                    <h3 className="font-semibold text-white">Thread</h3>
                    <button onClick={onClose} className="text-white/40 hover:text-white">✕</button>
                </div>

                {/* Thread Content */}
                <div className="overflow-y-auto max-h-[50vh]">
                    {/* Parent Comment */}
                    <div className="p-4 border-b border-white/10">
                        <div className="flex gap-3">
                            <div className="w-10 h-10 rounded-full overflow-hidden bg-white/10 flex-shrink-0">
                                {parentComment.author.avatarUrl ? (
                                    <Image
                                        src={parentComment.author.avatarUrl}
                                        alt={parentComment.author.displayName}
                                        width={40}
                                        height={40}
                                        className="object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center font-bold">
                                        {parentComment.author.displayName[0]}
                                    </div>
                                )}
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-1">
                                    <span className="font-semibold text-white">{parentComment.author.displayName}</span>
                                    {parentComment.author.isVerified && <span className="text-[#00D4FF]">✓</span>}
                                    <span className="text-white/40 text-sm">· {formatTime(parentComment.createdAt)}</span>
                                </div>
                                <p className="text-white/80 mt-1">{parentComment.content}</p>
                                <div className="flex items-center gap-4 mt-2 text-sm text-white/50">
                                    <button
                                        onClick={() => onLike(parentComment.id)}
                                        className={`flex items-center gap-1 hover:text-[#00D4FF] ${parentComment.isLiked ? 'text-red-400' : ''}`}
                                    >
                                        {parentComment.isLiked ? '❤️' : '🤍'} {parentComment.likeCount}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Replies */}
                    {loading ? (
                        <div className="p-4 space-y-4">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="flex gap-3 animate-pulse">
                                    <div className="w-8 h-8 rounded-full bg-white/10" />
                                    <div className="flex-1">
                                        <div className="h-3 w-24 rounded bg-white/10 mb-2" />
                                        <div className="h-3 w-full rounded bg-white/5" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-4 space-y-4">
                            {replies.map((reply) => (
                                <div key={reply.id} className="flex gap-3 pl-6 border-l border-white/10">
                                    <div className="w-8 h-8 rounded-full overflow-hidden bg-white/10 flex-shrink-0">
                                        {reply.author.avatarUrl ? (
                                            <Image
                                                src={reply.author.avatarUrl}
                                                alt={reply.author.displayName}
                                                width={32}
                                                height={32}
                                                className="object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-xs font-bold">
                                                {reply.author.displayName[0]}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-1 text-sm">
                                            <span className="font-medium text-white">{reply.author.displayName}</span>
                                            <span className="text-white/40">· {formatTime(reply.createdAt)}</span>
                                        </div>
                                        <p className="text-white/70 text-sm">{reply.content}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Reply Input */}
                <div className="p-4 border-t border-white/10 flex gap-3">
                    <input
                        type="text"
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        placeholder="Add a reply..."
                        className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-white placeholder:text-white/40 focus:outline-none focus:border-[#00D4FF]/50"
                        onKeyDown={(e) => e.key === 'Enter' && handleSubmitReply()}
                    />
                    <button
                        onClick={handleSubmitReply}
                        disabled={!replyContent.trim()}
                        className="px-4 py-2 rounded-full bg-[#00D4FF] text-black font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                        Reply
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}
