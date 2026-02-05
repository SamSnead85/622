'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Navigation } from '@/components/Navigation';
import { usePosts } from '@/hooks/usePosts';
import { useAuth } from '@/contexts/AuthContext';
import {
    ArrowLeftIcon,
    EditIcon,
    TrashIcon,
    PlusIcon,
    MoreHorizontalIcon,
    HeartIcon,
    MessageIcon,
    ShareIcon,
    CalendarIcon,
    CameraIcon,
    PlayIcon,
} from '@/components/icons';

// ============================================
// MY POSTS - Post Management Dashboard
// View, edit, and delete your posts
// ============================================

export default function MyPostsPage() {
    const { user } = useAuth();
    const { posts, isLoading, deletePost } = usePosts();
    const [filter, setFilter] = useState<'all' | 'published' | 'scheduled' | 'draft'>('all');
    const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'popular'>('newest');
    const [selectedPosts, setSelectedPosts] = useState<string[]>([]);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deletingPostId, setDeletingPostId] = useState<string | null>(null);

    // Filter to only show current user's posts
    const myPosts = posts.filter(post => post.author?.id === user?.id);

    // Sort posts
    const sortedPosts = [...myPosts].sort((a, b) => {
        if (sortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        if (sortBy === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        return ((b as any).likesCount || (b as any).likes || 0) - ((a as any).likesCount || (a as any).likes || 0);
    });

    const handleDeletePost = async (postId: string) => {
        setDeletingPostId(postId);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!deletingPostId) return;
        const result = await deletePost(deletingPostId);
        if (result.success) {
            setShowDeleteModal(false);
            setDeletingPostId(null);
        }
    };

    const handleBulkDelete = async () => {
        for (const postId of selectedPosts) {
            await deletePost(postId);
        }
        setSelectedPosts([]);
        setShowDeleteModal(false);
    };

    const toggleSelectPost = (postId: string) => {
        setSelectedPosts(prev =>
            prev.includes(postId)
                ? prev.filter(id => id !== postId)
                : [...prev, postId]
        );
    };

    const selectAll = () => {
        if (selectedPosts.length === sortedPosts.length) {
            setSelectedPosts([]);
        } else {
            setSelectedPosts(sortedPosts.map(p => p.id));
        }
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getMediaIcon = (post: any) => {
        if (post.mediaUrl) {
            if (post.mediaType?.includes('video')) return <PlayIcon size={16} className="text-purple-400" />;
            return <CameraIcon size={16} className="text-blue-400" />;
        }
        return null;
    };

    if (!user) {
        return (
            <div className="min-h-screen bg-[#0A0A0F]">
                <Navigation activeTab="profile" />
                <main className="lg:ml-20 xl:ml-64 pb-24 lg:pb-8">
                    <div className="max-w-4xl mx-auto px-4 py-16 text-center">
                        <div className="text-6xl mb-4">🔐</div>
                        <h1 className="text-2xl font-bold mb-2">Sign in to view your posts</h1>
                        <p className="text-white/50 mb-6">You need to be logged in to manage your posts.</p>
                        <Link
                            href="/login"
                            className="inline-block px-6 py-3 rounded-xl bg-[#00D4FF] text-black font-semibold hover:opacity-90"
                        >
                            Sign In
                        </Link>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0A0A0F]">
            <Navigation activeTab="profile" />

            <main className="lg:ml-20 xl:ml-64 pb-24 lg:pb-8">
                {/* Header */}
                <div className="sticky top-0 z-40 bg-[#0A0A0F]/95 backdrop-blur-xl border-b border-white/5">
                    <div className="max-w-4xl mx-auto px-4 py-4">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-4">
                                <Link href="/dashboard" className="p-2 hover:bg-white/5 rounded-xl transition-colors">
                                    <ArrowLeftIcon size={20} className="text-white" />
                                </Link>
                                <div>
                                    <h1 className="text-2xl font-bold text-white">My Posts</h1>
                                    <p className="text-sm text-white/50">{myPosts.length} total posts</p>
                                </div>
                            </div>
                            <Link
                                href="/dashboard"
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6] text-white font-medium hover:opacity-90 transition-opacity"
                            >
                                <PlusIcon size={18} />
                                New Post
                            </Link>
                        </div>

                        {/* Filters & Sort */}
                        <div className="flex items-center justify-between gap-4 flex-wrap">
                            <div className="flex items-center gap-2">
                                {(['all', 'published'] as const).map((f) => (
                                    <button
                                        key={f}
                                        onClick={() => setFilter(f)}
                                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${filter === f
                                            ? 'bg-[#00D4FF] text-black'
                                            : 'bg-white/5 text-white/60 hover:bg-white/10'
                                            }`}
                                    >
                                        {f.charAt(0).toUpperCase() + f.slice(1)}
                                    </button>
                                ))}
                            </div>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                                className="px-4 py-2 rounded-xl bg-white/5 text-white text-sm border-0 focus:ring-2 focus:ring-[#00D4FF]"
                            >
                                <option value="newest">Newest First</option>
                                <option value="oldest">Oldest First</option>
                                <option value="popular">Most Popular</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Bulk Actions */}
                <AnimatePresence>
                    {selectedPosts.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="sticky top-24 z-30 bg-[#1A1A1F] border-b border-white/5"
                        >
                            <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={selectAll}
                                        className="text-sm text-white/60 hover:text-white"
                                    >
                                        {selectedPosts.length === sortedPosts.length ? 'Deselect All' : 'Select All'}
                                    </button>
                                    <span className="text-sm text-[#00D4FF] font-medium">
                                        {selectedPosts.length} selected
                                    </span>
                                </div>
                                <button
                                    onClick={() => setShowDeleteModal(true)}
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 text-red-400 text-sm font-medium hover:bg-red-500/20 transition-colors"
                                >
                                    <TrashIcon size={16} />
                                    Delete Selected
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Posts List */}
                <div className="max-w-4xl mx-auto px-4 py-6">
                    {isLoading ? (
                        <div className="space-y-4">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="bg-white/[0.02] rounded-2xl p-4 animate-pulse">
                                    <div className="flex gap-4">
                                        <div className="w-24 h-24 bg-white/5 rounded-xl" />
                                        <div className="flex-1 space-y-3">
                                            <div className="h-4 bg-white/5 rounded w-3/4" />
                                            <div className="h-3 bg-white/5 rounded w-1/2" />
                                            <div className="h-3 bg-white/5 rounded w-1/4" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : sortedPosts.length === 0 ? (
                        <div className="text-center py-16">
                            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-[#00D4FF]/20 to-[#8B5CF6]/20 flex items-center justify-center">
                                <EditIcon size={40} className="text-[#00D4FF]" />
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-2">No posts yet</h2>
                            <p className="text-white/50 mb-6 max-w-md mx-auto">
                                Start sharing your thoughts, photos, and videos with the community.
                            </p>
                            <Link
                                href="/dashboard"
                                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6] text-white font-semibold hover:opacity-90 transition-opacity"
                            >
                                <PlusIcon size={20} />
                                Create Your First Post
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {sortedPosts.map((post, index) => (
                                <motion.div
                                    key={post.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className={`bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 rounded-2xl p-4 transition-all ${selectedPosts.includes(post.id) ? 'ring-2 ring-[#00D4FF]' : ''
                                        }`}
                                >
                                    <div className="flex gap-4">
                                        {/* Checkbox */}
                                        <button
                                            onClick={() => toggleSelectPost(post.id)}
                                            className={`w-5 h-5 rounded border-2 flex-shrink-0 mt-1 transition-all ${selectedPosts.includes(post.id)
                                                ? 'bg-[#00D4FF] border-[#00D4FF]'
                                                : 'border-white/20 hover:border-white/40'
                                                }`}
                                        >
                                            {selectedPosts.includes(post.id) && (
                                                <svg className="w-full h-full text-black" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                </svg>
                                            )}
                                        </button>

                                        {/* Thumbnail */}
                                        {post.mediaUrl ? (
                                            <div className="w-24 h-24 rounded-xl overflow-hidden flex-shrink-0 bg-white/5 relative">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img
                                                    src={post.mediaUrl}
                                                    alt=""
                                                    className="w-full h-full object-cover"
                                                />
                                                <div className="absolute bottom-1 right-1">
                                                    {getMediaIcon(post)}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-[#00D4FF]/10 to-[#8B5CF6]/10 flex items-center justify-center flex-shrink-0">
                                                <EditIcon size={32} className="text-white/20" />
                                            </div>
                                        )}

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-white line-clamp-2 mb-2">
                                                {post.content || 'No caption'}
                                            </p>
                                            <div className="flex items-center gap-4 text-sm text-white/40 mb-3">
                                                <span className="flex items-center gap-1">
                                                    <CalendarIcon size={14} />
                                                    {formatDate(post.createdAt)}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-4 text-sm">
                                                <span className="flex items-center gap-1 text-white/50">
                                                    <HeartIcon size={14} />
                                                    {(post as any).likesCount || (post as any).likes || 0}
                                                </span>
                                                <span className="flex items-center gap-1 text-white/50">
                                                    <MessageIcon size={14} />
                                                    {post.commentsCount || 0}
                                                </span>
                                                <span className="flex items-center gap-1 text-white/50">
                                                    <ShareIcon size={14} />
                                                    {(post as any).sharesCount || 0}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-start gap-2">
                                            <Link
                                                href={`/post/${post.id}`}
                                                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                                                title="View Post"
                                            >
                                                <MoreHorizontalIcon size={18} />
                                            </Link>
                                            <button
                                                onClick={() => handleDeletePost(post.id)}
                                                className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                                                title="Delete Post"
                                            >
                                                <TrashIcon size={18} />
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {showDeleteModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setShowDeleteModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-[#1A1A1F] rounded-2xl p-6 max-w-md w-full border border-white/10"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="text-center">
                                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
                                    <TrashIcon size={32} className="text-red-400" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">Delete Post{selectedPosts.length > 1 ? 's' : ''}?</h3>
                                <p className="text-white/60 mb-6">
                                    {selectedPosts.length > 1
                                        ? `This will permanently delete ${selectedPosts.length} posts. This action cannot be undone.`
                                        : 'This will permanently delete this post. This action cannot be undone.'}
                                </p>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => {
                                            setShowDeleteModal(false);
                                            setDeletingPostId(null);
                                        }}
                                        className="flex-1 px-4 py-3 rounded-xl bg-white/5 text-white font-medium hover:bg-white/10 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={selectedPosts.length > 1 ? handleBulkDelete : confirmDelete}
                                        className="flex-1 px-4 py-3 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-colors"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
