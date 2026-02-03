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

            // Use /feed endpoint with cursor-based pagination
            const response = await apiFetch(`${API_ENDPOINTS.posts}/feed?limit=20`);

            if (response.ok) {
                const data = await response.json();

                // Map backend data shape to frontend shape
                const mappedPosts: Post[] = (data.posts || []).map((post: any) => ({
                    id: post.id,
                    author: {
                        id: post.user?.id || post.userId,
                        username: post.user?.username || 'user',
                        displayName: post.user?.displayName || 'User',
                        avatarUrl: post.user?.avatarUrl,
                    },
                    content: post.caption || '',
                    mediaUrl: post.mediaUrl,
                    mediaType: post.type as 'IMAGE' | 'VIDEO',
                    likes: post._count?.likes || post.likesCount || 0,
                    commentsCount: post._count?.comments || post.commentsCount || 0,
                    isLiked: post.isLiked || false,
                    createdAt: post.createdAt,
                }));

                if (pageNum === 1) {
                    setPosts(mappedPosts);
                } else {
                    setPosts(prev => [...prev, ...mappedPosts]);
                }

                setHasMore(!!data.nextCursor);
                setPage(pageNum);
            } else {
                const errorData = await response.json().catch(() => ({}));
                console.error('Feed error:', errorData);
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
            const token = typeof window !== 'undefined' ? localStorage.getItem('0g_token') : null;

            let mediaUrl: string | undefined;
            let mediaType: 'IMAGE' | 'VIDEO' | undefined;

            // Step 1: If there's a media file, upload it first
            if (mediaFile) {
                const uploadFormData = new FormData();
                uploadFormData.append('file', mediaFile);

                const uploadResponse = await fetch(API_ENDPOINTS.upload.post, {
                    method: 'POST',
                    headers: {
                        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                    },
                    credentials: 'include',
                    body: uploadFormData,
                });

                if (!uploadResponse.ok) {
                    const uploadError = await uploadResponse.json().catch(() => ({}));
                    return { success: false, error: uploadError.error || 'Failed to upload media' };
                }

                const uploadResult = await uploadResponse.json();
                mediaUrl = uploadResult.url;
                mediaType = uploadResult.type;
            }

            // Step 2: Create the post with the media URL
            const postData = {
                type: mediaUrl ? (mediaType || 'IMAGE') : 'TEXT',
                caption: content,
                mediaUrl: mediaUrl,
                isPublic: true,
            };

            const response = await fetch(API_ENDPOINTS.posts, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                },
                credentials: 'include',
                body: JSON.stringify(postData),
            });

            if (response.ok) {
                // Refresh feed to show new post
                await fetchFeed(1);
                return { success: true };
            } else {
                const errorData = await response.json().catch(() => ({}));
                return { success: false, error: errorData.message || errorData.error || 'Failed to create post' };
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
