'use client';

import { useState, useEffect, useCallback } from 'react';
import { API_ENDPOINTS, apiFetch } from '@/lib/api';

// ============================================
// TYPES
// ============================================
export interface Community {
    id: string;
    name: string;
    description: string;
    memberCount: number;
    isPrivate: boolean;
    coverUrl?: string;
    role: 'admin' | 'moderator' | 'member';
    createdAt: string;
}

export interface CreateCommunityData {
    name: string;
    description: string;
    category: string;
    privacy: 'public' | 'private';
    approvalRequired: boolean;
    coverImage: string | null;
}

// ============================================
// COMMUNITIES HOOK
// Fetches user's communities from API
// ============================================
export function useCommunities() {
    const [communities, setCommunities] = useState<Community[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchCommunities = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            const response = await apiFetch(API_ENDPOINTS.communities);

            if (response.ok) {
                const data = await response.json();
                setCommunities(data.communities || []);
            } else {
                setError('Failed to load communities');
            }
        } catch (err) {
            console.error('Error fetching communities:', err);
            setError('Network error');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const createCommunity = useCallback(async (data: CreateCommunityData): Promise<{ success: boolean; communityId?: string; error?: string }> => {
        try {
            const response = await apiFetch(API_ENDPOINTS.communities, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: data.name,
                    description: data.description,
                    category: data.category,
                    isPrivate: data.privacy === 'private',
                    approvalRequired: data.approvalRequired,
                    coverUrl: data.coverImage,
                }),
            });

            if (response.ok) {
                const result = await response.json();
                await fetchCommunities(); // Refresh list
                return { success: true, communityId: result.community?.id };
            } else {
                const errorData = await response.json().catch(() => ({}));
                return { success: false, error: errorData.message || 'Failed to create community' };
            }
        } catch (err) {
            console.error('Error creating community:', err);
            return { success: false, error: 'Network error' };
        }
    }, [fetchCommunities]);

    const joinCommunity = useCallback(async (communityId: string) => {
        try {
            const response = await apiFetch(`${API_ENDPOINTS.communities}/${communityId}/join`, {
                method: 'POST',
            });
            if (response.ok) {
                await fetchCommunities(); // Refresh list
            }
        } catch (err) {
            console.error('Error joining community:', err);
        }
    }, [fetchCommunities]);

    const leaveCommunity = useCallback(async (communityId: string) => {
        try {
            const response = await apiFetch(`${API_ENDPOINTS.communities}/${communityId}/leave`, {
                method: 'POST',
            });
            if (response.ok) {
                await fetchCommunities(); // Refresh list
            }
        } catch (err) {
            console.error('Error leaving community:', err);
        }
    }, [fetchCommunities]);

    useEffect(() => {
        fetchCommunities();
    }, [fetchCommunities]);

    return {
        communities,
        isLoading,
        error,
        createCommunity,
        joinCommunity,
        leaveCommunity,
        refetch: fetchCommunities,
    };
}
