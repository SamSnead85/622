'use client';

import { useState, useEffect, useCallback } from 'react';
import { API_ENDPOINTS, apiFetch, apiUpload } from '@/lib/api';

// ============================================
// TYPES
// ============================================
export interface MomentUser {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
}

export interface Moment {
    id: string;
    userId: string;
    user: MomentUser;
    type: 'IMAGE' | 'VIDEO' | 'TEXT';
    mediaUrl: string;
    thumbnailUrl?: string;
    caption?: string;
    duration?: number;
    viewCount: number;
    expiresAt: string;
    createdAt: string;
    hasViewed?: boolean;
}

export interface MomentGroup {
    user: MomentUser;
    moments: Moment[];
    hasUnviewed: boolean;
}

// ============================================
// MOMENTS HOOK
// ============================================
export function useMoments() {
    const [momentGroups, setMomentGroups] = useState<MomentGroup[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch moments feed
    const fetchMoments = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            const response = await apiFetch(API_ENDPOINTS.momentsFeed);

            if (response.ok) {
                const data = await response.json();
                // Group moments by user
                const grouped = groupMomentsByUser(data.moments || []);
                setMomentGroups(grouped);
            } else {
                setError('Failed to load moments');
            }
        } catch (err) {
            console.error('Error fetching moments:', err);
            setError('Network error');
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Group moments by user for story-style display
    const groupMomentsByUser = (moments: Moment[]): MomentGroup[] => {
        const groups = new Map<string, MomentGroup>();

        moments.forEach((moment) => {
            if (!groups.has(moment.userId)) {
                groups.set(moment.userId, {
                    user: moment.user,
                    moments: [],
                    hasUnviewed: false,
                });
            }
            const group = groups.get(moment.userId)!;
            group.moments.push(moment);
            if (!moment.hasViewed) {
                group.hasUnviewed = true;
            }
        });

        return Array.from(groups.values());
    };

    // Create a new moment
    const createMoment = useCallback(async (
        file: File,
        caption?: string,
        onProgress?: (progress: number) => void
    ) => {
        try {
            // Upload media first
            const uploadResult = await apiUpload(
                API_ENDPOINTS.upload.moment,
                file,
                onProgress
            );

            // Create moment with uploaded media
            const type = file.type.startsWith('video/') ? 'VIDEO' : 'IMAGE';
            const response = await apiFetch(API_ENDPOINTS.moments, {
                method: 'POST',
                body: JSON.stringify({
                    type,
                    mediaUrl: uploadResult.url,
                    caption,
                }),
            });

            if (response.ok) {
                const data = await response.json();
                await fetchMoments(); // Refresh feed
                return { success: true, moment: data.moment };
            } else {
                const errorData = await response.json().catch(() => ({}));
                return { success: false, error: errorData.error || 'Failed to create moment' };
            }
        } catch (err) {
            console.error('Error creating moment:', err);
            return { success: false, error: 'Failed to create moment' };
        }
    }, [fetchMoments]);

    // Mark moment as viewed
    const viewMoment = useCallback(async (momentId: string) => {
        try {
            await apiFetch(API_ENDPOINTS.momentView(momentId), {
                method: 'POST',
            });
            // Update local state
            setMomentGroups((prev) =>
                prev.map((group) => ({
                    ...group,
                    moments: group.moments.map((m) =>
                        m.id === momentId ? { ...m, hasViewed: true } : m
                    ),
                }))
            );
        } catch (err) {
            console.error('Error marking moment as viewed:', err);
        }
    }, []);

    // Delete a moment
    const deleteMoment = useCallback(async (momentId: string) => {
        try {
            const response = await apiFetch(API_ENDPOINTS.moment(momentId), {
                method: 'DELETE',
            });
            if (response.ok) {
                await fetchMoments();
                return { success: true };
            }
            return { success: false, error: 'Failed to delete moment' };
        } catch (err) {
            console.error('Error deleting moment:', err);
            return { success: false, error: 'Failed to delete moment' };
        }
    }, [fetchMoments]);

    // Initial fetch
    useEffect(() => {
        fetchMoments();
    }, [fetchMoments]);

    return {
        momentGroups,
        isLoading,
        error,
        createMoment,
        viewMoment,
        deleteMoment,
        refetch: fetchMoments,
    };
}
