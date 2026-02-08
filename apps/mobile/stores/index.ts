// ============================================
// Caravan Mobile — Zustand Stores
// All stores connected to real backend API
// ============================================

import { create } from 'zustand';
import { apiFetch, apiUpload, saveToken, removeToken, getToken, API } from '../lib/api';

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
    mediaType?: string;
    mediaCropY?: number;
    mediaAspectRatio?: string;
    sortOrder?: number;
    author: PostAuthor;
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
    role: 'member' | 'admin' | 'moderator' | null;
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
    error: string | null;

    initialize: () => Promise<void>;
    login: (email: string, password: string) => Promise<void>;
    signup: (email: string, password: string, displayName: string) => Promise<void>;
    logout: () => Promise<void>;
    updateUser: (updates: Partial<User>) => void;
    refreshUser: () => Promise<void>;
    clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    isInitialized: false,
    error: null,

    initialize: async () => {
        try {
            const token = await getToken();
            if (!token) {
                set({ isInitialized: true, isAuthenticated: false });
                return;
            }

            const data = await apiFetch<any>(API.me);
            if (data.user || data.id) {
                const user = data.user || data;
                set({
                    user,
                    isAuthenticated: true,
                    isInitialized: true,
                });
            } else {
                await removeToken();
                set({ isInitialized: true, isAuthenticated: false });
            }
        } catch (error) {
            await removeToken();
            set({ isInitialized: true, isAuthenticated: false });
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

            const user = data.user || data;
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
            const data = await apiFetch<any>(API.signup, {
                method: 'POST',
                body: JSON.stringify({ email, password, displayName }),
            });

            if (data.token) {
                await saveToken(data.token);
            }

            const user = data.user || data;
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

    logout: async () => {
        await removeToken();
        set({
            user: null,
            isAuthenticated: false,
            error: null,
        });
    },

    updateUser: (updates) => {
        const currentUser = get().user;
        if (currentUser) {
            set({ user: { ...currentUser, ...updates } });
        }
    },

    refreshUser: async () => {
        try {
            const data = await apiFetch<any>(API.me);
            const user = data.user || data;
            set({ user });
        } catch (error) {
            // Silently fail — user might be offline
        }
    },

    clearError: () => set({ error: null }),
}));

// ============================================
// Feed Store
// ============================================

interface FeedState {
    posts: Post[];
    isLoading: boolean;
    isRefreshing: boolean;
    hasMore: boolean;
    page: number;
    error: string | null;

    fetchFeed: (refresh?: boolean) => Promise<void>;
    likePost: (postId: string) => Promise<void>;
    unlikePost: (postId: string) => Promise<void>;
    movePost: (postId: string, direction: 'up' | 'down') => Promise<void>;
    addPost: (post: Post) => void;
    clear: () => void;
}

export const useFeedStore = create<FeedState>((set, get) => ({
    posts: [],
    isLoading: false,
    isRefreshing: false,
    hasMore: true,
    page: 1,
    error: null,

    fetchFeed: async (refresh = false) => {
        const state = get();
        if (state.isLoading && !refresh) return;

        if (refresh) {
            set({ isRefreshing: true, page: 1 });
        } else {
            set({ isLoading: true });
        }

        try {
            const page = refresh ? 1 : state.page;
            const data = await apiFetch<any>(
                `${API.feed}?type=foryou&feedView=private&page=${page}&limit=20`
            );

            const posts = data.posts || data.data || [];

            if (refresh) {
                set({
                    posts,
                    isRefreshing: false,
                    isLoading: false,
                    hasMore: posts.length >= 20,
                    page: 2,
                });
            } else {
                set((prev) => ({
                    posts: [...prev.posts, ...posts],
                    isLoading: false,
                    hasMore: posts.length >= 20,
                    page: prev.page + 1,
                }));
            }
        } catch (error: any) {
            set({
                error: error.message || 'Failed to load feed',
                isLoading: false,
                isRefreshing: false,
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

    addPost: (post) => {
        set((state) => ({ posts: [post, ...state.posts] }));
    },

    clear: () => set({ posts: [], page: 1, hasMore: true }),
}));

// ============================================
// Communities Store
// ============================================

interface CommunitiesState {
    communities: Community[];
    isLoading: boolean;
    error: string | null;

    fetchCommunities: () => Promise<void>;
    joinCommunity: (communityId: string) => Promise<void>;
    leaveCommunity: (communityId: string) => Promise<void>;
}

export const useCommunitiesStore = create<CommunitiesState>((set) => ({
    communities: [],
    isLoading: false,
    error: null,

    fetchCommunities: async () => {
        set({ isLoading: true, error: null });
        try {
            const data = await apiFetch<any>(API.communities);
            const communities = data.communities || data.data || data || [];
            set({
                communities: Array.isArray(communities) ? communities : [],
                isLoading: false,
            });
        } catch (error: any) {
            set({
                error: error.message || 'Failed to load communities',
                isLoading: false,
            });
        }
    },

    joinCommunity: async (communityId) => {
        try {
            await apiFetch(API.joinCommunity(communityId), { method: 'POST' });
            set((state) => ({
                communities: state.communities.map((c) =>
                    c.id === communityId ? { ...c, role: 'member' as const } : c
                ),
            }));
        } catch (error: any) {
            console.error('Failed to join community:', error);
        }
    },

    leaveCommunity: async (communityId) => {
        try {
            await apiFetch(API.leaveCommunity(communityId), { method: 'POST' });
            set((state) => ({
                communities: state.communities.map((c) =>
                    c.id === communityId ? { ...c, role: null } : c
                ),
            }));
        } catch (error: any) {
            console.error('Failed to leave community:', error);
        }
    },
}));

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

    fetchNotifications: () => Promise<void>;
    markAsRead: (notificationId: string) => void;
    markAllAsRead: () => void;
}

export const useNotificationsStore = create<NotificationsState>((set) => ({
    notifications: [],
    unreadCount: 0,
    isLoading: false,

    fetchNotifications: async () => {
        set({ isLoading: true });
        try {
            const data = await apiFetch<any>(API.notifications);
            const notifications = data.notifications || data.data || [];
            set({
                notifications: Array.isArray(notifications) ? notifications : [],
                unreadCount: Array.isArray(notifications)
                    ? notifications.filter((n: Notification) => !n.isRead).length
                    : 0,
                isLoading: false,
            });
        } catch {
            set({ isLoading: false });
        }
    },

    markAsRead: (notificationId) =>
        set((state) => {
            const updated = state.notifications.map((n) =>
                n.id === notificationId ? { ...n, isRead: true } : n
            );
            return {
                notifications: updated,
                unreadCount: updated.filter((n) => !n.isRead).length,
            };
        }),

    markAllAsRead: () =>
        set((state) => ({
            notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
            unreadCount: 0,
        })),
}));
