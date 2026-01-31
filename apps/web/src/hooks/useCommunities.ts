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
        joinCommunity,
        leaveCommunity,
        refetch: fetchCommunities,
    };
}
