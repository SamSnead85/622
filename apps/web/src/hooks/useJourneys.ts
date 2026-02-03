'use client';

import { useState, useEffect, useCallback } from 'react';
import { API_ENDPOINTS, apiFetch, apiUpload } from '@/lib/api';

// ============================================
// TYPES
// ============================================
export interface JourneyUser {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
    isFollowing: boolean;
}

export interface Journey {
    id: string;
    userId: string;
    user: JourneyUser;
    videoUrl: string;
    thumbnailUrl: string;
    caption: string;
    musicName?: string;
    musicArtist?: string;
    likes: number;
    comments: number;
    shares: number;
    isLiked?: boolean;
    createdAt: string;
}

// ============================================
// JOURNEYS HOOK
// ============================================
export function useJourneys() {
    const [journeys, setJourneys] = useState<Journey[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const [cursor, setCursor] = useState<string | null>(null);

    // Fetch journeys feed
    const fetchJourneys = useCallback(async (reset = false) => {
        try {
            if (reset) {
                setCursor(null);
                setHasMore(true);
            }

            setIsLoading(true);
            setError(null);

            const url = reset || !cursor
                ? API_ENDPOINTS.journeysFeed
                : `${API_ENDPOINTS.journeysFeed}?cursor=${cursor}`;

            const response = await apiFetch(url);

            if (response.ok) {
                const data = await response.json();
                const newJourneys = data.journeys || [];

                if (reset) {
                    setJourneys(newJourneys);
                } else {
                    setJourneys((prev) => [...prev, ...newJourneys]);
                }

                setCursor(data.nextCursor);
                setHasMore(!!data.nextCursor);
            } else {
                setError('Failed to load journeys');
            }
        } catch (err) {
            console.error('Error fetching journeys:', err);
            setError('Network error');
        } finally {
            setIsLoading(false);
        }
    }, [cursor]);

    // Create a new journey
    const createJourney = useCallback(async (
        file: File,
        caption: string,
        musicName?: string,
        musicArtist?: string,
        onProgress?: (progress: number) => void
    ) => {
        try {
            // Upload video first
            const uploadResult = await apiUpload(
                API_ENDPOINTS.upload.journey,
                file,
                onProgress
            );

            // Create journey
            const response = await apiFetch(API_ENDPOINTS.journeys, {
                method: 'POST',
                body: JSON.stringify({
                    videoUrl: uploadResult.url,
                    thumbnailUrl: uploadResult.url, // Could generate thumbnail server-side
                    caption,
                    musicName,
                    musicArtist,
                }),
            });

            if (response.ok) {
                const data = await response.json();
                await fetchJourneys(true); // Refresh feed
                return { success: true, journey: data.journey };
            } else {
                const errorData = await response.json().catch(() => ({}));
                return { success: false, error: errorData.error || 'Failed to create journey' };
            }
        } catch (err) {
            console.error('Error creating journey:', err);
            return { success: false, error: 'Failed to create journey' };
        }
    }, [fetchJourneys]);

    // Like a journey
    const likeJourney = useCallback(async (journeyId: string) => {
        try {
            const response = await apiFetch(API_ENDPOINTS.journeyLike(journeyId), {
                method: 'POST',
            });

            if (response.ok) {
                // Update local state
                setJourneys((prev) =>
                    prev.map((j) =>
                        j.id === journeyId
                            ? { ...j, isLiked: !j.isLiked, likes: j.isLiked ? j.likes - 1 : j.likes + 1 }
                            : j
                    )
                );
                return { success: true };
            }
            return { success: false };
        } catch (err) {
            console.error('Error liking journey:', err);
            return { success: false };
        }
    }, []);

    // Follow user
    const followUser = useCallback(async (userId: string) => {
        try {
            const response = await apiFetch(API_ENDPOINTS.follow(userId), {
                method: 'POST',
            });

            if (response.ok) {
                // Update local state
                setJourneys((prev) =>
                    prev.map((j) =>
                        j.userId === userId
                            ? { ...j, user: { ...j.user, isFollowing: true } }
                            : j
                    )
                );
                return { success: true };
            }
            return { success: false };
        } catch (err) {
            console.error('Error following user:', err);
            return { success: false };
        }
    }, []);

    // Load more (for infinite scroll)
    const loadMore = useCallback(() => {
        if (!isLoading && hasMore) {
            fetchJourneys(false);
        }
    }, [fetchJourneys, isLoading, hasMore]);

    // Initial fetch
    useEffect(() => {
        fetchJourneys(true);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return {
        journeys,
        isLoading,
        error,
        hasMore,
        createJourney,
        likeJourney,
        followUser,
        loadMore,
        refetch: () => fetchJourneys(true),
    };
}
