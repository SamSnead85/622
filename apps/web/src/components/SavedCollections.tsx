'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================
// SAVED COLLECTIONS
// User-created collections for saved posts
// ============================================

interface Collection {
    id: string;
    name: string;
    emoji?: string;
    postCount: number;
    coverImage?: string;
    isPrivate: boolean;
    createdAt: string;
}

interface SavedCollectionsProps {
    userId?: string;
    onCollectionClick?: (collectionId: string) => void;
}

const COLLECTIONS_KEY = '0g_collections';

export function SavedCollections({ userId, onCollectionClick }: SavedCollectionsProps) {
    const [collections, setCollections] = useState<Collection[]>([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newCollectionName, setNewCollectionName] = useState('');
    const [newCollectionEmoji, setNewCollectionEmoji] = useState('📁');
    const [isPrivate, setIsPrivate] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem(COLLECTIONS_KEY);
        if (saved) {
            try {
                setCollections(JSON.parse(saved));
            } catch {
                setCollections([]);
            }
        }
    }, []);

    const createCollection = useCallback(() => {
        if (!newCollectionName.trim()) return;

        const newCollection: Collection = {
            id: Date.now().toString(),
            name: newCollectionName.trim(),
            emoji: newCollectionEmoji,
            postCount: 0,
            isPrivate,
            createdAt: new Date().toISOString(),
        };

        setCollections(prev => {
            const updated = [newCollection, ...prev];
            localStorage.setItem(COLLECTIONS_KEY, JSON.stringify(updated));
            return updated;
        });

        setNewCollectionName('');
        setNewCollectionEmoji('📁');
        setIsPrivate(false);
        setShowCreateModal(false);
    }, [newCollectionName, newCollectionEmoji, isPrivate]);

    const deleteCollection = useCallback((collectionId: string) => {
        setCollections(prev => {
            const updated = prev.filter(c => c.id !== collectionId);
            localStorage.setItem(COLLECTIONS_KEY, JSON.stringify(updated));
            return updated;
        });
    }, []);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="font-semibold text-white flex items-center gap-2">
                    <span>📚</span>
                    Saved Collections
                </h3>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="text-xs px-3 py-1.5 rounded-full bg-[#7C8FFF]/10 text-[#7C8FFF] hover:bg-[#7C8FFF]/20 transition-colors"
                >
                    + New
                </button>
            </div>

            {collections.length === 0 ? (
                <div className="text-center py-8">
                    <div className="text-4xl mb-3">🗂️</div>
                    <p className="text-white/50 text-sm">No collections yet</p>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="mt-3 text-[#7C8FFF] text-sm hover:underline"
                    >
                        Create your first collection
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-3">
                    {collections.map((collection) => (
                        <motion.button
                            key={collection.id}
                            onClick={() => onCollectionClick?.(collection.id)}
                            className="relative aspect-square rounded-xl overflow-hidden bg-white/5 border border-white/10 hover:border-white/20 transition-colors group"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            {collection.coverImage ? (
                                <Image
                                    src={collection.coverImage}
                                    alt={collection.name}
                                    fill
                                    className="object-cover"
                                />
                            ) : (
                                <div className="absolute inset-0 bg-gradient-to-br from-[#7C8FFF]/10 to-[#6070EE]/10 flex items-center justify-center">
                                    <span className="text-4xl">{collection.emoji}</span>
                                </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                            <div className="absolute bottom-0 left-0 right-0 p-3">
                                <div className="flex items-center gap-1">
                                    {collection.isPrivate && <span className="text-xs">🔒</span>}
                                    <span className="font-medium text-white text-sm truncate">{collection.name}</span>
                                </div>
                                <span className="text-xs text-white/50">{collection.postCount} saved</span>
                            </div>
                        </motion.button>
                    ))}
                </div>
            )}

            {/* Create Collection Modal */}
            <AnimatePresence>
                {showCreateModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setShowCreateModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="bg-[#1A1A1F] rounded-2xl p-6 w-full max-w-sm border border-white/10"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h3 className="text-lg font-semibold text-white mb-4">New Collection</h3>

                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <button
                                        className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-2xl hover:bg-white/20 transition-colors"
                                        onClick={() => {
                                            const emojis = ['📁', '❤️', '⭐', '🎨', '📸', '🎵', '🎬', '✨', '🔥', '💎'];
                                            const currentIndex = emojis.indexOf(newCollectionEmoji);
                                            setNewCollectionEmoji(emojis[(currentIndex + 1) % emojis.length]);
                                        }}
                                    >
                                        {newCollectionEmoji}
                                    </button>
                                    <input
                                        type="text"
                                        value={newCollectionName}
                                        onChange={(e) => setNewCollectionName(e.target.value)}
                                        placeholder="Collection name"
                                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-[#7C8FFF]/50"
                                        autoFocus
                                    />
                                </div>

                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={isPrivate}
                                        onChange={(e) => setIsPrivate(e.target.checked)}
                                        className="w-5 h-5 rounded bg-white/10 border-white/20 text-[#7C8FFF]"
                                    />
                                    <span className="text-white/70">Make this collection private</span>
                                </label>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => setShowCreateModal(false)}
                                    className="flex-1 py-3 rounded-xl bg-white/10 text-white font-medium hover:bg-white/15 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={createCollection}
                                    disabled={!newCollectionName.trim()}
                                    className="flex-1 py-3 rounded-xl bg-[#7C8FFF] text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                                >
                                    Create
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ============================================
// ACTIVITY FEED
// Real-time activity notifications
// ============================================

interface ActivityItem {
    id: string;
    type: 'like' | 'comment' | 'follow' | 'mention' | 'repost';
    user: {
        id: string;
        username: string;
        displayName: string;
        avatarUrl?: string;
    };
    postId?: string;
    postThumbnail?: string;
    content?: string;
    createdAt: string;
    isRead: boolean;
}

interface ActivityFeedProps {
    activities?: ActivityItem[];
    loading?: boolean;
    onActivityClick?: (activity: ActivityItem) => void;
}

export function ActivityFeed({ activities = [], loading = false, onActivityClick }: ActivityFeedProps) {
    const getActivityIcon = (type: ActivityItem['type']) => {
        switch (type) {
            case 'like': return '❤️';
            case 'comment': return '💬';
            case 'follow': return '👤';
            case 'mention': return '@';
            case 'repost': return '🔄';
            default: return '📌';
        }
    };

    const getActivityText = (activity: ActivityItem) => {
        switch (activity.type) {
            case 'like': return 'liked your post';
            case 'comment': return `commented: "${activity.content?.slice(0, 50)}..."`;
            case 'follow': return 'started following you';
            case 'mention': return 'mentioned you in a post';
            case 'repost': return 'reposted your content';
            default: return 'interacted with you';
        }
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (minutes < 1) return 'now';
        if (minutes < 60) return `${minutes}m`;
        if (hours < 24) return `${hours}h`;
        return `${days}d`;
    };

    if (loading) {
        return (
            <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex gap-3 animate-pulse">
                        <div className="w-10 h-10 rounded-full bg-white/10" />
                        <div className="flex-1">
                            <div className="h-4 w-3/4 rounded bg-white/10 mb-2" />
                            <div className="h-3 w-1/3 rounded bg-white/5" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (activities.length === 0) {
        return (
            <div className="text-center py-12">
                <div className="text-4xl mb-3">🔔</div>
                <p className="text-white/50">No activity yet</p>
                <p className="text-white/30 text-sm mt-1">When people interact with your content, you&apos;ll see it here</p>
            </div>
        );
    }

    return (
        <div className="space-y-1">
            {activities.map((activity) => (
                <motion.button
                    key={activity.id}
                    onClick={() => onActivityClick?.(activity)}
                    className={`w-full flex items-start gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors text-left ${!activity.isRead ? 'bg-[#7C8FFF]/5' : ''
                        }`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div className="relative">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-white/10">
                            {activity.user.avatarUrl ? (
                                <Image
                                    src={activity.user.avatarUrl}
                                    alt={activity.user.displayName}
                                    width={40}
                                    height={40}
                                    className="object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-white/60 font-bold">
                                    {activity.user.displayName[0]}
                                </div>
                            )}
                        </div>
                        <span className="absolute -bottom-1 -right-1 text-sm">
                            {getActivityIcon(activity.type)}
                        </span>
                    </div>

                    <div className="flex-1 min-w-0">
                        <p className="text-sm text-white">
                            <span className="font-semibold">{activity.user.displayName}</span>
                            {' '}
                            <span className="text-white/60">{getActivityText(activity)}</span>
                        </p>
                        <span className="text-xs text-white/40">{formatTime(activity.createdAt)}</span>
                    </div>

                    {activity.postThumbnail && (
                        <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                            <Image
                                src={activity.postThumbnail}
                                alt="Post"
                                width={40}
                                height={40}
                                className="object-cover"
                            />
                        </div>
                    )}

                    {!activity.isRead && (
                        <div className="w-2 h-2 rounded-full bg-[#7C8FFF] flex-shrink-0 mt-2" />
                    )}
                </motion.button>
            ))}
        </div>
    );
}
