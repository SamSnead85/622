'use client';

import { useState, useEffect, useCallback } from 'react';
import { API_ENDPOINTS, apiFetch } from '@/lib/api';

// ============================================
// TYPES
// ============================================
export interface TrendingTopic {
    tag: string;
    posts: string;
}

export interface ExploreItem {
    id: string;
    type: 'large' | 'small';
    image: string;
    likes: number;
}

export interface SuggestedUser {
    id: string;
    name: string;
    username: string;
    avatar: string;
    followers: string;
}

// ============================================
// EXPLORE HOOK
// Fetches explore/discovery content from API
// ============================================
export function useExplore() {
    const [topics, setTopics] = useState<TrendingTopic[]>([]);
    const [items, setItems] = useState<ExploreItem[]>([]);
    const [users, setUsers] = useState<SuggestedUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchExplore = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            // Fetch explore content - typically a trending/discover endpoint
            const response = await apiFetch(`${API_ENDPOINTS.posts}/explore`);

            if (response.ok) {
                const data = await response.json();
                setTopics(data.trending || []);
                setItems(data.posts || []);
                setUsers(data.suggestedUsers || []);
            } else {
                setError('Failed to load explore content');
            }
        } catch (err) {
            console.error('Error fetching explore:', err);
            setError('Network error');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const search = useCallback(async (query: string) => {
        setSearchQuery(query);
        if (!query.trim()) {
            await fetchExplore();
            return;
        }

        try {
            setIsLoading(true);
            const response = await apiFetch(`${API_ENDPOINTS.posts}/search?q=${encodeURIComponent(query)}`);

            if (response.ok) {
                const data = await response.json();
                setItems(data.posts || []);
                setUsers(data.users || []);
            }
        } catch (err) {
            console.error('Error searching:', err);
        } finally {
            setIsLoading(false);
        }
    }, [fetchExplore]);

    const followUser = useCallback(async (userId: string) => {
        try {
            const response = await apiFetch(`${API_ENDPOINTS.users}/${userId}/follow`, {
                method: 'POST',
            });
            if (response.ok) {
                // Update user in list
                setUsers(prev => prev.filter(u => u.id !== userId));
            }
        } catch (err) {
            console.error('Error following user:', err);
        }
    }, []);

    useEffect(() => {
        fetchExplore();
    }, [fetchExplore]);

    return {
        topics,
        items,
        users,
        isLoading,
        error,
        searchQuery,
        search,
        followUser,
        refetch: fetchExplore,
    };
}
