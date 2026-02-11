'use client';

import { useState, useEffect, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_URL } from '@/lib/api';
import Link from 'next/link';

interface CommentData {
    id: string;
    content: string;
    createdAt: string;
    user: {
        id: string;
        username: string;
        displayName: string;
        avatarUrl?: string;
    };
    parentId?: string | null;
    replies?: CommentData[];
    _count?: { replies?: number };
    repliesCount?: number;
}

interface ThreadedCommentsProps {
    postId: string;
    currentUserId?: string;
    isAdmin?: boolean;
    onCommentCountChange?: (delta: number) => void;
    className?: string;
}

function ThreadedCommentsInner({
    postId,
    currentUserId,
    isAdmin,
    onCommentCountChange,
    className = '',
}: ThreadedCommentsProps) {
    const [comments, setComments] = useState<CommentData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [newComment, setNewComment] = useState('');
    const [replyingTo, setReplyingTo] = useState<{ id: string; username: string } | null>(null);
    const [replyText, setReplyText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
    const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
    const [editedContent, setEditedContent] = useState('');

    const getToken = () =>
        typeof window !== 'undefined' ? localStorage.getItem('0g_token') : null;

    const loadComments = useCallback(async () => {
        try {
            const token = getToken();
            const response = await fetch(`${API_URL}/api/v1/posts/${postId}/comments?limit=200`, {
                headers: {
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                credentials: 'include',
            });

            if (!response.ok) return;
            const data = await response.json();
            const all: CommentData[] = data?.comments || [];

            // Build tree: separate top-level and replies
            const topLevel: CommentData[] = [];
            const replyMap = new Map<string, CommentData[]>();

            all.forEach((c: CommentData) => {
                if (!c.parentId) {
                    topLevel.push({ ...c, replies: [] });
                } else {
                    const replies = replyMap.get(c.parentId) || [];
                    replies.push({ ...c, replies: [] });
                    replyMap.set(c.parentId, replies);
                }
            });

            // Attach replies to their parents
            topLevel.forEach((c) => {
                c.replies = replyMap.get(c.id) || [];
            });

            // Also attach nested replies (depth > 1)
            all.forEach((c) => {
                if (c.parentId && !topLevel.find((t) => t.id === c.parentId)) {
                    // This is a reply to a reply — find the parent in replyMap
                    for (const replies of Array.from(replyMap.values())) {
                        const parent = replies.find((r) => r.id === c.parentId);
                        if (parent) {
                            if (!parent.replies) parent.replies = [];
                            if (!parent.replies.find((r) => r.id === c.id)) {
                                parent.replies.push({ ...c, replies: [] });
                            }
                            break;
                        }
                    }
                }
            });

            setComments(topLevel);
        } catch {
            // Silently fail
        }
        setIsLoading(false);
    }, [postId]);

    useEffect(() => {
        loadComments();
    }, [loadComments]);

    const handleSubmit = async (parentId?: string) => {
        const text = parentId ? replyText.trim() : newComment.trim();
        if (!text) return;

        setIsSubmitting(true);
        try {
            const token = getToken();
            const response = await fetch(`${API_URL}/api/v1/posts/${postId}/comments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                credentials: 'include',
                body: JSON.stringify({ content: text, parentId }),
            });

            if (response.ok) {
                if (parentId) {
                    setReplyText('');
                } else {
                    setNewComment('');
                }
                setReplyingTo(null);
                onCommentCountChange?.(1);
                await loadComments();

                // Auto-expand replies for the parent comment
                if (parentId) {
                    setExpandedReplies((prev) => {
                        const next = new Set(prev);
                        next.add(parentId);
                        return next;
                    });
                }
            }
        } catch {
            // Silently fail
        }
        setIsSubmitting(false);
    };

    const handleEditComment = async (commentId: string) => {
        if (!editedContent.trim()) return;

        try {
            const token = getToken();
            const response = await fetch(
                `${API_URL}/api/v1/posts/${postId}/comments/${commentId}`,
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    },
                    credentials: 'include',
                    body: JSON.stringify({ content: editedContent }),
                }
            );

            if (response.ok) {
                setEditingCommentId(null);
                setEditedContent('');
                await loadComments();
            }
        } catch {
            // Silently fail
        }
    };

    const handleDeleteComment = async (commentId: string) => {
        if (!confirm('Delete this comment?')) return;

        try {
            const token = getToken();
            const response = await fetch(
                `${API_URL}/api/v1/posts/${postId}/comments/${commentId}`,
                {
                    method: 'DELETE',
                    headers: {
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    },
                    credentials: 'include',
                }
            );

            if (response.ok) {
                onCommentCountChange?.(-1);
                await loadComments();
            }
        } catch {
            // Silently fail
        }
    };

    const toggleReplies = (commentId: string) => {
        setExpandedReplies((prev) => {
            const next = new Set(prev);
            if (next.has(commentId)) next.delete(commentId);
            else next.add(commentId);
            return next;
        });
    };

    const formatTime = (date: string) => {
        const diff = Date.now() - new Date(date).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'now';
        if (mins < 60) return `${mins}m`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h`;
        const days = Math.floor(hours / 24);
        if (days < 30) return `${days}d`;
        return new Date(date).toLocaleDateString();
    };

    const CommentItem = ({ comment, depth = 0 }: { comment: CommentData; depth?: number }) => {
        const hasReplies = comment.replies && comment.replies.length > 0;
        const isExpanded = expandedReplies.has(comment.id);
        const canEdit = currentUserId === comment.user.id || isAdmin;
        const isEditing = editingCommentId === comment.id;

        return (
            <div className={depth > 0 ? 'ml-8 pl-4 border-l border-white/5' : ''}>
                <div className="flex gap-3 py-3 group">
                    {/* Avatar */}
                    <Link href={`/profile/${comment.user.username}`} className="flex-shrink-0">
                        {comment.user.avatarUrl ? (
                            <img
                                src={comment.user.avatarUrl}
                                alt=""
                                className="w-8 h-8 rounded-full object-cover"
                            />
                        ) : (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#B8942D] flex items-center justify-center text-xs font-bold text-black">
                                {comment.user.displayName?.[0]?.toUpperCase() || 'U'}
                            </div>
                        )}
                    </Link>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <Link
                                href={`/profile/${comment.user.username}`}
                                className="text-white text-sm font-semibold hover:underline"
                            >
                                {comment.user.displayName || comment.user.username}
                            </Link>
                            <span className="text-white/30 text-xs">
                                {formatTime(comment.createdAt)}
                            </span>

                            {/* Edit/Delete actions */}
                            {canEdit && !isEditing && (
                                <div className="flex gap-2 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => {
                                            setEditingCommentId(comment.id);
                                            setEditedContent(comment.content);
                                        }}
                                        className="text-white/40 hover:text-amber-400 transition-colors text-xs"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDeleteComment(comment.id)}
                                        className="text-white/40 hover:text-rose-400 transition-colors text-xs"
                                    >
                                        Delete
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Comment content - editable or display */}
                        {isEditing ? (
                            <div className="mt-1 space-y-2">
                                <textarea
                                    value={editedContent}
                                    onChange={(e) => setEditedContent(e.target.value)}
                                    className="w-full bg-white/5 rounded-xl px-3 py-2 text-white text-sm border border-white/10 focus:border-[#D4AF37]/50 focus:outline-none transition-colors resize-none"
                                    rows={2}
                                    autoFocus
                                />
                                <div className="flex gap-2 justify-end">
                                    <button
                                        onClick={() => {
                                            setEditingCommentId(null);
                                            setEditedContent('');
                                        }}
                                        className="px-3 py-1 rounded-lg bg-white/10 text-white/70 hover:bg-white/20 transition-colors text-sm"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => handleEditComment(comment.id)}
                                        className="px-3 py-1 rounded-lg bg-[#D4AF37] text-black font-semibold hover:opacity-90 transition-opacity text-sm"
                                    >
                                        Save
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <p className="text-white/80 text-sm mt-0.5 whitespace-pre-wrap break-words">
                                {comment.content}
                            </p>
                        )}

                        {/* Actions: Reply + Show/Hide replies */}
                        {!isEditing && (
                            <div className="flex items-center gap-4 mt-1.5">
                                {currentUserId && (
                                    <button
                                        onClick={() => {
                                            if (replyingTo?.id === comment.id) {
                                                setReplyingTo(null);
                                                setReplyText('');
                                            } else {
                                                setReplyingTo({
                                                    id: comment.id,
                                                    username: comment.user.username,
                                                });
                                                setReplyText('');
                                            }
                                        }}
                                        className="text-white/30 text-xs hover:text-[#D4AF37] transition-colors"
                                    >
                                        Reply
                                    </button>
                                )}
                                {hasReplies && (
                                    <button
                                        onClick={() => toggleReplies(comment.id)}
                                        className="text-[#D4AF37]/60 text-xs hover:text-[#D4AF37] transition-colors"
                                    >
                                        {isExpanded ? 'Hide' : 'View'}{' '}
                                        {comment.replies!.length}{' '}
                                        {comment.replies!.length === 1 ? 'reply' : 'replies'}
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Inline reply input */}
                        <AnimatePresence>
                            {replyingTo?.id === comment.id && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="mt-2 overflow-hidden"
                                >
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={replyText}
                                            onChange={(e) => setReplyText(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleSubmit(comment.id);
                                                }
                                            }}
                                            placeholder={`Reply to @${comment.user.username}...`}
                                            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37]/50"
                                            autoFocus
                                        />
                                        <button
                                            onClick={() => handleSubmit(comment.id)}
                                            disabled={!replyText.trim() || isSubmitting}
                                            className="px-3 py-2 rounded-xl bg-[#D4AF37] text-black text-sm font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
                                        >
                                            Reply
                                        </button>
                                        <button
                                            onClick={() => {
                                                setReplyingTo(null);
                                                setReplyText('');
                                            }}
                                            className="px-2 text-white/30 hover:text-white text-sm"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Nested replies */}
                <AnimatePresence>
                    {hasReplies && isExpanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                        >
                            {comment.replies!.map((reply) => (
                                <CommentItem
                                    key={reply.id}
                                    comment={reply}
                                    depth={depth + 1}
                                />
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    };

    return (
        <div className={className}>
            {/* New top-level comment input */}
            {currentUserId && !replyingTo && (
                <div className="flex gap-2 mb-4">
                    <input
                        type="text"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSubmit();
                            }
                        }}
                        placeholder="Add a comment..."
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37]/50"
                    />
                    <button
                        onClick={() => handleSubmit()}
                        disabled={!newComment.trim() || isSubmitting}
                        className="px-4 py-2.5 rounded-xl bg-[#D4AF37] text-black text-sm font-semibold disabled:opacity-50 hover:opacity-90 transition-opacity"
                    >
                        Post
                    </button>
                </div>
            )}

            {/* Comments list */}
            {isLoading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="flex gap-3 py-3">
                            <div className="w-8 h-8 rounded-full bg-white/10 animate-pulse flex-shrink-0" />
                            <div className="flex-1 space-y-2">
                                <div className="h-3 w-24 rounded bg-white/10 animate-pulse" />
                                <div className="h-3 w-full rounded bg-white/10 animate-pulse" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : comments.length === 0 ? (
                <p className="text-white/30 text-sm text-center py-8">
                    No comments yet. Be the first to share your thoughts.
                </p>
            ) : (
                <div className="divide-y divide-white/5">
                    {comments.map((comment) => (
                        <CommentItem key={comment.id} comment={comment} />
                    ))}
                </div>
            )}
        </div>
    );
}

// Memoize ThreadedComments — only re-render when postId or user context changes
export const ThreadedComments = memo(ThreadedCommentsInner, (prev, next) => (
    prev.postId === next.postId &&
    prev.currentUserId === next.currentUserId &&
    prev.isAdmin === next.isAdmin &&
    prev.className === next.className
));
