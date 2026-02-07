import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// User types
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
}

interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;

    // Actions
    setUser: (user: User) => void;
    setToken: (token: string) => void;
    login: (email: string, password: string) => Promise<void>;
    signup: (email: string, password: string, username: string) => Promise<void>;
    logout: () => void;
    updateProfile: (updates: Partial<User>) => void;
    clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,

            setUser: (user) => set({ user, isAuthenticated: true }),

            setToken: (token) => set({ token }),

            login: async (email, password) => {
                set({ isLoading: true, error: null });
                try {
                    // Simulate API call
                    await new Promise((resolve) => setTimeout(resolve, 1500));

                    // Mock successful login
                    const mockUser: User = {
                        id: 'user-1',
                        username: 'creative_mind',
                        displayName: 'Alex Johnson',
                        email,
                        avatarUrl: 'https://i.pravatar.cc/300?img=68',
                        coverUrl: 'https://picsum.photos/800/400?random=999',
                        bio: 'Digital creator & storyteller ✨',
                        followersCount: 24300,
                        followingCount: 892,
                        postsCount: 156,
                        isVerified: true,
                        isPrivate: false,
                        createdAt: new Date().toISOString(),
                    };

                    set({
                        user: mockUser,
                        token: 'mock-jwt-token',
                        isAuthenticated: true,
                        isLoading: false,
                    });
                } catch (error) {
                    set({
                        error: 'Login failed. Please try again.',
                        isLoading: false,
                    });
                    throw error;
                }
            },

            signup: async (email, password, username) => {
                set({ isLoading: true, error: null });
                try {
                    // Simulate API call
                    await new Promise((resolve) => setTimeout(resolve, 2000));

                    const newUser: User = {
                        id: `user-${Date.now()}`,
                        username,
                        displayName: username,
                        email,
                        followersCount: 0,
                        followingCount: 0,
                        postsCount: 0,
                        isVerified: false,
                        isPrivate: false,
                        createdAt: new Date().toISOString(),
                    };

                    set({
                        user: newUser,
                        token: 'mock-jwt-token',
                        isAuthenticated: true,
                        isLoading: false,
                    });
                } catch (error) {
                    set({
                        error: 'Signup failed. Please try again.',
                        isLoading: false,
                    });
                    throw error;
                }
            },

            logout: () => {
                set({
                    user: null,
                    token: null,
                    isAuthenticated: false,
                    error: null,
                });
            },

            updateProfile: (updates) => {
                const currentUser = get().user;
                if (currentUser) {
                    set({ user: { ...currentUser, ...updates } });
                }
            },

            clearError: () => set({ error: null }),
        }),
        {
            name: 'zerog-auth',
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({
                user: state.user,
                token: state.token,
                isAuthenticated: state.isAuthenticated,
            }),
        }
    )
);

// Feed types
export interface Post {
    id: string;
    user: {
        id: string;
        username: string;
        displayName: string;
        avatarUrl?: string;
        isVerified: boolean;
    };
    type: 'video' | 'image' | 'text';
    mediaUrl?: string;
    thumbnailUrl?: string;
    caption: string;
    likesCount: number;
    commentsCount: number;
    sharesCount: number;
    isLiked: boolean;
    isSaved: boolean;
    createdAt: string;
}

interface FeedState {
    posts: Post[];
    isLoading: boolean;
    isRefreshing: boolean;
    hasMore: boolean;
    error: string | null;

    // Actions
    setPosts: (posts: Post[]) => void;
    addPosts: (posts: Post[]) => void;
    likePost: (postId: string) => void;
    unlikePost: (postId: string) => void;
    savePost: (postId: string) => void;
    unsavePost: (postId: string) => void;
    fetchFeed: (refresh?: boolean) => Promise<void>;
}

export const useFeedStore = create<FeedState>((set, get) => ({
    posts: [],
    isLoading: false,
    isRefreshing: false,
    hasMore: true,
    error: null,

    setPosts: (posts) => set({ posts }),

    addPosts: (newPosts) => set((state) => ({
        posts: [...state.posts, ...newPosts],
    })),

    likePost: (postId) => set((state) => ({
        posts: state.posts.map((post) =>
            post.id === postId
                ? { ...post, isLiked: true, likesCount: post.likesCount + 1 }
                : post
        ),
    })),

    unlikePost: (postId) => set((state) => ({
        posts: state.posts.map((post) =>
            post.id === postId
                ? { ...post, isLiked: false, likesCount: post.likesCount - 1 }
                : post
        ),
    })),

    savePost: (postId) => set((state) => ({
        posts: state.posts.map((post) =>
            post.id === postId ? { ...post, isSaved: true } : post
        ),
    })),

    unsavePost: (postId) => set((state) => ({
        posts: state.posts.map((post) =>
            post.id === postId ? { ...post, isSaved: false } : post
        ),
    })),

    fetchFeed: async (refresh = false) => {
        if (refresh) {
            set({ isRefreshing: true });
        } else {
            set({ isLoading: true });
        }

        try {
            // Simulate API call
            await new Promise((resolve) => setTimeout(resolve, 1000));

            const mockPosts: Post[] = Array.from({ length: 10 }, (_, i) => ({
                id: `post-${Date.now()}-${i}`,
                user: {
                    id: `user-${i}`,
                    username: `user_${i}`,
                    displayName: `User ${i}`,
                    avatarUrl: `https://i.pravatar.cc/150?img=${i + 1}`,
                    isVerified: i % 3 === 0,
                },
                type: i % 2 === 0 ? 'video' : 'image',
                mediaUrl: `https://picsum.photos/400/600?random=${i}`,
                thumbnailUrl: `https://picsum.photos/400/600?random=${i}`,
                caption: `This is caption for post ${i} #trending #zerog`,
                likesCount: Math.floor(Math.random() * 10000),
                commentsCount: Math.floor(Math.random() * 500),
                sharesCount: Math.floor(Math.random() * 100),
                isLiked: false,
                isSaved: false,
                createdAt: new Date().toISOString(),
            }));

            if (refresh) {
                set({ posts: mockPosts, isRefreshing: false });
            } else {
                set((state) => ({
                    posts: [...state.posts, ...mockPosts],
                    isLoading: false,
                }));
            }
        } catch (error) {
            set({
                error: 'Failed to load feed',
                isLoading: false,
                isRefreshing: false,
            });
        }
    },
}));

// Community types
export interface Community {
    id: string;
    name: string;
    description: string;
    avatarUrl?: string;
    coverUrl?: string;
    membersCount: number;
    postsCount: number;
    isPublic: boolean;
    role: 'member' | 'admin' | 'moderator' | null;
    createdAt: string;
}

interface CommunitiesState {
    communities: Community[];
    joinedCommunities: Community[];
    isLoading: boolean;

    // Actions
    joinCommunity: (communityId: string) => void;
    leaveCommunity: (communityId: string) => void;
    fetchCommunities: () => Promise<void>;
}

export const useCommunitiesStore = create<CommunitiesState>((set, get) => ({
    communities: [],
    joinedCommunities: [],
    isLoading: false,

    joinCommunity: (communityId) => set((state) => {
        const community = state.communities.find((c) => c.id === communityId);
        if (community) {
            return {
                joinedCommunities: [...state.joinedCommunities, { ...community, role: 'member' as const }],
            };
        }
        return state;
    }),

    leaveCommunity: (communityId) => set((state) => ({
        joinedCommunities: state.joinedCommunities.filter((c) => c.id !== communityId),
    })),

    fetchCommunities: async () => {
        set({ isLoading: true });

        try {
            // Simulate API call
            await new Promise((resolve) => setTimeout(resolve, 1000));

            const mockCommunities: Community[] = [
                {
                    id: 'c1',
                    name: 'Photography Enthusiasts',
                    description: 'Share your best shots',
                    avatarUrl: 'https://picsum.photos/200?random=100',
                    coverUrl: 'https://picsum.photos/800/400?random=100',
                    membersCount: 45200,
                    postsCount: 12400,
                    isPublic: true,
                    role: null,
                    createdAt: new Date().toISOString(),
                },
            ];

            set({ communities: mockCommunities, isLoading: false });
        } catch (error) {
            set({ isLoading: false });
        }
    },
}));

// Notifications store
export interface Notification {
    id: string;
    type: 'like' | 'comment' | 'follow' | 'mention' | 'community';
    actorId: string;
    actorUsername: string;
    actorAvatarUrl?: string;
    targetId?: string;
    message: string;
    isRead: boolean;
    createdAt: string;
}

interface NotificationsState {
    notifications: Notification[];
    unreadCount: number;
    isLoading: boolean;

    // Actions
    markAsRead: (notificationId: string) => void;
    markAllAsRead: () => void;
    fetchNotifications: () => Promise<void>;
}

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
    notifications: [],
    unreadCount: 0,
    isLoading: false,

    markAsRead: (notificationId) => set((state) => {
        const updated = state.notifications.map((n) =>
            n.id === notificationId ? { ...n, isRead: true } : n
        );
        return {
            notifications: updated,
            unreadCount: updated.filter((n) => !n.isRead).length,
        };
    }),

    markAllAsRead: () => set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
        unreadCount: 0,
    })),

    fetchNotifications: async () => {
        set({ isLoading: true });

        try {
            await new Promise((resolve) => setTimeout(resolve, 800));

            const mockNotifications: Notification[] = Array.from({ length: 15 }, (_, i) => ({
                id: `notif-${i}`,
                type: ['like', 'comment', 'follow', 'mention', 'community'][i % 5] as Notification['type'],
                actorId: `user-${i}`,
                actorUsername: `user_${i}`,
                actorAvatarUrl: `https://i.pravatar.cc/150?img=${i + 30}`,
                message: `User ${i} interacted with your content`,
                isRead: i > 5,
                createdAt: new Date(Date.now() - i * 3600000).toISOString(),
            }));

            set({
                notifications: mockNotifications,
                unreadCount: mockNotifications.filter((n) => !n.isRead).length,
                isLoading: false,
            });
        } catch (error) {
            set({ isLoading: false });
        }
    },
}));
