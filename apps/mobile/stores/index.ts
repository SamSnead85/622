// ============================================
// 0G Mobile — Zustand Stores
// All stores connected to real backend API
// ============================================

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch, apiUpload, saveToken, removeToken, getToken, API } from '../lib/api';

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
    appleLogin: (identityToken: string, fullName?: { givenName?: string; familyName?: string } | null) => Promise<void>;
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
                const rawUser = data.user || data;
                // Normalize user object with safe defaults
                const user: User = {
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
            // Don't clear token on network errors — user might be offline
            const isNetwork = error instanceof TypeError ||
                (error instanceof Error && error.message.toLowerCase().includes('network'));
            if (!isNetwork) {
                await removeToken();
            }
            set({ isInitialized: true, isAuthenticated: isNetwork ? false : false });
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

            const user = data.user || data;
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
            const rawUser = data.user || data;
            if (rawUser?.id) {
                const currentUser = get().user;
                // Merge with current user to preserve local state
                set({
                    user: {
                        ...currentUser,
                        ...rawUser,
                        followersCount: rawUser.followersCount ?? rawUser._count?.followers ?? currentUser?.followersCount ?? 0,
                        followingCount: rawUser.followingCount ?? rawUser._count?.following ?? currentUser?.followingCount ?? 0,
                        postsCount: rawUser.postsCount ?? rawUser._count?.posts ?? currentUser?.postsCount ?? 0,
                    } as User,
                });
            }
        } catch (error) {
            // Silently fail — user might be offline
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
// Feed Store
// ============================================

interface FeedState {
    posts: Post[];
    isLoading: boolean;
    isRefreshing: boolean;
    hasMore: boolean;
    nextCursor: string | null;
    error: string | null;

    fetchFeed: (refresh?: boolean, feedType?: 'foryou' | 'following', feedView?: 'private' | 'community') => Promise<void>;
    likePost: (postId: string) => Promise<void>;
    unlikePost: (postId: string) => Promise<void>;
    savePost: (postId: string) => Promise<void>;
    unsavePost: (postId: string) => Promise<void>;
    movePost: (postId: string, direction: 'up' | 'down') => Promise<void>;
    deletePost: (postId: string) => Promise<void>;
    reportPost: (postId: string, reason?: string) => Promise<void>;
    addPost: (post: Post) => void;
    clear: () => void;
}

// Map server post shape to mobile Post interface
export function mapApiPost(raw: any): Post {
    return {
        id: raw.id,
        content: raw.caption || raw.content || '',
        mediaUrl: raw.mediaUrl,
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

export const useFeedStore = create<FeedState>()(
    persist(
        (set, get) => ({
    posts: [],
    isLoading: false,
    isRefreshing: false,
    hasMore: true,
    nextCursor: null,
    error: null,

    fetchFeed: async (refresh = false, feedType: 'foryou' | 'following' = 'foryou', feedView: 'private' | 'community' = 'private') => {
        const state = get();
        // Prevent concurrent fetches — block if already loading OR refreshing
        if (state.isLoading || state.isRefreshing) {
            if (!refresh) return; // Allow refresh to override, but not load-more
        }

        if (refresh) {
            // SWR: keep existing posts visible while refreshing (no blank screen)
            // Only show isLoading spinner if we have NO cached posts
            set({
                isRefreshing: true,
                isLoading: state.posts.length === 0,
                nextCursor: null,
            });
        } else {
            set({ isLoading: true });
        }

        try {
            const cursor = refresh ? '' : state.nextCursor;
            const cursorParam = cursor ? `&cursor=${cursor}` : '';
            const data = await apiFetch<any>(
                `${API.feed}?type=${feedType}&feedView=${feedView}&limit=20${cursorParam}`
            );

            const rawPosts = data.posts || data.data || [];
            const posts = rawPosts.map(mapApiPost);
            const newCursor = data.nextCursor || null;

            if (refresh) {
                set({
                    posts,
                    isRefreshing: false,
                    isLoading: false,
                    hasMore: !!newCursor,
                    nextCursor: newCursor,
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
            // SWR: on error, keep existing cached posts visible
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
        set((state) => ({ posts: [post, ...state.posts] }));
    },

    clear: () => set({ posts: [], nextCursor: null, hasMore: true }),
}),
        {
            name: 'feed-storage',
            storage: zustandStorage,
            partialize: (state) => ({
                posts: state.posts.slice(0, 20), // Only cache first 20 posts
            }),
        }
    )
);

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
    createCommunity: (name: string, description: string, isPrivate: boolean) => Promise<Community>;
}

export const useCommunitiesStore = create<CommunitiesState>()(
    persist(
        (set) => ({
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

    createCommunity: async (name, description, isPrivate) => {
        const data = await apiFetch<any>(API.communities, {
            method: 'POST',
            body: JSON.stringify({ name, description, isPublic: !isPrivate }),
        });
        const community = data.community || data;
        set((state) => ({
            communities: [community, ...state.communities],
        }));
        return community;
    },
}),
        {
            name: 'communities-storage',
            storage: zustandStorage,
            partialize: (state) => ({
                communities: state.communities,
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

    fetchNotifications: () => Promise<void>;
    markAsRead: (notificationId: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
}

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
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
}));

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
    fetchStoryFeed: () => Promise<void>;
    fetchUserMoments: (userId: string) => Promise<Moment[]>;
    addMomentUser: (user: MomentUser) => void;
    markSeen: (userId: string) => void;
}

export const useMomentsStore = create<MomentsState>()((set, get) => ({
    storyUsers: [],
    momentsByUser: {},
    isLoading: false,
    lastFetched: 0,

    fetchStoryFeed: async () => {
        // Skip if fetched within the last 30 seconds
        if (Date.now() - get().lastFetched < 30_000 && get().storyUsers.length > 0) return;

        set({ isLoading: true });
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
                set({ storyUsers: users, lastFetched: Date.now() });
            }
        } catch {
            // silent
        } finally {
            set({ isLoading: false });
        }
    },

    fetchUserMoments: async (userId: string) => {
        try {
            const data = await apiFetch<any>(`${API.momentsFeed}?userId=${userId}`);
            const list = data?.moments || data || [];
            const moments = Array.isArray(list) ? list : [];
            set((state) => ({
                momentsByUser: { ...state.momentsByUser, [userId]: moments },
            }));
            return moments;
        } catch {
            return [];
        }
    },

    addMomentUser: (user: MomentUser) => {
        set((state) => {
            if (state.storyUsers.some((u) => u.userId === user.userId)) return state;
            return { storyUsers: [user, ...state.storyUsers] };
        });
    },

    markSeen: (userId: string) => {
        set((state) => ({
            storyUsers: state.storyUsers.map((u) =>
                u.userId === userId ? { ...u, isSeen: true } : u
            ),
        }));
    },
}));

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
    fetchProposals: (communityId: string) => Promise<void>;
    voteOnProposal: (communityId: string, proposalId: string, vote: 'FOR' | 'AGAINST') => Promise<void>;
    updateProposalVotes: (proposalId: string, votesFor: number, votesAgainst: number) => void;
}

export const useGovernanceStore = create<GovernanceState>()((set, get) => ({
    proposalsByCommunity: {},
    isLoading: false,

    fetchProposals: async (communityId: string) => {
        set({ isLoading: true });
        try {
            const data = await apiFetch<any>(API.proposals(communityId));
            const list = data.proposals || data || [];
            set((state) => ({
                proposalsByCommunity: {
                    ...state.proposalsByCommunity,
                    [communityId]: Array.isArray(list) ? list : [],
                },
                isLoading: false,
            }));
        } catch {
            set({ isLoading: false });
        }
    },

    voteOnProposal: async (communityId: string, proposalId: string, vote: 'FOR' | 'AGAINST') => {
        // Optimistic update
        set((state) => {
            const proposals = state.proposalsByCommunity[communityId] || [];
            return {
                proposalsByCommunity: {
                    ...state.proposalsByCommunity,
                    [communityId]: proposals.map((p) =>
                        p.id === proposalId
                            ? {
                                ...p,
                                userVote: vote,
                                votesFor: vote === 'FOR' ? p.votesFor + 1 : p.votesFor,
                                votesAgainst: vote === 'AGAINST' ? p.votesAgainst + 1 : p.votesAgainst,
                            }
                            : p
                    ),
                },
            };
        });

        try {
            await apiFetch(API.proposalVote(proposalId), {
                method: 'POST',
                body: JSON.stringify({ vote }),
            });
        } catch {
            // Revert — refetch
            get().fetchProposals(communityId);
        }
    },

    updateProposalVotes: (proposalId: string, votesFor: number, votesAgainst: number) => {
        set((state) => {
            const updated: Record<string, Proposal[]> = {};
            for (const [cid, proposals] of Object.entries(state.proposalsByCommunity)) {
                updated[cid] = proposals.map((p) =>
                    p.id === proposalId ? { ...p, votesFor, votesAgainst } : p
                );
            }
            return { proposalsByCommunity: updated };
        });
    },
}));
