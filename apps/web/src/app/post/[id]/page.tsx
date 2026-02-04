'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
    ArrowLeftIcon,
    HeartIcon,
    SendIcon,
    ShareIcon,
} from '@/components/icons';

interface Post {
    id: string;
    content: string;
    mediaUrl?: string;
    mediaType?: 'IMAGE' | 'VIDEO';
    createdAt: string;
    likes: number;
    isLiked: boolean;
    commentsCount: number;
    author: {
        id: string;
        username: string;
        displayName: string;
        avatarUrl?: string;
    };
}

interface Comment {
    id: string;
    content: string;
    createdAt: string;
    author: {
        id: string;
        username: string;
        displayName: string;
        avatarUrl?: string;
    };
}

export default function PostDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { user, isAuthenticated } = useAuth();
    const postId = params.id as string;

    const [post, setPost] = useState<Post | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://caravanserver-production-d7da.up.railway.app';

    const fetchPost = useCallback(async () => {
        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('0g_token') : null;
            const response = await fetch(`${API_URL}/api/v1/posts/${postId}`, {
                headers: {
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                },
                credentials: 'include',
            });

            if (response.ok) {
                const data = await response.json();
                setPost(data.post);
            } else {
                setError('Post not found');
            }
        } catch (err) {
            console.error('Error fetching post:', err);
            setError('Failed to load post');
        }
    }, [postId, API_URL]);

    const fetchComments = useCallback(async () => {
        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('0g_token') : null;
            const response = await fetch(`${API_URL}/api/v1/posts/${postId}/comments`, {
                headers: {
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                },
                credentials: 'include',
            });

            if (response.ok) {
                const data = await response.json();
                setComments(data.comments || []);
            }
        } catch (err) {
            console.error('Error fetching comments:', err);
        } finally {
            setIsLoading(false);
        }
    }, [postId, API_URL]);

    useEffect(() => {
        if (postId) {
            fetchPost();
            fetchComments();
        }
    }, [postId, fetchPost, fetchComments]);

    const handleLike = async () => {
        if (!isAuthenticated) {
            router.push('/login');
            return;
        }

        try {
            const token = localStorage.getItem('0g_token');
            const response = await fetch(`${API_URL}/api/v1/posts/${postId}/like`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok && post) {
                setPost({
                    ...post,
                    isLiked: !post.isLiked,
                    likes: post.isLiked ? post.likes - 1 : post.likes + 1,
                });
            }
        } catch (err) {
            console.error('Error liking post:', err);
        }
    };

    const handleSubmitComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim() || !isAuthenticated) return;

        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('0g_token');
            const response = await fetch(`${API_URL}/api/v1/posts/${postId}/comments`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ content: newComment }),
            });

            if (response.ok) {
                const data = await response.json();
                setComments(prev => [data.comment, ...prev]);
                setNewComment('');
                if (post) {
                    setPost({ ...post, commentsCount: post.commentsCount + 1 });
                }
            }
        } catch (err) {
            console.error('Error posting comment:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleShare = () => {
        const url = `${window.location.origin}/post/${postId}`;
        navigator.clipboard.writeText(url);
        alert('Link copied to clipboard!');
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-[#0A0A0A] to-[#121212] flex items-center justify-center">
                <div className="w-10 h-10 rounded-full border-2 border-[#00D4FF]/20 border-t-[#00D4FF] animate-spin" />
            </div>
        );
    }

    if (error || !post) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-[#0A0A0A] to-[#121212] flex flex-col items-center justify-center text-white">
                <div className="text-6xl mb-4">😔</div>
                <h1 className="text-2xl font-bold mb-2">Post Not Found</h1>
                <p className="text-white/60 mb-6">This post may have been deleted or doesn&apos;t exist.</p>
                <Link
                    href="/dashboard"
                    className="px-6 py-3 rounded-xl bg-[#00D4FF] text-black font-semibold hover:opacity-90 transition-opacity"
                >
                    Back to Feed
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-[#0A0A0A] to-[#121212]">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-[#0A0A0A]/90 backdrop-blur-lg border-b border-white/5">
                <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="p-2 rounded-full hover:bg-white/10 transition-colors"
                    >
                        <ArrowLeftIcon size={24} className="text-white" />
                    </button>
                    <h1 className="text-lg font-semibold text-white">Post</h1>
                </div>
            </header>

            <main className="max-w-2xl mx-auto px-4 py-6">
                {/* Post Content */}
                <motion.div
                    className="bg-white/[0.02] rounded-2xl border border-white/5 overflow-hidden"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    {/* Author */}
                    <div className="p-4">
                        <Link href={`/profile/${post.author.username}`} className="flex items-center gap-3">
                            {post.author.avatarUrl ? (
                                <img
                                    src={post.author.avatarUrl}
                                    alt={post.author.displayName}
                                    className="w-12 h-12 rounded-full object-cover"
                                />
                            ) : (
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#00D4FF] to-[#8B5CF6] flex items-center justify-center text-black font-bold">
                                    {post.author.displayName?.[0] || 'U'}
                                </div>
                            )}
                            <div>
                                <div className="font-semibold text-white">{post.author.displayName}</div>
                                <div className="text-white/50 text-sm">@{post.author.username}</div>
                            </div>
                        </Link>
                    </div>

                    {/* Content */}
                    {post.content && (
                        <div className="px-4 pb-4">
                            <p className="text-white text-lg">{post.content}</p>
                        </div>
                    )}

                    {/* Media */}
                    {post.mediaUrl && (
                        <div className="relative">
                            {post.mediaType === 'VIDEO' ? (
                                <video
                                    src={post.mediaUrl}
                                    controls
                                    className="w-full max-h-[600px] object-contain bg-black"
                                />
                            ) : (
                                <img
                                    src={post.mediaUrl}
                                    alt="Post media"
                                    className="w-full max-h-[600px] object-contain bg-black/50"
                                />
                            )}
                        </div>
                    )}

                    {/* Timestamp */}
                    <div className="px-4 py-3 border-t border-white/5">
                        <span className="text-white/40 text-sm">
                            {new Date(post.createdAt).toLocaleString()}
                        </span>
                    </div>

                    {/* Actions */}
                    <div className="px-4 py-3 flex items-center gap-6 border-t border-white/5">
                        <button
                            onClick={handleLike}
                            className={`flex items-center gap-2 transition-colors ${post.isLiked ? 'text-rose-400' : 'text-white/60 hover:text-rose-400'}`}
                        >
                            <span className="text-xl">{post.isLiked ? '❤️' : '🤍'}</span>
                            <span className="font-medium">{post.likes}</span>
                        </button>
                        <div className="flex items-center gap-2 text-white/60">
                            <span>💬</span>
                            <span className="font-medium">{post.commentsCount}</span>
                        </div>
                        <button
                            onClick={handleShare}
                            className="flex items-center gap-2 text-white/60 hover:text-[#00D4FF] transition-colors"
                        >
                            <ShareIcon size={24} />
                            <span className="font-medium">Share</span>
                        </button>
                    </div>
                </motion.div>

                {/* Comment Input */}
                {isAuthenticated ? (
                    <form onSubmit={handleSubmitComment} className="mt-6">
                        <div className="flex gap-3">
                            {user?.avatarUrl ? (
                                <img
                                    src={user.avatarUrl}
                                    alt={user.displayName || 'You'}
                                    className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                                />
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00D4FF] to-[#8B5CF6] flex items-center justify-center text-black font-bold flex-shrink-0">
                                    {user?.displayName?.[0] || 'U'}
                                </div>
                            )}
                            <div className="flex-1 flex gap-2">
                                <input
                                    type="text"
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    placeholder="Write a comment..."
                                    className="flex-1 bg-white/5 rounded-xl px-4 py-3 text-white placeholder:text-white/40 border border-white/10 focus:border-[#00D4FF]/50 focus:outline-none transition-colors"
                                />
                                <button
                                    type="submit"
                                    disabled={!newComment.trim() || isSubmitting}
                                    className="px-4 py-3 rounded-xl bg-[#00D4FF] text-black font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <SendIcon size={20} />
                                </button>
                            </div>
                        </div>
                    </form>
                ) : (
                    <div className="mt-6 text-center py-4 bg-white/[0.02] rounded-xl border border-white/5">
                        <p className="text-white/60 mb-3">Sign in to comment</p>
                        <Link
                            href="/login"
                            className="inline-block px-6 py-2 rounded-xl bg-[#00D4FF] text-black font-semibold hover:opacity-90 transition-opacity"
                        >
                            Log In
                        </Link>
                    </div>
                )}

                {/* Comments List */}
                <div className="mt-6 space-y-4">
                    <h2 className="text-lg font-semibold text-white">
                        Comments ({comments.length})
                    </h2>

                    {comments.length === 0 ? (
                        <div className="text-center py-8 bg-white/[0.02] rounded-xl border border-white/5">
                            <div className="text-4xl mb-2">💬</div>
                            <p className="text-white/60">No comments yet. Be the first!</p>
                        </div>
                    ) : (
                        comments.map((comment) => (
                            <motion.div
                                key={comment.id}
                                className="bg-white/[0.02] rounded-xl border border-white/5 p-4"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                <div className="flex gap-3">
                                    <Link href={`/profile/${comment.author.username}`}>
                                        {comment.author.avatarUrl ? (
                                            <img
                                                src={comment.author.avatarUrl}
                                                alt={comment.author.displayName}
                                                className="w-10 h-10 rounded-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00D4FF] to-[#8B5CF6] flex items-center justify-center text-black font-bold text-sm">
                                                {comment.author.displayName?.[0] || 'U'}
                                            </div>
                                        )}
                                    </Link>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Link
                                                href={`/profile/${comment.author.username}`}
                                                className="font-semibold text-white text-sm hover:text-[#00D4FF] transition-colors"
                                            >
                                                {comment.author.displayName}
                                            </Link>
                                            <span className="text-white/30 text-xs">
                                                {new Date(comment.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <p className="text-white/80 text-sm">{comment.content}</p>
                                    </div>
                                </div>
                            </motion.div>
                        ))
                    )}
                </div>
            </main>
        </div>
    );
}
