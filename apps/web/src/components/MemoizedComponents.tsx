'use client';

import React, { memo, ComponentType, useCallback, useMemo, ReactNode } from 'react';
import { motion, MotionProps } from 'framer-motion';

// ============================================
// PERFORMANCE-OPTIMIZED LIST ITEM WRAPPER
// ============================================

interface MemoizedListItemProps {
    children: ReactNode;
    className?: string;
    animate?: boolean;
    motionProps?: MotionProps;
}

/**
 * Memoized list item wrapper that prevents unnecessary re-renders
 * Use this to wrap items in long lists for better performance
 */
export const MemoizedListItem = memo(function MemoizedListItem({
    children,
    className = '',
    animate = true,
    motionProps,
}: MemoizedListItemProps) {
    if (animate) {
        return (
            <motion.div
                className={className}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                {...motionProps}
            >
                {children}
            </motion.div>
        );
    }
    return <div className={className}>{children}</div>;
});

// ============================================
// POST CARD MEMOIZED
// ============================================

interface PostCardMemoProps {
    id: string;
    content: string;
    author: {
        name: string;
        avatar?: string;
        username: string;
    };
    createdAt: Date | string;
    likes: number;
    comments: number;
    isLiked?: boolean;
    images?: string[];
    onLike?: (id: string) => void;
    onComment?: (id: string) => void;
    onShare?: (id: string) => void;
}

export const PostCardMemo = memo(function PostCardMemo({
    id,
    content,
    author,
    createdAt,
    likes,
    comments,
    isLiked = false,
    images = [],
    onLike,
    onComment,
    onShare,
}: PostCardMemoProps) {
    const handleLike = useCallback(() => onLike?.(id), [id, onLike]);
    const handleComment = useCallback(() => onComment?.(id), [id, onComment]);
    const handleShare = useCallback(() => onShare?.(id), [id, onShare]);

    const formattedDate = useMemo(() => {
        const date = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m`;
        if (hours < 24) return `${hours}h`;
        if (days < 7) return `${days}d`;
        return date.toLocaleDateString();
    }, [createdAt]);

    return (
        <article className="bg-white/5 rounded-2xl border border-white/10 p-5 hover:border-white/20 transition-colors">
            {/* Author Header */}
            <header className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center text-white font-medium">
                    {author.avatar || author.name.charAt(0)}
                </div>
                <div className="flex-1">
                    <p className="font-medium text-white">{author.name}</p>
                    <p className="text-sm text-white/40">@{author.username} · {formattedDate}</p>
                </div>
            </header>

            {/* Content */}
            <p className="text-white/80 mb-4 whitespace-pre-wrap">{content}</p>

            {/* Images */}
            {images.length > 0 && (
                <div className={`grid gap-2 mb-4 ${images.length === 1 ? '' : 'grid-cols-2'}`}>
                    {images.slice(0, 4).map((img, i) => (
                        <div key={i} className="relative aspect-video rounded-xl overflow-hidden">
                            <img src={img} alt="" className="w-full h-full object-cover" loading="lazy" />
                        </div>
                    ))}
                </div>
            )}

            {/* Actions */}
            <footer className="flex items-center gap-6 pt-3 border-t border-white/5">
                <button
                    onClick={handleLike}
                    className={`flex items-center gap-2 text-sm transition-colors ${isLiked ? 'text-red-400' : 'text-white/40 hover:text-red-400'
                        }`}
                >
                    {isLiked ? '❤️' : '🤍'} {likes > 0 && likes}
                </button>
                <button
                    onClick={handleComment}
                    className="flex items-center gap-2 text-sm text-white/40 hover:text-cyan-400 transition-colors"
                >
                    💬 {comments > 0 && comments}
                </button>
                <button
                    onClick={handleShare}
                    className="flex items-center gap-2 text-sm text-white/40 hover:text-emerald-400 transition-colors"
                >
                    🔗 Share
                </button>
            </footer>
        </article>
    );
}, (prevProps, nextProps) => {
    // Custom comparison for performance
    return (
        prevProps.id === nextProps.id &&
        prevProps.likes === nextProps.likes &&
        prevProps.comments === nextProps.comments &&
        prevProps.isLiked === nextProps.isLiked &&
        prevProps.content === nextProps.content
    );
});

// ============================================
// MEMBER CARD MEMOIZED
// ============================================

interface MemberCardMemoProps {
    id: string;
    name: string;
    avatar?: string;
    role?: string;
    isOnline?: boolean;
    onSelect?: (id: string) => void;
}

export const MemberCardMemo = memo(function MemberCardMemo({
    id,
    name,
    avatar,
    role,
    isOnline,
    onSelect,
}: MemberCardMemoProps) {
    const handleClick = useCallback(() => onSelect?.(id), [id, onSelect]);

    return (
        <button
            onClick={handleClick}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-left"
        >
            <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white">
                    {avatar || name.charAt(0)}
                </div>
                {isOnline !== undefined && (
                    <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-gray-900 ${isOnline ? 'bg-emerald-500' : 'bg-gray-500'
                        }`} />
                )}
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-medium text-white truncate">{name}</p>
                {role && <p className="text-sm text-white/40 truncate">{role}</p>}
            </div>
        </button>
    );
});

// ============================================
// NOTIFICATION ITEM MEMOIZED
// ============================================

interface NotificationMemoProps {
    id: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    timestamp: Date | string;
    isRead: boolean;
    onMarkRead?: (id: string) => void;
    onClick?: (id: string) => void;
}

export const NotificationMemo = memo(function NotificationMemo({
    id,
    title,
    message,
    type,
    timestamp,
    isRead,
    onMarkRead,
    onClick,
}: NotificationMemoProps) {
    const handleClick = useCallback(() => {
        onClick?.(id);
        if (!isRead) onMarkRead?.(id);
    }, [id, isRead, onClick, onMarkRead]);

    const typeStyles = {
        info: 'border-cyan-500/30 bg-cyan-500/10',
        success: 'border-emerald-500/30 bg-emerald-500/10',
        warning: 'border-amber-500/30 bg-amber-500/10',
        error: 'border-red-500/30 bg-red-500/10',
    };

    return (
        <button
            onClick={handleClick}
            className={`
                w-full p-4 rounded-xl border text-left transition-colors
                ${isRead ? 'bg-white/5 border-white/10' : typeStyles[type]}
                hover:bg-white/10
            `}
        >
            <div className="flex items-start gap-3">
                <div className={`mt-1 w-2 h-2 rounded-full ${isRead ? 'bg-white/20' : 'bg-cyan-500'}`} />
                <div className="flex-1 min-w-0">
                    <p className={`font-medium ${isRead ? 'text-white/60' : 'text-white'}`}>{title}</p>
                    <p className="text-sm text-white/40 line-clamp-2">{message}</p>
                    <p className="text-xs text-white/30 mt-1">
                        {typeof timestamp === 'string' ? timestamp : timestamp.toLocaleString()}
                    </p>
                </div>
            </div>
        </button>
    );
});

// ============================================
// HIGH-ORDER COMPONENT FOR MEMOIZATION
// ============================================

/**
 * HOC to add memoization to any component
 */
export function withMemo<P extends object>(
    Component: ComponentType<P>,
    propsAreEqual?: (prevProps: Readonly<P>, nextProps: Readonly<P>) => boolean
) {
    return memo(Component, propsAreEqual);
}

// ============================================
// EXPORTS
// ============================================

const MemoizedComponents = {
    MemoizedListItem,
    PostCardMemo,
    MemberCardMemo,
    NotificationMemo,
    withMemo,
};

export default MemoizedComponents;
