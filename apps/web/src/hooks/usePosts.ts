'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
    thumbnailUrl?: string;      // Poster/thumbnail URL (generated server-side for videos)
    fullMediaUrl?: string;      // Original resolution (for detail views)
    mediaType?: 'IMAGE' | 'VIDEO';
    mediaCropY?: number; // Vertical crop position 0-100 (50 = center)
    mediaAspectRatio?: '16:9' | '4:3' | '1:1' | '4:5' | 'original';
    type: 'IMAGE' | 'VIDEO' | 'TEXT' | 'POLL' | 'RALLY';
    embedUrl?: string;
    likes: number;
    commentsCount: number;
    rsvpCount: number;
    isPinned?: boolean;
    sortOrder?: number;
    isLiked: boolean;
    isRsvped: boolean;
    createdAt: string;
}

export interface FeedUser {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
    hasStory: boolean;
}

export interface UsePostsOptions {
    communityId?: string;
    feedView?: 'private' | 'community';
}

// ============================================
// POSTS/FEED HOOK
// Fetches posts from API with pagination
// ============================================
export function usePosts(options?: UsePostsOptions) {
    const [posts, setPosts] = useState<Post[]>([]);
    const [friends, setFriends] = useState<FeedUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const nextCursorRef = useRef<string | null>(null); // Ref to avoid closure staleness
    const postsRef = useRef<Post[]>([]); // Ref for stable callback access

    const fetchFeed = useCallback(async (cursor: string | null = null, reset: boolean = false) => {
        try {
            if (reset) {
                setIsLoading(true);
                setPosts([]);
            }

            setError(null);

            // Construct URL based on context (Community vs Main Feed)
            // Pass feedView parameter for privacy-first feed isolation
            let url = options?.communityId
                ? `${API_ENDPOINTS.communities}/${options.communityId}/posts?limit=20`
                : `${API_ENDPOINTS.posts}/feed?limit=20${options?.feedView ? `&view=${options.feedView}` : ''}`;

            if (cursor) {
                url += `&cursor=${cursor}`;
            }

            const response = await apiFetch(url);

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
                    mediaType: (post.type === 'IMAGE' || post.type === 'VIDEO') ? post.type as 'IMAGE' | 'VIDEO' : undefined,
                    mediaCropY: post.mediaCropY ?? undefined,
                    mediaAspectRatio: post.mediaAspectRatio ?? undefined,
                    type: post.type,
                    isPinned: post.isPinned || false,
                    sortOrder: post.sortOrder ?? 0,
                    likes: post._count?.likes || post.likesCount || 0,
                    commentsCount: post._count?.comments || post.commentsCount || 0,
                    rsvpCount: post._count?.rsvps || post.rsvpCount || 0,
                    isLiked: post.isLiked || false,
                    isRsvped: post.isRsvped || false,
                    createdAt: post.createdAt,
                }));

                if (reset) {
                    setPosts(mappedPosts);
                } else {
                    setPosts(prev => {
                        // Avoid duplicates
                        const existingIds = new Set(prev.map(p => p.id));
                        const newPosts = mappedPosts.filter(p => !existingIds.has(p.id));
                        return [...prev, ...newPosts];
                    });
                }

                setHasMore(!!data.nextCursor);
                setNextCursor(data.nextCursor);
                nextCursorRef.current = data.nextCursor;
            } else {
                const errorData = await response.json().catch(() => ({}));
                console.error('Feed error:', errorData);
                setError('Failed to load feed');
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to load posts';
            setError(message);
            console.error('Feed error:', err);
        } finally {
            if (reset) setIsLoading(false);
        }
    }, [options?.communityId, options?.feedView]);

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
        if (!isLoading && hasMore && nextCursorRef.current) {
            fetchFeed(nextCursorRef.current, false);
        }
    }, [isLoading, hasMore, fetchFeed]);

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

    // Keep postsRef in sync — avoids putting `posts` in callback deps
    useEffect(() => { postsRef.current = posts; }, [posts]);

    const toggleRsvp = useCallback(async (postId: string) => {
        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('0g_token') : null;
            if (!token) return;

            const post = postsRef.current.find(p => p.id === postId);
            if (!post) return;

            // Optimistic update
            const newIsRsvped = !post.isRsvped;
            const newCount = newIsRsvped ? post.rsvpCount + 1 : Math.max(0, post.rsvpCount - 1);

            setPosts(prev => prev.map(p =>
                p.id === postId
                    ? { ...p, isRsvped: newIsRsvped, rsvpCount: newCount }
                    : p
            ));

            const method = newIsRsvped ? 'POST' : 'DELETE';
            const body = newIsRsvped ? JSON.stringify({ status: 'IN' }) : undefined;

            const response = await fetch(`${API_ENDPOINTS.posts}/${postId}/rsvp`, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body
            });

            if (!response.ok) {
                // Revert on error
                setPosts(prev => prev.map(p =>
                    p.id === postId
                        ? { ...p, isRsvped: !newIsRsvped, rsvpCount: post.rsvpCount }
                        : p
                ));
            }
        } catch (err) {
            console.error('Error toggling RSVP:', err);
        }
    }, []); // No dependency on `posts` — uses postsRef instead

    const createPost = useCallback(async (content: string, mediaFile?: File, topicIds?: string[], typeOverride?: string, communityIdOverride?: string): Promise<{ success: boolean; error?: string }> => {
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
                type: typeOverride || (mediaUrl ? (mediaType || 'IMAGE') : 'TEXT'),
                caption: content,
                mediaUrl: mediaUrl,
                isPublic: true,
                communityId: communityIdOverride || options?.communityId,
                topicIds: topicIds, // Include topic IDs
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
                await fetchFeed(null, true);
                return { success: true };
            } else {
                const errorData = await response.json().catch(() => ({}));
                return { success: false, error: errorData.message || errorData.error || 'Failed to create post' };
            }
        } catch (err) {
            console.error('Error creating post:', err);
            return { success: false, error: 'Network error' };
        }
    }, [fetchFeed, options?.communityId]);

    const pinPost = useCallback(async (postId: string) => {
        try {
            const response = await apiFetch(`${API_ENDPOINTS.posts}/${postId}/pin`, {
                method: 'PATCH',
            });

            if (response.ok) {
                const data = await response.json();
                setPosts(prev => prev.map(p =>
                    p.id === postId
                        ? { ...p, isPinned: data.isPinned, sortOrder: data.sortOrder }
                        : p
                ));
            }
        } catch (err) {
            console.error('Error pinning post:', err);
        }
    }, []);

    const deletePost = useCallback(async (postId: string): Promise<{ success: boolean; error?: string }> => {
        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('0g_token') : null;

            // Optimistically remove from local state
            setPosts(prev => prev.filter(p => p.id !== postId));

            const response = await fetch(`${API_ENDPOINTS.posts}/${postId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                },
                credentials: 'include',
                body: JSON.stringify({}), // Fix for some proxies requiring body
            });

            if (response.ok) {
                return { success: true };
            } else {
                // Revert on error - refetch the feed
                await fetchFeed(null, true);
                const errorData = await response.json().catch(() => ({}));
                return { success: false, error: errorData.message || errorData.error || 'Failed to delete post' };
            }
        } catch (err) {
            // Revert on error - refetch the feed
            await fetchFeed(null, true);
            console.error('Error deleting post:', err);
            return { success: false, error: 'Network error' };
        }
    }, [fetchFeed]);

    // Move a post up or down in feed order (swap sortOrder with neighbor)
    const movePost = useCallback(async (postId: string, direction: 'up' | 'down') => {
        const currentIndex = postsRef.current.findIndex(p => p.id === postId);
        if (currentIndex === -1) return;
        const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
        if (targetIndex < 0 || targetIndex >= postsRef.current.length) return;

        const current = postsRef.current[currentIndex];
        const neighbor = postsRef.current[targetIndex];

        // Optimistically swap in local state
        setPosts(prev => {
            const updated = [...prev];
            updated[currentIndex] = neighbor;
            updated[targetIndex] = current;
            return updated;
        });

        // Persist to backend — assign sortOrders based on position (higher = shown first)
        const totalPosts = postsRef.current.length;
        try {
            await apiFetch(`${API_ENDPOINTS.posts}/reorder`, {
                method: 'PUT',
                body: JSON.stringify({
                    posts: [
                        { id: current.id, sortOrder: totalPosts - targetIndex },
                        { id: neighbor.id, sortOrder: totalPosts - currentIndex },
                    ],
                }),
            });
        } catch (err) {
            // Revert on error
            setPosts(prev => {
                const reverted = [...prev];
                reverted[currentIndex] = current;
                reverted[targetIndex] = neighbor;
                return reverted;
            });
        }
    }, []);

    useEffect(() => {
        fetchFeed(null, true);
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
        toggleRsvp,
        pinPost,
        createPost,
        deletePost,
        movePost,
        refetch: () => fetchFeed(null, true),
    };
}
