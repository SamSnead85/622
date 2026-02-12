// ============================================
// 0G Mobile — Zustand Stores
// All stores connected to real backend API
// ============================================

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { shallow } from 'zustand/shallow';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch, apiUpload, saveToken, removeToken, getToken, API, clearApiCache, setSessionExpiredHandler } from '../lib/api';
import { socketManager } from '../lib/socket';

// ============================================
// Conditional logging — only in development
// ============================================
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const devLog = __DEV__ ? (...args: any[]) => console.log('[stores]', ...args) : () => {};
const devError = __DEV__ ? (...args: any[]) => console.error('[stores]', ...args) : () => {};

// ============================================
// Shared User Normalization
// Ensures consistent user shape across all auth paths
// ============================================

function normalizeUser(rawUser: any): User {
    return {
        id: rawUser.id,
        username: rawUser.username || '',
        displayName: rawUser.displayName || rawUser.username || 'User',
        email: rawUser.email || '',
        avatarUrl: rawUser.avatarUrl,
        coverUrl: rawUser.coverUrl,
        bio: rawUser.bio,
        website: rawUser.website,
        followersCount: rawUser.followersCount ?? rawUser._count?.followers ?? 0,
        followingCount: rawUser.followingCount ?? rawUser._count?.following ?? 0,
        postsCount: rawUser.postsCount ?? rawUser._count?.posts ?? 0,
        isVerified: rawUser.isVerified ?? false,
        isPrivate: rawUser.isPrivate ?? true,
        createdAt: rawUser.createdAt || new Date().toISOString(),
        communityOptIn: rawUser.communityOptIn ?? false,
        activeFeedView: rawUser.activeFeedView,
        usePublicProfile: rawUser.usePublicProfile,
        publicDisplayName: rawUser.publicDisplayName,
        publicUsername: rawUser.publicUsername,
        publicAvatarUrl: rawUser.publicAvatarUrl,
        publicBio: rawUser.publicBio,
        culturalProfile: rawUser.culturalProfile || 'standard',
        customGreeting: rawUser.customGreeting,
    };
}

// ============================================
// Zustand Persistence Storage Adapter
// ============================================

const zustandStorage = createJSONStorage(() => AsyncStorage);

// ============================================
// Types
// ============================================

export interface User {
    id: string;
    username: string;
    displayName: string;
    email: string;
    avatarUrl?: string;
    coverUrl?: string;
    bio?: string;
    website?: string;
    followersCount: number;
    followingCount: number;
    postsCount: number;
    isVerified: boolean;
    isPrivate: boolean;
    createdAt: string;
    // Privacy-first fields
    communityOptIn?: boolean;
    activeFeedView?: string;
    usePublicProfile?: boolean;
    publicDisplayName?: string;
    publicUsername?: string;
    publicAvatarUrl?: string;
    publicBio?: string;
    // Cultural profile
    culturalProfile?: string;
    customGreeting?: string;
}

export interface PostAuthor {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
    isVerified?: boolean;
}

export interface Post {
    id: string;
    content: string;
    mediaUrl?: string;
    thumbnailUrl?: string;      // 200px grid thumbnail (from server)
    fullMediaUrl?: string;      // Original resolution (for detail views)
    mediaType?: string;
    mediaCropY?: number;
    mediaAspectRatio?: string;
    sortOrder?: number;
    author: PostAuthor | null;
    authorNote?: string;
    likesCount: number;
    commentsCount: number;
    sharesCount: number;
    isLiked: boolean;
    isSaved: boolean;
    isRsvped: boolean;
    createdAt: string;
    communityId?: string;
    eventDate?: string;
    eventLocation?: string;
    type?: string;
}

export interface Comment {
    id: string;
    content: string;
    author: PostAuthor;
    createdAt: string;
    likesCount: number;
    isLiked: boolean;
}

export interface Community {
    id: string;
    name: string;
    slug?: string;
    description: string;
    avatarUrl?: string;
    coverUrl?: string;
    membersCount: number;
    postsCount: number;
    isPublic: boolean;
    approvalRequired?: boolean;
    role: 'member' | 'admin' | 'moderator' | null;
    requestStatus?: 'pending' | 'approved' | 'rejected' | null;
    createdAt: string;
}

// ============================================
// Auth Store
// ============================================

interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    isInitialized: boolean;
    isRefreshing: boolean;
    error: string | null;

    initialize: () => Promise<void>;
    login: (email: string, password: string) => Promise<void>;
    signup: (email: string, password: string, displayName: string) => Promise<void>;
    appleLogin: (identityToken: string, fullName?: { givenName?: string; familyName?: string } | null) => Promise<void>;
    googleLogin: (tokenOrAccessToken: string, userInfo?: { email: string; name?: string; picture?: string; sub?: string }) => Promise<void>;
    logout: () => Promise<void>;
    updateUser: (updates: Partial<User>) => void;
    refreshUser: () => Promise<void>;
    clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    isInitialized: false,
    isRefreshing: false,
    error: null,

    initialize: async () => {
        // Prevent redundant initialize calls (e.g. double-mount in React Strict Mode)
        if (get().isInitialized || get().isLoading) return;
        set({ isLoading: true });

        try {
            // Wrap AsyncStorage read in its own try/catch — storage can throw on corrupt data
            let token: string | null = null;
            try {
                token = await getToken();
            } catch (storageError) {
                devError('Failed to read token from storage:', storageError);
                set({ isInitialized: true, isAuthenticated: false, isLoading: false });
                return;
            }

            if (!token) {
                set({ isInitialized: true, isAuthenticated: false, isLoading: false });
                return;
            }

            const data = await apiFetch<any>(API.me);
            if (data.user || data.id) {
                const user = normalizeUser(data.user || data);
                set({
                    user,
                    isAuthenticated: true,
                    isInitialized: true,
                    isLoading: false,
                });
            } else {
                await removeToken();
                set({ isInitialized: true, isAuthenticated: false, isLoading: false });
            }
        } catch (error) {
            // Don't clear token on network errors — user might be offline
            const isNetwork = error instanceof TypeError ||
                (error instanceof Error && error.message.toLowerCase().includes('network'));
            if (!isNetwork) {
                try { await removeToken(); } catch { /* storage write failed, ignore */ }
            }
            set({ isInitialized: true, isAuthenticated: false, isLoading: false });
        }
    },

    login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
            const data = await apiFetch<any>(API.login, {
                method: 'POST',
                body: JSON.stringify({ email, password }),
            });

            if (data.token) {
                await saveToken(data.token);
            }

            const user = normalizeUser(data.user || data);
            set({
                user,
                isAuthenticated: true,
                isLoading: false,
            });
        } catch (error: any) {
            set({
                error: error.message || 'Login failed. Please try again.',
                isLoading: false,
            });
            throw error;
        }
    },

    signup: async (email, password, displayName) => {
        set({ isLoading: true, error: null });
        try {
            // Generate a temporary username from displayName for initial signup
            const tempUsername = displayName
                .toLowerCase()
                .replace(/[^a-z0-9]/g, '')
                .substring(0, 20) + Math.floor(Math.random() * 999);
            const data = await apiFetch<any>(API.signup, {
                method: 'POST',
                body: JSON.stringify({
                    email,
                    password,
                    displayName,
                    username: tempUsername,
                    accessCode: 'MOBILE_BETA', // Default access code for mobile signups
                }),
            });

            if (data.token) {
                await saveToken(data.token);
            }

            const user = normalizeUser(data.user || data);
            set({
                user,
                isAuthenticated: true,
                isLoading: false,
            });
        } catch (error: any) {
            set({
                error: error.message || 'Signup failed. Please try again.',
                isLoading: false,
            });
            throw error;
        }
    },

    appleLogin: async (identityToken, fullName) => {
        set({ isLoading: true, error: null });
        try {
            const displayName = fullName
                ? [fullName.givenName, fullName.familyName].filter(Boolean).join(' ')
                : undefined;

            const data = await apiFetch<any>(API.appleAuth, {
                method: 'POST',
                body: JSON.stringify({ identityToken, displayName }),
            });

            if (data.token) {
                await saveToken(data.token);
            }

            const user = normalizeUser(data.user || data);
            set({
                user,
                isAuthenticated: true,
                isLoading: false,
            });
        } catch (error: any) {
            set({
                error: error.message || 'Apple sign-in failed. Please try again.',
                isLoading: false,
            });
            throw error;
        }
    },

    googleLogin: async (tokenOrAccessToken, userInfo) => {
        set({ isLoading: true, error: null });
        try {
            // If userInfo is provided, this is an access token flow
            const body = userInfo
                ? { accessToken: tokenOrAccessToken, userInfo }
                : { idToken: tokenOrAccessToken };

            const data = await apiFetch<any>(API.googleAuth, {
                method: 'POST',
                body: JSON.stringify(body),
            });

            if (data.token) {
                await saveToken(data.token);
            }

            const user = normalizeUser(data.user || data);
            set({
                user,
                isAuthenticated: true,
                isLoading: false,
            });
        } catch (error: any) {
            set({
                error: error.message || 'Google sign-in failed. Please try again.',
                isLoading: false,
            });
            throw error;
        }
    },

    logout: async () => {
        await removeToken();
        set({
            user: null,
            isAuthenticated: false,
            error: null,
        });
        // Reset all other stores on logout
        useFeedStore.getState().reset();
        useCommunitiesStore.getState().reset();
        useNotificationsStore.getState().reset();
        useMomentsStore.getState().reset();
        useGovernanceStore.getState().reset();
        useGameStore.getState().reset();
        // Clear in-memory API response cache
        clearApiCache();
        // Clear persisted store data from AsyncStorage
        try {
            await AsyncStorage.multiRemove([
                'feed-storage',
                'communities-storage',
                'notifications-storage',
            ]);
        } catch {
            // Storage cleanup failed — non-critical
        }
    },

    updateUser: (updates) => {
        const currentUser = get().user;
        if (currentUser) {
            set({ user: { ...currentUser, ...updates } });
        }
    },

    refreshUser: async () => {
        if (get().isRefreshing) return;
        set({ isRefreshing: true });
        try {
            const data = await apiFetch<any>(API.me);
            const rawUser = data.user || data;
            if (rawUser?.id) {
                const currentUser = get().user;
                const normalized = normalizeUser(rawUser);
                // Merge with current user to preserve any local-only state
                set({
                    user: {
                        ...currentUser,
                        ...normalized,
                    },
                });
            }
        } catch (error) {
            // Silently fail — user might be offline
        } finally {
            set({ isRefreshing: false });
        }
    },

    clearError: () => set({ error: null }),
}),
        {
            name: 'auth-storage',
            storage: zustandStorage,
            partialize: (state) => ({
                user: state.user,
                isAuthenticated: state.isAuthenticated,
            }),
        }
    )
);

// ============================================
// Session Expired Handler
// When the API layer detects an expired/invalid token
// and refresh fails, this triggers a logout with a message.
// ============================================

setSessionExpiredHandler(() => {
    const state = useAuthStore.getState();
    if (state.isAuthenticated) {
        state.logout();
        // Set error message so the login screen can display it
        useAuthStore.setState({ error: 'Your session has expired. Please log in again.' });
    }
});

// ============================================
// Feed Store
// ============================================

interface FeedState {
    posts: Post[];
    isLoading: boolean;
    isRefreshing: boolean;
    hasMore: boolean;
    nextCursor: string | null;
    error: string | null;
    cacheTimestamp: number;
    /** True when showing persisted data because network is unavailable */
    isShowingCachedData: boolean;

    fetchFeed: (refresh?: boolean, feedType?: 'foryou' | 'following', feedView?: 'private' | 'community', silent?: boolean) => Promise<void>;
    likePost: (postId: string) => Promise<void>;
    unlikePost: (postId: string) => Promise<void>;
    savePost: (postId: string) => Promise<void>;
    unsavePost: (postId: string) => Promise<void>;
    movePost: (postId: string, direction: 'up' | 'down') => Promise<void>;
    deletePost: (postId: string) => Promise<void>;
    reportPost: (postId: string, reason?: string) => Promise<void>;
    addPost: (post: Post) => void;
    clear: () => void;
    reset: () => void;
}

// Map server post shape to mobile Post interface
export function mapApiPost(raw: any): Post {
    return {
        id: raw.id,
        content: raw.caption || raw.content || '',
        mediaUrl: raw.mediaUrl,                               // 800px feed-optimized (from server)
        thumbnailUrl: raw.thumbnailUrl,                       // 200px grid thumbnail (from server)
        fullMediaUrl: raw.fullMediaUrl || raw.mediaUrl,       // Original resolution for detail views
        mediaType: raw.type || raw.mediaType,
        mediaCropY: raw.mediaCropY,
        mediaAspectRatio: raw.mediaAspectRatio,
        sortOrder: raw.sortOrder,
        author: raw.user || raw.author || null,
        authorNote: raw.authorNote || raw.pinnedComment || undefined,
        likesCount: raw.likesCount ?? raw._count?.likes ?? 0,
        commentsCount: raw.commentsCount ?? raw._count?.comments ?? 0,
        sharesCount: raw.sharesCount ?? raw._count?.shares ?? 0,
        isLiked: raw.isLiked ?? false,
        isSaved: raw.isSaved ?? false,
        isRsvped: raw.isRsvped ?? false,
        createdAt: raw.createdAt,
        communityId: raw.communityId,
        eventDate: raw.eventDate,
        eventLocation: raw.eventLocation,
        type: raw.type,
    };
}

// Race condition guard: only the latest fetchFeed request applies its results
let _feedRequestId = 0;
// AbortController for cancelling stale in-flight requests
let _feedAbortController: AbortController | null = null;

export const useFeedStore = create<FeedState>()(
    persist(
        (set, get) => ({
    posts: [],
    isLoading: false,
    isRefreshing: false,
    hasMore: true,
    nextCursor: null,
    error: null,
    cacheTimestamp: 0,
    isShowingCachedData: false,

    fetchFeed: async (refresh = false, feedType: 'foryou' | 'following' = 'foryou', feedView: 'private' | 'community' = 'private', silent = false) => {
        // Use getState() for freshest state to avoid stale closure reads
        const state = useFeedStore.getState();
        // Prevent concurrent fetches — block if already loading OR refreshing
        if (state.isLoading || state.isRefreshing) {
            if (!refresh) return; // Allow refresh to override, but not load-more
        }

        // Cancel any in-flight request before starting a new one
        if (_feedAbortController) {
            _feedAbortController.abort();
        }
        _feedAbortController = new AbortController();
        const signal = _feedAbortController.signal;

        // Increment and capture request ID to detect stale responses
        const requestId = ++_feedRequestId;

        if (refresh) {
            if (silent) {
                // Silent background refresh — no spinners shown
                set({ nextCursor: null });
            } else {
                // SWR: keep existing posts visible while refreshing (no blank screen)
                // Only show isLoading spinner if we have NO cached posts
                set({
                    isRefreshing: true,
                    isLoading: state.posts.length === 0,
                    nextCursor: null,
                });
            }
        } else {
            set({ isLoading: true });
        }

        try {
            const cursor = refresh ? '' : state.nextCursor;
            const cursorParam = cursor ? `&cursor=${cursor}` : '';
            const data = await apiFetch<any>(
                `${API.feed}?type=${feedType}&feedView=${feedView}&limit=20${cursorParam}`,
                { signal }
            );

            // Discard stale response — a newer request has been started
            if (requestId !== _feedRequestId) return;

            const rawPosts = data.posts || data.data || [];
            const posts = rawPosts.map(mapApiPost);
            const newCursor = data.nextCursor || null;

            if (refresh) {
                // Normalize: deduplicate even on refresh (server might return overlapping data)
                const seen = new Set<string>();
                const uniquePosts = posts.filter((p: Post) => {
                    if (seen.has(p.id)) return false;
                    seen.add(p.id);
                    return true;
                });
                set({
                    posts: uniquePosts,
                    isRefreshing: false,
                    isLoading: false,
                    hasMore: !!newCursor,
                    nextCursor: newCursor,
                    cacheTimestamp: Date.now(),
                    isShowingCachedData: false,
                });
            } else {
                // Deduplicate: only append posts whose IDs aren't already present
                // Cap at 200 posts in memory to prevent OOM on low-end devices
                set((prev) => {
                    const existingIds = new Set(prev.posts.map((p) => p.id));
                    const uniqueNew = posts.filter((p: Post) => !existingIds.has(p.id));
                    const allPosts = [...prev.posts, ...uniqueNew];
                    return {
                        posts: allPosts.length > 200 ? allPosts.slice(-200) : allPosts,
                        isLoading: false,
                        hasMore: !!newCursor,
                        nextCursor: newCursor,
                    };
                });
            }
        } catch (error: any) {
            // Silently ignore aborted requests
            if (error?.name === 'AbortError') return;
            // Discard stale error — a newer request has been started
            if (requestId !== _feedRequestId) return;

            // SWR: on error, keep existing cached posts visible
            // If we have cached posts and this is a network error, flag as cached data
            const currentPosts = useFeedStore.getState().posts;
            const isNetwork = error instanceof TypeError ||
                (error instanceof Error && error.message.toLowerCase().includes('network'));
            set({
                error: error.message || 'Failed to load feed',
                isLoading: false,
                isRefreshing: false,
                isShowingCachedData: isNetwork && currentPosts.length > 0,
            });
        }
    },

    likePost: async (postId) => {
        // Optimistic update
        set((state) => ({
            posts: state.posts.map((post) =>
                post.id === postId
                    ? { ...post, isLiked: true, likesCount: post.likesCount + 1 }
                    : post
            ),
        }));

        try {
            await apiFetch(API.like(postId), { method: 'POST' });
        } catch {
            // Revert on error
            set((state) => ({
                posts: state.posts.map((post) =>
                    post.id === postId
                        ? { ...post, isLiked: false, likesCount: post.likesCount - 1 }
                        : post
                ),
            }));
        }
    },

    unlikePost: async (postId) => {
        // Optimistic update
        set((state) => ({
            posts: state.posts.map((post) =>
                post.id === postId
                    ? { ...post, isLiked: false, likesCount: post.likesCount - 1 }
                    : post
            ),
        }));

        try {
            await apiFetch(API.like(postId), { method: 'DELETE' });
        } catch {
            // Revert on error
            set((state) => ({
                posts: state.posts.map((post) =>
                    post.id === postId
                        ? { ...post, isLiked: true, likesCount: post.likesCount + 1 }
                        : post
                ),
            }));
        }
    },

    savePost: async (postId) => {
        set((state) => ({
            posts: state.posts.map((post) =>
                post.id === postId ? { ...post, isSaved: true } : post
            ),
        }));
        try {
            await apiFetch(API.save(postId), { method: 'POST' });
        } catch {
            set((state) => ({
                posts: state.posts.map((post) =>
                    post.id === postId ? { ...post, isSaved: false } : post
                ),
            }));
        }
    },

    unsavePost: async (postId) => {
        set((state) => ({
            posts: state.posts.map((post) =>
                post.id === postId ? { ...post, isSaved: false } : post
            ),
        }));
        try {
            await apiFetch(API.save(postId), { method: 'DELETE' });
        } catch {
            set((state) => ({
                posts: state.posts.map((post) =>
                    post.id === postId ? { ...post, isSaved: true } : post
                ),
            }));
        }
    },

    movePost: async (postId, direction) => {
        const posts = get().posts;
        const currentIndex = posts.findIndex((p) => p.id === postId);
        if (currentIndex === -1) return;

        const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
        if (targetIndex < 0 || targetIndex >= posts.length) return;

        const current = posts[currentIndex];
        const neighbor = posts[targetIndex];

        // Optimistic swap
        set((state) => {
            const updated = [...state.posts];
            updated[currentIndex] = neighbor;
            updated[targetIndex] = current;
            return { posts: updated };
        });

        try {
            const totalPosts = posts.length;
            await apiFetch(API.reorder, {
                method: 'PUT',
                body: JSON.stringify({
                    posts: [
                        { id: current.id, sortOrder: totalPosts - targetIndex },
                        { id: neighbor.id, sortOrder: totalPosts - currentIndex },
                    ],
                }),
            });
        } catch {
            // Revert
            set((state) => {
                const reverted = [...state.posts];
                reverted[currentIndex] = current;
                reverted[targetIndex] = neighbor;
                return { posts: reverted };
            });
        }
    },

    deletePost: async (postId) => {
        const prevPosts = get().posts;
        // Optimistic removal
        set((state) => ({
            posts: state.posts.filter((p) => p.id !== postId),
        }));
        try {
            await apiFetch(API.post(postId), { method: 'DELETE' });
        } catch {
            // Revert on error
            set({ posts: prevPosts });
        }
    },

    reportPost: async (postId, reason = '') => {
        await apiFetch(API.report(postId), {
            method: 'POST',
            body: JSON.stringify({ reason }),
        });
    },

    addPost: (post) => {
        // Deduplicate: don't add if post already exists
        set((state) => {
            if (state.posts.some((p) => p.id === post.id)) return state;
            return { posts: [post, ...state.posts] };
        });
        // Invalidate cache: refresh feed in background to sync with server
        // Use getState() to avoid stale closure reference
        useFeedStore.getState().fetchFeed(true, undefined, undefined, true);
    },

    clear: () => set({ posts: [], nextCursor: null, hasMore: true, isShowingCachedData: false }),

    reset: () => set({ posts: [], nextCursor: null, hasMore: true, isLoading: false, isRefreshing: false, error: null, cacheTimestamp: 0, isShowingCachedData: false }),
}),
        {
            name: 'feed-storage',
            storage: zustandStorage,
            partialize: (state) => ({
                posts: state.posts.slice(0, 50), // Cache first 50 posts for faster startup
                cacheTimestamp: state.cacheTimestamp,
            }),
            onRehydrateStorage: () => (state) => {
                if (state) {
                    // Use a longer TTL (30 min) so offline users still see cached content
                    const CACHE_TTL = 30 * 60 * 1000; // 30 minutes
                    if (Date.now() - state.cacheTimestamp > CACHE_TTL) {
                        // Cache is stale, clear posts so fresh data is fetched
                        useFeedStore.setState({ posts: [], cacheTimestamp: 0, isShowingCachedData: false });
                    } else if (state.posts.length > 0) {
                        // Mark as cached data until a successful network fetch replaces it
                        useFeedStore.setState({ isShowingCachedData: true });
                    }
                }
            },
        }
    )
);

// ============================================
// Communities Store
// ============================================

interface CommunitiesState {
    communities: Community[];
    isLoading: boolean;
    isFetching: boolean;
    error: string | null;
    lastFetched: number;

    fetchCommunities: (force?: boolean) => Promise<void>;
    joinCommunity: (communityId: string) => Promise<void>;
    leaveCommunity: (communityId: string) => Promise<void>;
    createCommunity: (name: string, description: string, isPrivate: boolean) => Promise<Community>;
    reset: () => void;
}

const COMMUNITIES_CACHE_TTL = 2 * 60 * 1000; // 2 minutes

export const useCommunitiesStore = create<CommunitiesState>()(
    persist(
        (set, get) => ({
    communities: [],
    isLoading: false,
    isFetching: false,
    error: null,
    lastFetched: 0,

    fetchCommunities: async (force = false) => {
        if (get().isFetching) return;

        // TTL cache: skip fetch if data is fresh (unless forced)
        if (!force && get().communities.length > 0 &&
            Date.now() - get().lastFetched < COMMUNITIES_CACHE_TTL) {
            return;
        }

        set({ isFetching: true, isLoading: true, error: null });
        try {
            const data = await apiFetch<any>(API.communities);
            const raw = data.communities || data.data || data || [];
            const communities = Array.isArray(raw) ? raw : [];

            // Deduplicate by ID (server may return duplicates across pages)
            const seen = new Set<string>();
            const unique = communities.filter((c: Community) => {
                if (seen.has(c.id)) return false;
                seen.add(c.id);
                return true;
            });

            set({
                communities: unique,
                isLoading: false,
                lastFetched: Date.now(),
            });
        } catch (error: any) {
            set({
                error: error.message || 'Failed to load communities',
                isLoading: false,
            });
        } finally {
            set({ isFetching: false });
        }
    },

    joinCommunity: async (communityId) => {
        // Optimistic update — no refetch needed
        const prev = get().communities;
        set((state) => ({
            communities: state.communities.map((c) =>
                c.id === communityId
                    ? { ...c, role: 'member' as const, membersCount: c.membersCount + 1 }
                    : c
            ),
        }));
        try {
            await apiFetch(API.joinCommunity(communityId), { method: 'POST' });
        } catch (error: any) {
            // Revert on failure
            set({ communities: prev });
            devError('Failed to join community:', error);
        }
    },

    leaveCommunity: async (communityId) => {
        // Optimistic update — no refetch needed
        const prev = get().communities;
        set((state) => ({
            communities: state.communities.map((c) =>
                c.id === communityId
                    ? { ...c, role: null, membersCount: Math.max(0, c.membersCount - 1) }
                    : c
            ),
        }));
        try {
            await apiFetch(API.leaveCommunity(communityId), { method: 'POST' });
        } catch (error: any) {
            // Revert on failure
            set({ communities: prev });
            devError('Failed to leave community:', error);
        }
    },

    createCommunity: async (name, description, isPrivate) => {
        const data = await apiFetch<any>(API.communities, {
            method: 'POST',
            body: JSON.stringify({ name, description, isPublic: !isPrivate }),
        });
        const community = data.community || data;
        // Deduplicate: don't add if already exists (race with fetchCommunities)
        set((state) => {
            if (state.communities.some((c) => c.id === community.id)) return state;
            return { communities: [community, ...state.communities] };
        });
        return community;
    },

    reset: () => set({ communities: [], isLoading: false, isFetching: false, error: null, lastFetched: 0 }),
}),
        {
            name: 'communities-storage',
            storage: zustandStorage,
            partialize: (state) => ({
                communities: state.communities,
                lastFetched: state.lastFetched,
            }),
        }
    )
);

// ============================================
// Notifications Store
// ============================================

export interface Notification {
    id: string;
    type: string;
    actorId?: string;
    actorUsername?: string;
    actorAvatarUrl?: string;
    targetId?: string;
    postId?: string;
    message?: string;
    content?: string;
    isRead: boolean;
    createdAt: string;
}

interface NotificationsState {
    notifications: Notification[];
    unreadCount: number;
    isLoading: boolean;
    isFetching: boolean;
    error: string | null;

    fetchNotifications: () => Promise<void>;
    markAsRead: (notificationId: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    reset: () => void;
}

export const useNotificationsStore = create<NotificationsState>()(
    persist(
        (set, get) => ({
    notifications: [],
    unreadCount: 0,
    isLoading: false,
    isFetching: false,
    error: null as string | null,

    fetchNotifications: async () => {
        if (get().isFetching) return;
        set({ isFetching: true, isLoading: true, error: null });
        try {
            const data = await apiFetch<any>(API.notifications);
            const raw = data.notifications || data.data || [];
            const notifications = Array.isArray(raw) ? raw : [];

            // Deduplicate by ID — polling can return overlapping results
            const seen = new Set<string>();
            const unique = notifications.filter((n: Notification) => {
                if (seen.has(n.id)) return false;
                seen.add(n.id);
                return true;
            });

            const unreadCount = unique.filter((n: Notification) => !n.isRead).length;
            set({
                notifications: unique,
                unreadCount,
                isLoading: false,
            });
        } catch {
            set({ isLoading: false, error: 'Failed to load notifications' });
        } finally {
            set({ isFetching: false });
        }
    },

    markAsRead: async (notificationId) => {
        // Optimistic update
        const prev = get().notifications;
        set((state) => {
            const updated = state.notifications.map((n) =>
                n.id === notificationId ? { ...n, isRead: true } : n
            );
            return {
                notifications: updated,
                unreadCount: updated.filter((n) => !n.isRead).length,
            };
        });
        try {
            await apiFetch(API.notificationRead(notificationId), { method: 'PATCH' });
        } catch {
            // Revert on failure
            set({
                notifications: prev,
                unreadCount: prev.filter((n) => !n.isRead).length,
            });
        }
    },

    markAllAsRead: async () => {
        const prev = get().notifications;
        set((state) => ({
            notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
            unreadCount: 0,
        }));
        try {
            await apiFetch(API.notificationsReadAll, { method: 'POST' });
        } catch {
            // Revert on failure
            set({
                notifications: prev,
                unreadCount: prev.filter((n) => !n.isRead).length,
            });
        }
    },

    reset: () => set({ notifications: [], unreadCount: 0, isLoading: false, isFetching: false, error: null }),
}),
        {
            name: 'notifications-storage',
            storage: zustandStorage,
            partialize: (state) => ({
                notifications: state.notifications.slice(0, 50), // Persist only last 50
                unreadCount: state.unreadCount,
            }),
        }
    )
);

// ============================================
// Moments Store — caches story feed
// ============================================

export interface MomentUser {
    userId: string;
    displayName: string;
    avatarUrl?: string;
    isSeen?: boolean;
}

export interface Moment {
    id: string;
    mediaUrl: string;
    mediaType: 'IMAGE' | 'VIDEO';
    caption?: string;
    viewCount: number;
    createdAt: string;
    user: { id: string; displayName: string; avatarUrl?: string };
}

interface MomentsState {
    storyUsers: MomentUser[];
    momentsByUser: Record<string, Moment[]>;
    isLoading: boolean;
    lastFetched: number;
    error: string | null;
    fetchStoryFeed: () => Promise<void>;
    fetchUserMoments: (userId: string) => Promise<Moment[]>;
    addMomentUser: (user: MomentUser) => void;
    markSeen: (userId: string) => void;
    reset: () => void;
}

export const useMomentsStore = create<MomentsState>()(
    immer((set, get) => ({
    storyUsers: [],
    momentsByUser: {},
    isLoading: false,
    lastFetched: 0,
    error: null as string | null,

    fetchStoryFeed: async () => {
        // Skip if fetched within the last 30 seconds
        const state = useMomentsStore.getState();
        if (Date.now() - state.lastFetched < 30_000 && state.storyUsers.length > 0) return;

        set((draft) => { draft.isLoading = true; draft.error = null; });
        try {
            const data = await apiFetch<any>(API.momentsFeed);
            const list = data?.moments || data || [];
            if (Array.isArray(list)) {
                const seen = new Set<string>();
                const users: MomentUser[] = [];
                for (const moment of list) {
                    const uid = moment.user?.id || moment.userId;
                    if (uid && !seen.has(uid)) {
                        seen.add(uid);
                        users.push({
                            userId: uid,
                            displayName: moment.user?.displayName || 'Unknown',
                            avatarUrl: moment.user?.avatarUrl,
                            isSeen: moment.isSeen,
                        });
                    }
                }
                set((draft) => { draft.storyUsers = users; draft.lastFetched = Date.now(); });
            }
        } catch {
            set((draft) => { draft.error = 'Failed to load moments'; });
        } finally {
            set((draft) => { draft.isLoading = false; });
        }
    },

    fetchUserMoments: async (userId: string) => {
        try {
            const data = await apiFetch<any>(`${API.momentsFeed}?userId=${userId}`);
            const list = data?.moments || data || [];
            const moments = Array.isArray(list) ? list : [];
            set((draft) => {
                draft.momentsByUser[userId] = moments;
            });
            return moments;
        } catch {
            return [];
        }
    },

    addMomentUser: (user: MomentUser) => {
        set((draft) => {
            if (draft.storyUsers.some((u) => u.userId === user.userId)) return;
            draft.storyUsers.unshift(user);
        });
    },

    markSeen: (userId: string) => {
        set((draft) => {
            const user = draft.storyUsers.find((u) => u.userId === userId);
            if (user) user.isSeen = true;
        });
    },

    reset: () => set((draft) => {
        draft.storyUsers = [];
        draft.momentsByUser = {};
        draft.isLoading = false;
        draft.lastFetched = 0;
        draft.error = null;
    }),
})));

// ============================================
// Governance Store — caches proposals and votes
// ============================================

export interface Proposal {
    id: string;
    title: string;
    description: string;
    type: string;
    status: 'ACTIVE' | 'PASSED' | 'REJECTED' | 'EXPIRED';
    votesFor: number;
    votesAgainst: number;
    quorum: number;
    totalMembers: number;
    userVote?: 'FOR' | 'AGAINST' | null;
    expiresAt: string;
    createdAt: string;
    creator?: { displayName: string; username: string };
}

interface GovernanceState {
    proposalsByCommunity: Record<string, Proposal[]>;
    isLoading: boolean;
    error: string | null;
    fetchProposals: (communityId: string) => Promise<void>;
    voteOnProposal: (communityId: string, proposalId: string, vote: 'FOR' | 'AGAINST') => Promise<void>;
    updateProposalVotes: (proposalId: string, votesFor: number, votesAgainst: number) => void;
    reset: () => void;
}

export const useGovernanceStore = create<GovernanceState>()(
    immer((set, get) => ({
    proposalsByCommunity: {},
    isLoading: false,
    error: null as string | null,

    fetchProposals: async (communityId: string) => {
        set((draft) => { draft.isLoading = true; draft.error = null; });
        try {
            const data = await apiFetch<any>(API.proposals(communityId));
            const list = data.proposals || data || [];
            set((draft) => {
                draft.proposalsByCommunity[communityId] = Array.isArray(list) ? list : [];
                draft.isLoading = false;
            });
        } catch {
            set((draft) => { draft.isLoading = false; draft.error = 'Failed to load proposals'; });
        }
    },

    voteOnProposal: async (communityId: string, proposalId: string, vote: 'FOR' | 'AGAINST') => {
        // Optimistic update — immer makes nested mutation clean
        set((draft) => {
            const proposals = draft.proposalsByCommunity[communityId] || [];
            const proposal = proposals.find((p) => p.id === proposalId);
            if (proposal) {
                proposal.userVote = vote;
                if (vote === 'FOR') proposal.votesFor += 1;
                if (vote === 'AGAINST') proposal.votesAgainst += 1;
            }
        });

        try {
            await apiFetch(API.proposalVote(proposalId), {
                method: 'POST',
                body: JSON.stringify({ vote }),
            });
        } catch {
            // Revert — refetch from server
            useGovernanceStore.getState().fetchProposals(communityId);
        }
    },

    updateProposalVotes: (proposalId: string, votesFor: number, votesAgainst: number) => {
        set((draft) => {
            for (const proposals of Object.values(draft.proposalsByCommunity)) {
                const proposal = proposals.find((p) => p.id === proposalId);
                if (proposal) {
                    proposal.votesFor = votesFor;
                    proposal.votesAgainst = votesAgainst;
                }
            }
        });
    },

    reset: () => set((draft) => {
        draft.proposalsByCommunity = {};
        draft.isLoading = false;
        draft.error = null;
    }),
})));

// ============================================
// Game Store
// ============================================

interface GamePlayerData {
    id: string;
    userId?: string;
    name: string;
    avatarUrl?: string;
    score: number;
    isHost: boolean;
    isConnected: boolean;
}

interface GameStoreState {
    gameCode: string | null;
    gameType: string | null;
    status: 'idle' | 'lobby' | 'playing' | 'round_end' | 'finished';
    players: GamePlayerData[];
    round: number;
    totalRounds: number;
    gameData: Record<string, any>;
    isHost: boolean;
    myPlayerId: string | null;
    error: string | null;

    // Actions
    createGame: (type: string, settings?: Record<string, any>) => Promise<string | null>;
    joinGame: (code: string, playerName?: string) => Promise<boolean>;
    startGame: () => Promise<boolean>;
    sendAction: (action: string, payload: any) => void;
    leaveGame: () => void;
    updateFromState: (state: any) => void;
    updateFromDelta: (delta: any) => void;
    setRoundEnd: (data: any) => void;
    setGameEnded: (data: any) => void;
    addPlayer: (data: any) => void;
    removePlayer: (playerId: string) => void;
    reset: () => void;
    setError: (error: string | null) => void;
}

export const useGameStore = create<GameStoreState>()((set, get) => ({
    gameCode: null,
    gameType: null,
    status: 'idle',
    players: [],
    round: 0,
    totalRounds: 0,
    gameData: {},
    isHost: false,
    myPlayerId: null,
    error: null,

    createGame: async (type, settings) => {
        try {
            const result = await socketManager.createGame(type, settings);
            if (result.success && result.code) {
                set({
                    gameCode: result.code,
                    gameType: type,
                    status: 'lobby',
                    isHost: true,
                    players: result.state?.players || [],
                    gameData: result.state?.gameData || {},
                    myPlayerId: result.state?.players?.[0]?.id || null,
                    error: null,
                });
                return result.code;
            }
            set({ error: result.error || 'Failed to create game' });
            return null;
        } catch {
            set({ error: 'Failed to create game' });
            return null;
        }
    },

    joinGame: async (code, playerName) => {
        try {
            const result = await socketManager.joinGame(code, playerName);
            if (result.success && result.state) {
                set({
                    gameCode: code.toUpperCase(),
                    gameType: result.state.type,
                    status: result.state.status || 'lobby',
                    players: result.state.players || [],
                    round: result.state.round || 0,
                    totalRounds: result.state.totalRounds || 0,
                    gameData: result.state.gameData || {},
                    isHost: false,
                    error: null,
                });
                return true;
            }
            set({ error: result.error || 'Failed to join game' });
            return false;
        } catch {
            set({ error: 'Failed to join game' });
            return false;
        }
    },

    startGame: async () => {
        const { gameCode } = get();
        if (!gameCode) return false;
        try {
            const result = await socketManager.startGame(gameCode);
            if (result.success) {
                set({ status: 'playing' });
                return true;
            }
            set({ error: result.error || 'Failed to start game' });
            return false;
        } catch {
            return false;
        }
    },

    sendAction: (action, payload) => {
        const { gameCode } = get();
        if (gameCode) {
            socketManager.sendGameAction(gameCode, action, payload);
        }
    },

    leaveGame: () => {
        const { gameCode } = get();
        if (gameCode) {
            socketManager.leaveGame(gameCode);
        }
        get().reset();
    },

    updateFromState: (incoming) => {
        // Use set() updater to avoid stale get() reads from rapid socket events
        set((prev) => ({
            status: incoming.status || prev.status,
            players: incoming.players || prev.players,
            round: incoming.round ?? prev.round,
            totalRounds: incoming.totalRounds ?? prev.totalRounds,
            gameData: incoming.gameData || prev.gameData,
        }));
    },

    updateFromDelta: (delta) => {
        set((prev) => ({
            players: delta.players || prev.players,
            round: delta.round ?? prev.round,
            gameData: { ...prev.gameData, ...delta.gameData },
        }));
    },

    setRoundEnd: (data) => {
        set((prev) => ({
            status: 'round_end' as const,
            players: data.players || prev.players,
        }));
    },

    setGameEnded: (data) => {
        set((prev) => ({
            status: 'finished' as const,
            players: data.finalScores?.map((s: any) => ({
                ...prev.players.find(p => p.id === s.id),
                score: s.score,
                name: s.name,
            })) || prev.players,
        }));
    },

    addPlayer: (data) => {
        set((prev) => ({
            players: [...prev.players.filter(p => p.id !== data.player.id), data.player],
        }));
    },

    removePlayer: (playerId) => {
        set((prev) => ({
            players: prev.players.map(p => p.id === playerId ? { ...p, isConnected: false } : p),
        }));
    },

    reset: () => {
        set({
            gameCode: null,
            gameType: null,
            status: 'idle',
            players: [],
            round: 0,
            totalRounds: 0,
            gameData: {},
            isHost: false,
            myPlayerId: null,
            error: null,
        });
    },

    setError: (error) => set({ error }),
}));

// ============================================
// Memoized Selectors
// Stable references prevent unnecessary re-renders
// Usage: const posts = useFeedPosts();
// ============================================

/** Feed posts — only re-renders when the posts array identity changes */
export const useFeedPosts = () => useFeedStore((s) => s.posts);

/** Feed loading states — grouped to avoid multiple subscriptions */
export const useFeedStatus = () =>
    useFeedStore(
        (s) => ({ isLoading: s.isLoading, isRefreshing: s.isRefreshing, hasMore: s.hasMore, error: s.error, isShowingCachedData: s.isShowingCachedData }),
        shallow
    );

/** Feed actions — stable references (functions never change identity in zustand) */
export const useFeedActions = () =>
    useFeedStore(
        (s) => ({
            fetchFeed: s.fetchFeed,
            likePost: s.likePost,
            unlikePost: s.unlikePost,
            savePost: s.savePost,
            unsavePost: s.unsavePost,
            movePost: s.movePost,
            deletePost: s.deletePost,
        }),
        shallow
    );

/** Auth user — only re-renders when user object changes */
export const useCurrentUser = () => useAuthStore((s) => s.user);

/** Auth status — grouped */
export const useAuthStatus = () =>
    useAuthStore(
        (s) => ({ isAuthenticated: s.isAuthenticated, isInitialized: s.isInitialized, isLoading: s.isLoading }),
        shallow
    );

/** Unread notification count — cheap subscription for badge display */
export const useUnreadCount = () => useNotificationsStore((s) => s.unreadCount);

/** Community list */
export const useCommunityList = () => useCommunitiesStore((s) => s.communities);
