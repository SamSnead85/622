'use client';

import { useState, useEffect, useCallback } from 'react';
import { API_ENDPOINTS, apiFetch } from '@/lib/api';

// ============================================
// TYPES
// ============================================
export interface PostAuthor {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
}

export interface Post {
    id: string;
    author: PostAuthor;
    content: string;
    mediaUrl?: string;
    mediaType?: 'IMAGE' | 'VIDEO';
    likes: number;
    commentsCount: number;
    isLiked: boolean;
    createdAt: string;
}

export interface FeedUser {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
    hasStory: boolean;
}

// ============================================
// POSTS/FEED HOOK
// Fetches posts from API with pagination
// ============================================
export function usePosts() {
    const [posts, setPosts] = useState<Post[]>([]);
    const [friends, setFriends] = useState<FeedUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const [page, setPage] = useState(1);

    const fetchFeed = useCallback(async (pageNum: number = 1) => {
        try {
            setIsLoading(true);
            setError(null);

            const response = await apiFetch(`${API_ENDPOINTS.posts}?page=${pageNum}&limit=20`);

            if (response.ok) {
                const data = await response.json();

                if (pageNum === 1) {
                    setPosts(data.posts || []);
                } else {
                    setPosts(prev => [...prev, ...(data.posts || [])]);
                }

                setHasMore(data.hasMore ?? false);
                setPage(pageNum);
            } else {
                setError('Failed to load feed');
            }
        } catch (err) {
            console.error('Error fetching feed:', err);
            setError('Network error');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const fetchFriends = useCallback(async () => {
        try {
            const response = await apiFetch(`${API_ENDPOINTS.users}/friends`);
            if (response.ok) {
                const data = await response.json();
                setFriends(data.friends || []);
            }
        } catch (err) {
            console.error('Error fetching friends:', err);
        }
    }, []);

    const loadMore = useCallback(() => {
        if (!isLoading && hasMore) {
            fetchFeed(page + 1);
        }
    }, [isLoading, hasMore, page, fetchFeed]);

    const likePost = useCallback(async (postId: string) => {
        try {
            const response = await apiFetch(`${API_ENDPOINTS.posts}/${postId}/like`, {
                method: 'POST',
            });

            if (response.ok) {
                setPosts(prev => prev.map(p =>
                    p.id === postId
                        ? { ...p, isLiked: !p.isLiked, likes: p.isLiked ? p.likes - 1 : p.likes + 1 }
                        : p
                ));
            }
        } catch (err) {
            console.error('Error liking post:', err);
        }
    }, []);

    const createPost = useCallback(async (content: string, mediaFile?: File): Promise<{ success: boolean; error?: string }> => {
        try {
            const formData = new FormData();
            formData.append('content', content);
            if (mediaFile) {
                formData.append('media', mediaFile);
            }

            // Get auth token for the fetch
            const token = typeof window !== 'undefined' ? localStorage.getItem('six22_token') : null;

            const response = await fetch(API_ENDPOINTS.posts, {
                method: 'POST',
                headers: {
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                },
                credentials: 'include',
                body: formData,
            });

            if (response.ok) {
                // Refresh feed to show new post
                await fetchFeed(1);
                return { success: true };
            } else {
                const errorData = await response.json().catch(() => ({}));
                return { success: false, error: errorData.message || 'Failed to create post' };
            }
        } catch (err) {
            console.error('Error creating post:', err);
            return { success: false, error: 'Network error' };
        }
    }, [fetchFeed]);

    useEffect(() => {
        fetchFeed(1);
        fetchFriends();
    }, [fetchFeed, fetchFriends]);

    return {
        posts,
        friends,
        isLoading,
        error,
        hasMore,
        loadMore,
        likePost,
        createPost,
        refetch: () => fetchFeed(1),
    };
}
