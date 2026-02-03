'use client';

import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import Image from 'next/image';
import { ReactNode, useState, useRef, useCallback } from 'react';

// ============================================
// SOCIAL COMPONENTS
// Six22 Silk Road Renaissance Social Features
// ============================================

// ============================================
// POST CARD
// Social media post with interactions
// ============================================

interface PostCardProps {
    author: {
        name: string;
        username: string;
        avatar?: string;
        verified?: boolean;
    };
    content: string;
    image?: string;
    video?: string;
    likes: number;
    comments: number;
    shares: number;
    time: string;
    isLiked?: boolean;
    isSaved?: boolean;
    onLike?: () => void;
    onComment?: () => void;
    onShare?: () => void;
    onSave?: () => void;
    onProfileClick?: () => void;
    className?: string;
}

export function PostCard({
    author,
    content,
    image,
    video,
    likes,
    comments,
    shares,
    time,
    isLiked = false,
    isSaved = false,
    onLike,
    onComment,
    onShare,
    onSave,
    onProfileClick,
    className = '',
}: PostCardProps) {
    const [showFullContent, setShowFullContent] = useState(false);
    const maxContentLength = 280;
    const shouldTruncate = content.length > maxContentLength;

    const displayContent = shouldTruncate && !showFullContent
        ? content.slice(0, maxContentLength) + '...'
        : content;

    const formatNumber = (n: number) => {
        if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
        if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
        return String(n);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`bg-white/5 border border-white/10 rounded-2xl overflow-hidden ${className}`}
        >
            {/* Header */}
            <div className="flex items-center gap-3 p-4">
                <button onClick={onProfileClick} className="relative shrink-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-rose-500 p-0.5">
                        <div className="w-full h-full rounded-full bg-[#0a0a12] flex items-center justify-center overflow-hidden">
                            {author.avatar ? (
                                <Image src={author.avatar} alt={author.name} width={36} height={36} className="rounded-full object-cover" />
                            ) : (
                                <span className="text-white font-medium">{author.name.charAt(0)}</span>
                            )}
                        </div>
                    </div>
                </button>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                        <span className="font-semibold text-white truncate">{author.name}</span>
                        {author.verified && (
                            <svg className="w-4 h-4 text-violet-400 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                            </svg>
                        )}
                    </div>
                    <div className="text-sm text-white/50">@{author.username} · {time}</div>
                </div>

                <button className="p-2 text-white/40 hover:text-white/60 transition-colors">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01" />
                    </svg>
                </button>
            </div>

            {/* Content */}
            <div className="px-4 pb-3">
                <p className="text-white whitespace-pre-wrap">
                    {displayContent}
                </p>
                {shouldTruncate && (
                    <button
                        onClick={() => setShowFullContent(!showFullContent)}
                        className="text-violet-400 text-sm mt-1 hover:underline"
                    >
                        {showFullContent ? 'Show less' : 'Show more'}
                    </button>
                )}
            </div>

            {/* Media */}
            {image && (
                <div className="relative aspect-[4/3] bg-white/5">
                    <Image src={image} alt="" fill className="object-cover" />
                </div>
            )}

            {video && (
                <div className="relative aspect-video bg-black">
                    <video src={video} controls className="w-full h-full" />
                </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
                <motion.button
                    onClick={onLike}
                    whileTap={{ scale: 0.9 }}
                    className={`flex items-center gap-2 ${isLiked ? 'text-rose-400' : 'text-white/50 hover:text-rose-400'} transition-colors`}
                >
                    <motion.svg
                        animate={{ scale: isLiked ? [1, 1.3, 1] : 1 }}
                        className="w-5 h-5"
                        fill={isLiked ? 'currentColor' : 'none'}
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </motion.svg>
                    <span className="text-sm">{formatNumber(likes)}</span>
                </motion.button>

                <button
                    onClick={onComment}
                    className="flex items-center gap-2 text-white/50 hover:text-violet-400 transition-colors"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <span className="text-sm">{formatNumber(comments)}</span>
                </button>

                <button
                    onClick={onShare}
                    className="flex items-center gap-2 text-white/50 hover:text-cyan-400 transition-colors"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                    <span className="text-sm">{formatNumber(shares)}</span>
                </button>

                <motion.button
                    onClick={onSave}
                    whileTap={{ scale: 0.9 }}
                    className={`${isSaved ? 'text-amber-400' : 'text-white/50 hover:text-amber-400'} transition-colors`}
                >
                    <svg className="w-5 h-5" fill={isSaved ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                </motion.button>
            </div>
        </motion.div>
    );
}

// ============================================
// STORY RING
// Instagram/Snapchat style story
// ============================================

interface StoryRingProps {
    user: {
        name: string;
        avatar?: string;
    };
    hasUnviewed?: boolean;
    isLive?: boolean;
    onClick?: () => void;
    size?: 'sm' | 'md' | 'lg';
}

export function StoryRing({
    user,
    hasUnviewed = true,
    isLive = false,
    onClick,
    size = 'md',
}: StoryRingProps) {
    const sizes = {
        sm: { container: 'w-14 h-14', avatar: 'w-12 h-12', ring: 2 },
        md: { container: 'w-18 h-18', avatar: 'w-16 h-16', ring: 3 },
        lg: { container: 'w-24 h-24', avatar: 'w-20 h-20', ring: 4 },
    };

    const { container, avatar } = sizes[size];

    return (
        <button onClick={onClick} className="flex flex-col items-center gap-1">
            <div className={`relative ${container}`}>
                <div className={`
                    absolute inset-0 rounded-full
                    ${hasUnviewed
                        ? 'bg-gradient-to-br from-violet-500 via-rose-500 to-amber-500'
                        : 'bg-white/20'}
                    ${isLive ? 'animate-pulse' : ''}
                `} />
                <div className={`absolute inset-[3px] rounded-full bg-[#0a0a12] flex items-center justify-center`}>
                    <div className={`${avatar} rounded-full bg-white/10 overflow-hidden`}>
                        {user.avatar ? (
                            <Image src={user.avatar} alt={user.name} fill className="object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-white font-medium">
                                {user.name.charAt(0)}
                            </div>
                        )}
                    </div>
                </div>

                {isLive && (
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-rose-500 rounded-full text-[10px] font-bold text-white uppercase">
                        LIVE
                    </div>
                )}
            </div>
            <span className="text-xs text-white/60 truncate max-w-[60px]">{user.name}</span>
        </button>
    );
}

// ============================================
// COMMENT THREAD
// Nested comment display
// ============================================

interface Comment {
    id: string;
    author: {
        name: string;
        username: string;
        avatar?: string;
    };
    content: string;
    time: string;
    likes: number;
    isLiked?: boolean;
    replies?: Comment[];
}

interface CommentThreadProps {
    comments: Comment[];
    onLike?: (commentId: string) => void;
    onReply?: (commentId: string) => void;
    className?: string;
}

export function CommentThread({
    comments,
    onLike,
    onReply,
    className = '',
}: CommentThreadProps) {
    const renderComment = (comment: Comment, depth = 0) => (
        <div key={comment.id} className={depth > 0 ? 'ml-8 mt-3' : ''}>
            <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-rose-500 p-0.5 shrink-0">
                    <div className="w-full h-full rounded-full bg-[#0a0a12] overflow-hidden">
                        {comment.author.avatar ? (
                            <Image src={comment.author.avatar} alt={comment.author.name} width={28} height={28} className="object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-white text-xs">
                                {comment.author.name.charAt(0)}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex-1">
                    <div className="bg-white/5 rounded-xl px-3 py-2">
                        <div className="flex items-center gap-2">
                            <span className="font-medium text-white text-sm">{comment.author.name}</span>
                            <span className="text-xs text-white/40">{comment.time}</span>
                        </div>
                        <p className="text-white/80 text-sm mt-1">{comment.content}</p>
                    </div>

                    <div className="flex items-center gap-4 mt-1 px-2">
                        <button
                            onClick={() => onLike?.(comment.id)}
                            className={`text-xs ${comment.isLiked ? 'text-rose-400' : 'text-white/40 hover:text-white/60'}`}
                        >
                            {comment.likes > 0 && `${comment.likes} `}Like
                        </button>
                        <button
                            onClick={() => onReply?.(comment.id)}
                            className="text-xs text-white/40 hover:text-white/60"
                        >
                            Reply
                        </button>
                    </div>
                </div>
            </div>

            {comment.replies?.map(reply => renderComment(reply, depth + 1))}
        </div>
    );

    return (
        <div className={`space-y-4 ${className}`}>
            {comments.map(comment => renderComment(comment))}
        </div>
    );
}

// ============================================
// USER LIST ITEM
// User display with follow action
// ============================================

interface UserListItemProps {
    user: {
        name: string;
        username: string;
        avatar?: string;
        verified?: boolean;
        bio?: string;
        followers?: number;
        isFollowing?: boolean;
    };
    onFollow?: () => void;
    onProfileClick?: () => void;
    showFollowButton?: boolean;
    className?: string;
}

export function UserListItem({
    user,
    onFollow,
    onProfileClick,
    showFollowButton = true,
    className = '',
}: UserListItemProps) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors ${className}`}
        >
            <button onClick={onProfileClick} className="shrink-0">
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
            </button>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                    <button onClick={onProfileClick} className="font-semibold text-white truncate hover:underline">
                        {user.name}
                    </button>
                    {user.verified && (
                        <svg className="w-4 h-4 text-violet-400 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                        </svg>
                    )}
                </div>
                <div className="text-sm text-white/50 truncate">@{user.username}</div>
                {user.bio && (
                    <div className="text-sm text-white/60 truncate mt-0.5">{user.bio}</div>
                )}
            </div>

            {showFollowButton && (
                <motion.button
                    onClick={onFollow}
                    whileTap={{ scale: 0.95 }}
                    className={`
                        px-4 py-1.5 rounded-full text-sm font-medium transition-all
                        ${user.isFollowing
                            ? 'bg-white/10 text-white hover:bg-white/20'
                            : 'bg-violet-500 text-white hover:bg-violet-600'}
                    `}
                >
                    {user.isFollowing ? 'Following' : 'Follow'}
                </motion.button>
            )}
        </motion.div>
    );
}

// ============================================
// NOTIFICATION ITEM
// Notification with action
// ============================================

interface NotificationItemProps {
    type: 'like' | 'comment' | 'follow' | 'mention' | 'share' | 'live';
    user: {
        name: string;
        avatar?: string;
    };
    content?: string;
    postImage?: string;
    time: string;
    read?: boolean;
    onClick?: () => void;
}

export function NotificationItem({
    type,
    user,
    content,
    postImage,
    time,
    read = false,
    onClick,
}: NotificationItemProps) {
    const icons = {
        like: { icon: '❤️', color: 'text-rose-400' },
        comment: { icon: '💬', color: 'text-violet-400' },
        follow: { icon: '👤', color: 'text-cyan-400' },
        mention: { icon: '@', color: 'text-amber-400' },
        share: { icon: '🔗', color: 'text-emerald-400' },
        live: { icon: '🔴', color: 'text-rose-500' },
    };

    const messages = {
        like: 'liked your post',
        comment: 'commented on your post',
        follow: 'started following you',
        mention: 'mentioned you',
        share: 'shared your post',
        live: 'went live',
    };

    return (
        <motion.button
            onClick={onClick}
            whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
            className={`
                w-full flex items-center gap-3 p-4 text-left transition-colors
                ${!read ? 'bg-violet-500/5' : ''}
            `}
        >
            <div className="relative shrink-0">
                <div className="w-12 h-12 rounded-full bg-white/10 overflow-hidden">
                    {user.avatar ? (
                        <Image src={user.avatar} alt={user.name} width={48} height={48} className="object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-white font-medium">
                            {user.name.charAt(0)}
                        </div>
                    )}
                </div>
                <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#0a0a12] flex items-center justify-center text-xs ${icons[type].color}`}>
                    {icons[type].icon}
                </div>
            </div>

            <div className="flex-1 min-w-0">
                <p className="text-white">
                    <span className="font-semibold">{user.name}</span>{' '}
                    <span className="text-white/70">{messages[type]}</span>
                    {content && <span className="text-white/50"> &ldquo;{content}&rdquo;</span>}
                </p>
                <p className="text-xs text-white/40 mt-0.5">{time}</p>
            </div>

            {postImage && (
                <div className="w-12 h-12 rounded-lg bg-white/10 overflow-hidden shrink-0">
                    <Image src={postImage} alt="" width={48} height={48} className="object-cover" />
                </div>
            )}

            {!read && (
                <div className="w-2 h-2 rounded-full bg-violet-500 shrink-0" />
            )}
        </motion.button>
    );
}

// ============================================
// SWIPEABLE CARD
// Tinder-style swipe interaction
// ============================================

interface SwipeableCardProps {
    children: ReactNode;
    onSwipeLeft?: () => void;
    onSwipeRight?: () => void;
    onSwipeUp?: () => void;
    threshold?: number;
    className?: string;
}

export function SwipeableCard({
    children,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    threshold = 100,
    className = '',
}: SwipeableCardProps) {
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const rotate = useTransform(x, [-200, 200], [-15, 15]);
    const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0.5, 1, 1, 1, 0.5]);

    const leftIndicatorOpacity = useTransform(x, [-threshold, 0], [1, 0]);
    const rightIndicatorOpacity = useTransform(x, [0, threshold], [0, 1]);

    const handleDragEnd = (_: any, info: PanInfo) => {
        if (info.offset.x < -threshold) {
            onSwipeLeft?.();
        } else if (info.offset.x > threshold) {
            onSwipeRight?.();
        } else if (info.offset.y < -threshold) {
            onSwipeUp?.();
        }
    };

    return (
        <motion.div
            drag
            dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
            dragElastic={0.7}
            onDragEnd={handleDragEnd}
            style={{ x, y, rotate, opacity }}
            className={`relative cursor-grab active:cursor-grabbing ${className}`}
        >
            {children}

            <motion.div
                style={{ opacity: leftIndicatorOpacity }}
                className="absolute top-1/2 left-4 -translate-y-1/2 px-4 py-2 bg-rose-500 rounded-lg text-white font-bold rotate-[-15deg]"
            >
                NOPE
            </motion.div>

            <motion.div
                style={{ opacity: rightIndicatorOpacity }}
                className="absolute top-1/2 right-4 -translate-y-1/2 px-4 py-2 bg-emerald-500 rounded-lg text-white font-bold rotate-[15deg]"
            >
                LIKE
            </motion.div>
        </motion.div>
    );
}

// ============================================
// POLL COMPONENT
// Interactive poll with live results
// ============================================

interface PollOption {
    id: string;
    text: string;
    votes: number;
}

interface PollProps {
    question: string;
    options: PollOption[];
    totalVotes: number;
    selectedId?: string;
    onVote?: (optionId: string) => void;
    showResults?: boolean;
    className?: string;
}

export function Poll({
    question,
    options,
    totalVotes,
    selectedId,
    onVote,
    showResults = false,
    className = '',
}: PollProps) {
    const hasVoted = !!selectedId || showResults;

    return (
        <div className={`p-4 bg-white/5 border border-white/10 rounded-2xl ${className}`}>
            <p className="text-white font-medium mb-4">{question}</p>

            <div className="space-y-2">
                {options.map((option) => {
                    const percentage = totalVotes > 0 ? (option.votes / totalVotes) * 100 : 0;
                    const isSelected = option.id === selectedId;

                    return (
                        <button
                            key={option.id}
                            onClick={() => !hasVoted && onVote?.(option.id)}
                            disabled={hasVoted}
                            className={`
                                relative w-full p-3 rounded-xl text-left overflow-hidden
                                transition-all
                                ${hasVoted
                                    ? 'cursor-default'
                                    : 'hover:bg-white/10 cursor-pointer'}
                                ${isSelected ? 'ring-2 ring-violet-500' : 'bg-white/5'}
                            `}
                        >
                            {hasVoted && (
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${percentage}%` }}
                                    transition={{ duration: 0.5 }}
                                    className="absolute inset-y-0 left-0 bg-violet-500/20 rounded-xl"
                                />
                            )}

                            <div className="relative flex items-center justify-between">
                                <span className={`${isSelected ? 'text-white font-medium' : 'text-white/80'}`}>
                                    {option.text}
                                </span>
                                {hasVoted && (
                                    <span className="text-white/60 text-sm">
                                        {percentage.toFixed(0)}%
                                    </span>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>

            <p className="text-xs text-white/40 mt-3">
                {totalVotes.toLocaleString()} vote{totalVotes !== 1 ? 's' : ''}
            </p>
        </div>
    );
}

// ============================================
// EXPORTS
// ============================================

export {
    type PostCardProps,
    type StoryRingProps,
    type Comment,
    type CommentThreadProps,
    type UserListItemProps,
    type NotificationItemProps,
    type SwipeableCardProps,
    type PollOption,
    type PollProps,
};
