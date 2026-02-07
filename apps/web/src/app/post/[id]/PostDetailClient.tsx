'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
    ArrowLeftIcon,
    ShareIcon,
} from '@/components/icons';
import { API_URL } from '@/lib/api';
import { ThreadedComments } from '@/components/comments/ThreadedComments';

interface Post {
    id: string;
    content: string;
    mediaUrl?: string;
    mediaType?: 'IMAGE' | 'VIDEO';
    type: 'IMAGE' | 'VIDEO' | 'TEXT' | 'POLL' | 'RALLY';
    createdAt: string;
    updatedAt?: string;
    likes: number;
    isLiked: boolean;
    commentsCount: number;
    rsvpCount?: number;
    isRsvped?: boolean;
    author: {
        id: string;
        username: string;
        displayName: string;
        avatarUrl?: string;
    };
}

function getYouTubeEmbedUrl(url: string): string {
    if (url.includes('/embed/')) {
        if (!url.includes('modestbranding')) {
            return url + (url.includes('?') ? '&' : '?') + 'modestbranding=1&rel=0&showinfo=0&autoplay=1&mute=1';
        }
        return url;
    }
    let videoId = '';
    if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1]?.split('?')[0] || '';
    } else if (url.includes('/shorts/')) {
        videoId = url.split('/shorts/')[1]?.split('?')[0] || '';
    } else if (url.includes('watch?v=')) {
        videoId = url.split('watch?v=')[1]?.split('&')[0] || '';
    }
    if (videoId) {
        return `https://www.youtube-nocookie.com/embed/${videoId}?modestbranding=1&rel=0&showinfo=0&autoplay=1&mute=1&controls=1`;
    }
    return url;
}

function VideoPlayer({ src }: { src: string }) {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        video.muted = false;
        video.play().catch(() => {
            video.muted = true;
            video.play().catch((e: any) => console.error('Autoplay blocked', e));
        });
    }, [src]);

    return (
        <video
            ref={videoRef}
            src={src}
            controls
            playsInline
            preload="metadata"
            className="w-full max-h-[600px] object-contain bg-black"
        />
    );
}

export default function PostDetailClient() {
    const params = useParams();
    const router = useRouter();
    const { user, isAuthenticated, isLoading: authLoading, isAdmin } = useAuth();
    const postId = params.id as string;

    const [post, setPost] = useState<Post | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // RSVP and Edit states
    const [isRsvped, setIsRsvped] = useState(false);
    const [rsvpCount, setRsvpCount] = useState(0);
    const [isEditingPost, setIsEditingPost] = useState(false);
    const [editedCaption, setEditedCaption] = useState('');
    const [copied, setCopied] = useState(false);

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
                setPost({
                    id: data.id,
                    content: data.caption || '',
                    mediaUrl: data.mediaUrl,
                    mediaType: (data.type === 'IMAGE' || data.type === 'VIDEO') ? data.type : undefined,
                    type: data.type,
                    createdAt: data.createdAt,
                    updatedAt: data.updatedAt,
                    likes: data.likesCount || 0,
                    isLiked: data.isLiked || false,
                    commentsCount: data.commentsCount || 0,
                    rsvpCount: data.rsvpCount || 0,
                    isRsvped: data.isRsvped || false,
                    author: {
                        id: data.user?.id || '',
                        username: data.user?.username || '',
                        displayName: data.user?.displayName || 'User',
                        avatarUrl: data.user?.avatarUrl,
                    },
                });
                setIsRsvped(data.isRsvped || false);
                setRsvpCount(data.rsvpCount || 0);
                setEditedCaption(data.caption || '');
            } else {
                setError('Post not found');
            }
        } catch (err) {
            console.error('Error fetching post:', err);
            setError('Failed to load post');
        } finally {
            setIsLoading(false);
        }
    }, [postId]);

    useEffect(() => {
        if (postId) {
            fetchPost();
        }
    }, [postId, fetchPost]);

    const handleLike = async () => {
        if (!isAuthenticated) {
            router.push('/login');
            return;
        }
        try {
            const token = localStorage.getItem('0g_token');
            const response = await fetch(`${API_URL}/api/v1/posts/${postId}/like`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
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

    const handleCommentCountChange = (delta: number) => {
        if (post) {
            setPost({ ...post, commentsCount: post.commentsCount + delta });
        }
    };

    const handleShare = async () => {
        const url = `${window.location.origin}/post/${postId}`;

        if (typeof navigator !== 'undefined' && navigator.share) {
            try {
                await navigator.share({
                    title: post?.author.displayName ? `${post.author.displayName} on 0G` : 'Check this out on 0G',
                    text: post?.content ? post.content.slice(0, 100) : 'Check this out on 0G',
                    url: url
                });
                return;
            } catch (err) {
                // User cancelled or failed - fall through to clipboard
            }
        }

        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Clipboard failed silently
        }
    };

    const handleRsvp = async () => {
        if (!isAuthenticated) {
            router.push('/login');
            return;
        }
        try {
            const token = localStorage.getItem('0g_token');
            const method = isRsvped ? 'DELETE' : 'POST';
            const response = await fetch(`${API_URL}/api/v1/posts/${postId}/rsvp`, {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });
            if (response.ok) {
                const data = await response.json();
                setIsRsvped(data.isRsvped);
                setRsvpCount(data.rsvpCount);
            }
        } catch (err) {
            console.error('Error toggling RSVP:', err);
        }
    };

    const handleEditPost = async () => {
        if (!editedCaption.trim() || editedCaption === post?.content) {
            setIsEditingPost(false);
            return;
        }
        try {
            const token = localStorage.getItem('0g_token');
            const response = await fetch(`${API_URL}/api/v1/posts/${postId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ caption: editedCaption }),
            });
            if (response.ok && post) {
                setPost({ ...post, content: editedCaption, updatedAt: new Date().toISOString() });
                setIsEditingPost(false);
            }
        } catch (err) {
            console.error('Error editing post:', err);
        }
    };

    // Determine if this is a guest/public visitor
    const isGuest = !authLoading && !isAuthenticated;

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
        <div className={`min-h-screen bg-gradient-to-b from-[#0A0A0A] to-[#121212] ${isGuest ? 'pb-24' : ''}`}>
            {/* ============================== */}
            {/* BRANDED TOP BAR FOR GUESTS     */}
            {/* ============================== */}
            {isGuest && (
                <div className="sticky top-0 z-50 bg-black/95 backdrop-blur-xl border-b border-white/5">
                    <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
                        <Link href="/" className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00D4FF] to-[#7C3AED] flex items-center justify-center">
                                <span className="text-white font-black text-xs">0G</span>
                            </div>
                            <span className="text-white font-bold text-lg tracking-tight">ZeroG</span>
                        </Link>
                        <div className="flex items-center gap-2">
                            <Link
                                href="/login"
                                className="px-4 py-2 rounded-full text-white/80 text-sm font-medium hover:text-white transition-colors"
                            >
                                Log In
                            </Link>
                            <Link
                                href="/signup"
                                className="px-5 py-2 rounded-full bg-gradient-to-r from-[#00D4FF] to-[#7C3AED] text-white text-sm font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-[#00D4FF]/20"
                            >
                                Join 0G
                            </Link>
                        </div>
                    </div>
                </div>
            )}

            {/* ============================== */}
            {/* NORMAL HEADER FOR AUTH USERS    */}
            {/* ============================== */}
            {!isGuest && (
                <header className="sticky top-0 z-50 bg-[#0A0A0A]/90 backdrop-blur-lg border-b border-white/5">
                    <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link
                                href="/dashboard"
                                className="p-2 rounded-full hover:bg-white/10 transition-colors"
                            >
                                <ArrowLeftIcon size={24} className="text-white" />
                            </Link>
                            <h1 className="text-lg font-semibold text-white">Post</h1>
                        </div>
                        <Link
                            href="/dashboard"
                            className="px-4 py-2 rounded-full bg-white/10 text-white font-medium hover:bg-white/15 transition-colors text-sm"
                        >
                            Back to Feed
                        </Link>
                    </div>
                </header>
            )}

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
                            {isEditingPost ? (
                                <div className="space-y-3">
                                    <textarea
                                        value={editedCaption}
                                        onChange={(e) => setEditedCaption(e.target.value)}
                                        className="w-full bg-white/5 rounded-xl px-4 py-3 text-white text-lg border border-white/10 focus:border-[#00D4FF]/50 focus:outline-none transition-colors resize-none"
                                        rows={3}
                                    />
                                    <div className="flex gap-2 justify-end">
                                        <button
                                            onClick={() => {
                                                setIsEditingPost(false);
                                                setEditedCaption(post.content);
                                            }}
                                            className="px-4 py-2 rounded-xl bg-white/10 text-white/70 hover:bg-white/20 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleEditPost}
                                            className="px-4 py-2 rounded-xl bg-[#00D4FF] text-black font-semibold hover:opacity-90 transition-opacity"
                                        >
                                            Save
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <p className="text-white text-lg">{post.content}</p>
                                    {post.updatedAt && post.updatedAt !== post.createdAt && (
                                        <span className="text-white/40 text-xs ml-2">(edited)</span>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Media */}
                    {post.mediaUrl && (
                        <div className="relative">
                            {post.mediaType === 'VIDEO' ? (
                                post.mediaUrl.includes('youtube') || post.mediaUrl.includes('youtu.be') ? (
                                    <div className="relative w-full aspect-video bg-black">
                                        <iframe
                                            src={getYouTubeEmbedUrl(post.mediaUrl!)}
                                            className="absolute inset-0 w-full h-full"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                            frameBorder="0"
                                            title="Video"
                                        />
                                    </div>
                                ) : (
                                    <VideoPlayer src={post.mediaUrl} />
                                )
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
                    <div className="px-4 py-3 flex items-center gap-4 border-t border-white/5 flex-wrap">
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

                        {post.type === 'RALLY' && (
                            <button
                                onClick={handleRsvp}
                                className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all ${isRsvped
                                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25'
                                    : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
                                    }`}
                            >
                                <span>{isRsvped ? '✓' : '🙋'}</span>
                                <span>{isRsvped ? "I'm In!" : "I'm In"}</span>
                                {rsvpCount > 0 && (
                                    <span className="bg-white/20 px-2 py-0.5 rounded-full text-sm">
                                        {rsvpCount}
                                    </span>
                                )}
                            </button>
                        )}

                        <button
                            onClick={handleShare}
                            className="flex items-center gap-2 text-white/60 hover:text-[#00D4FF] transition-colors ml-auto relative"
                        >
                            <ShareIcon size={24} />
                            <span className="font-medium">{copied ? 'Copied!' : 'Share'}</span>
                        </button>

                        {(user?.id === post.author.id || isAdmin) && !isEditingPost && (
                            <button
                                onClick={() => {
                                    setIsEditingPost(true);
                                    setEditedCaption(post.content);
                                }}
                                className="flex items-center gap-2 text-white/60 hover:text-amber-400 transition-colors"
                            >
                                <span>✏️</span>
                                <span className="font-medium hidden sm:inline">Edit</span>
                            </button>
                        )}
                    </div>
                </motion.div>

                {/* Comments Section */}
                <div className="mt-6">
                    <h2 className="text-lg font-semibold text-white mb-4">
                        Comments ({post.commentsCount})
                    </h2>

                    {!isAuthenticated && (
                        <div className="mb-4 text-center py-4 bg-white/[0.02] rounded-xl border border-white/5">
                            <p className="text-white/60 mb-3">Sign in to join the conversation</p>
                            <Link
                                href="/signup"
                                className="inline-block px-6 py-2 rounded-xl bg-gradient-to-r from-[#00D4FF] to-[#7C3AED] text-white font-semibold hover:opacity-90 transition-opacity"
                            >
                                Join 0G
                            </Link>
                        </div>
                    )}

                    <ThreadedComments
                        postId={postId}
                        currentUserId={user?.id}
                        isAdmin={isAdmin}
                        onCommentCountChange={handleCommentCountChange}
                    />
                </div>
            </main>

            {/* ============================== */}
            {/* STICKY BOTTOM CTA FOR GUESTS   */}
            {/* ============================== */}
            {isGuest && (
                <div className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-black via-black/95 to-transparent pt-8 pb-safe">
                    <div className="max-w-2xl mx-auto px-4 pb-4">
                        <div className="bg-white/[0.06] backdrop-blur-xl rounded-2xl border border-white/10 p-4 flex items-center gap-4 shadow-[0_-4px_30px_rgba(0,0,0,0.5)]">
                            <div className="flex-1 min-w-0">
                                <p className="text-white font-semibold text-sm">See more on 0G</p>
                                <p className="text-white/50 text-xs truncate">
                                    Social media without the weight. Join free.
                                </p>
                            </div>
                            <Link
                                href="/signup"
                                className="flex-shrink-0 px-6 py-2.5 rounded-full bg-gradient-to-r from-[#00D4FF] to-[#7C3AED] text-white text-sm font-bold hover:opacity-90 transition-opacity shadow-lg shadow-[#00D4FF]/20"
                            >
                                Join 0G
                            </Link>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
