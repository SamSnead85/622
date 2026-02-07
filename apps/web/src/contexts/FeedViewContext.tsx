'use client';

import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { API_URL, apiFetch } from '@/lib/api';

/**
 * FeedViewContext — Privacy-First Feed Isolation
 *
 * Manages the toggle between:
 * - "private"   → Only posts from your groups, communities, and people you follow.
 *                  You are invisible to the larger community.
 * - "community" → The broader public feed. Requires communityOptIn.
 *
 * Also manages the community opt-in flow and public profile setup.
 */

export type FeedView = 'private' | 'community';

interface FeedViewContextType {
    /** Current active feed view */
    feedView: FeedView;
    /** Switch between private and community feed */
    setFeedView: (view: FeedView) => void;
    /** Whether the user has opted into the community */
    communityOptIn: boolean;
    /** Whether user uses a separate public identity */
    usePublicProfile: boolean;
    /** Opt into the community (one-time action) */
    joinCommunity: (options?: {
        usePublicProfile?: boolean;
        publicDisplayName?: string;
        publicUsername?: string;
        publicAvatarUrl?: string;
        publicBio?: string;
    }) => Promise<boolean>;
    /** Leave the community and go fully private */
    leaveCommunity: () => Promise<boolean>;
    /** Update public profile settings */
    updatePublicProfile: (data: {
        usePublicProfile?: boolean;
        publicDisplayName?: string;
        publicUsername?: string;
        publicAvatarUrl?: string;
        publicBio?: string;
    }) => Promise<boolean>;
    /** Whether the join community modal should be shown */
    showJoinModal: boolean;
    setShowJoinModal: (show: boolean) => void;
}

const FeedViewContext = createContext<FeedViewContextType>({
    feedView: 'private',
    setFeedView: () => {},
    communityOptIn: false,
    usePublicProfile: false,
    joinCommunity: async () => false,
    leaveCommunity: async () => false,
    updatePublicProfile: async () => false,
    showJoinModal: false,
    setShowJoinModal: () => {},
});

export function useFeedView() {
    return useContext(FeedViewContext);
}

export function FeedViewProvider({ children }: { children: React.ReactNode }) {
    const { user, updateUser } = useAuth();
    // Initialize directly from user data — avoids a re-render + double-fetch cycle
    const [feedView, setFeedViewState] = useState<FeedView>(() =>
        (user?.activeFeedView as FeedView) || 'private'
    );
    const [showJoinModal, setShowJoinModal] = useState(false);

    // Only sync if the server-side value changes AFTER initial mount (e.g. user switches tab)
    const initializedRef = useRef(false);
    useEffect(() => {
        if (!user) return;
        if (!initializedRef.current) {
            // First time user data arrives — sync if different from default
            initializedRef.current = true;
            const serverView = (user.activeFeedView as FeedView) || 'private';
            if (serverView !== feedView) {
                setFeedViewState(serverView);
            }
            return;
        }
        // Subsequent changes (e.g. updated from another tab)
        setFeedViewState((user.activeFeedView as FeedView) || 'private');
    }, [user?.activeFeedView]);

    const communityOptIn = user?.communityOptIn ?? false;
    const usePublicProfile = user?.usePublicProfile ?? false;

    const setFeedView = useCallback(async (view: FeedView) => {
        if (view === 'community' && !communityOptIn) {
            // Show the join community modal instead of switching
            setShowJoinModal(true);
            return;
        }

        setFeedViewState(view);

        // Persist to server
        try {
            await apiFetch(`${API_URL}/api/v1/users/feed-view`, {
                method: 'PUT',
                body: JSON.stringify({ view }),
            });
            await updateUser({ activeFeedView: view });
        } catch (err) {
            console.error('Failed to update feed view:', err);
        }
    }, [communityOptIn, updateUser]);

    const joinCommunity = useCallback(async (options?: {
        usePublicProfile?: boolean;
        publicDisplayName?: string;
        publicUsername?: string;
        publicAvatarUrl?: string;
        publicBio?: string;
    }): Promise<boolean> => {
        try {
            const res = await apiFetch(`${API_URL}/api/v1/users/community-opt-in`, {
                method: 'POST',
                body: JSON.stringify({
                    optIn: true,
                    ...options,
                }),
            });

            if (res.ok) {
                const data = await res.json();
                await updateUser({
                    communityOptIn: true,
                    activeFeedView: 'community',
                    usePublicProfile: data.usePublicProfile,
                    publicDisplayName: data.publicDisplayName,
                    publicUsername: data.publicUsername,
                    publicAvatarUrl: data.publicAvatarUrl,
                    publicBio: data.publicBio,
                });
                setFeedViewState('community');
                setShowJoinModal(false);
                return true;
            }
            return false;
        } catch (err) {
            console.error('Failed to join community:', err);
            return false;
        }
    }, [updateUser]);

    const leaveCommunity = useCallback(async (): Promise<boolean> => {
        try {
            const res = await apiFetch(`${API_URL}/api/v1/users/community-opt-in`, {
                method: 'POST',
                body: JSON.stringify({ optIn: false }),
            });

            if (res.ok) {
                await updateUser({
                    communityOptIn: false,
                    activeFeedView: 'private',
                });
                setFeedViewState('private');
                return true;
            }
            return false;
        } catch (err) {
            console.error('Failed to leave community:', err);
            return false;
        }
    }, [updateUser]);

    const updatePublicProfile = useCallback(async (data: {
        usePublicProfile?: boolean;
        publicDisplayName?: string;
        publicUsername?: string;
        publicAvatarUrl?: string;
        publicBio?: string;
    }): Promise<boolean> => {
        try {
            const res = await apiFetch(`${API_URL}/api/v1/users/public-profile`, {
                method: 'PUT',
                body: JSON.stringify(data),
            });

            if (res.ok) {
                const result = await res.json();
                await updateUser(result);
                return true;
            }
            return false;
        } catch (err) {
            console.error('Failed to update public profile:', err);
            return false;
        }
    }, [updateUser]);

    return (
        <FeedViewContext.Provider value={{
            feedView,
            setFeedView,
            communityOptIn,
            usePublicProfile,
            joinCommunity,
            leaveCommunity,
            updatePublicProfile,
            showJoinModal,
            setShowJoinModal,
        }}>
            {children}
        </FeedViewContext.Provider>
    );
}
