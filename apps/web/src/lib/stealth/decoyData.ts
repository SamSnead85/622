/**
 * DECOY DATA FOR TRAVEL SHIELD
 * 
 * Pre-built fake content that replaces real data when stealth mode is active.
 * Designed to look completely normal and boring to anyone inspecting the device.
 * All images use public Unsplash URLs that load without authentication.
 */

export const DECOY_USER = {
    id: 'decoy-user-00',
    email: 'jamie.r@email.com',
    username: 'jamie_r',
    displayName: 'Jamie R.',
    avatarUrl: 'https://images.unsplash.com/photo-1535930749574-1399327ce78f?w=200&h=200&fit=crop&crop=face',
    coverUrl: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200&h=400&fit=crop',
    bio: 'Cat lover. Coffee enthusiast. Weekend gardener.',
    isVerified: false,
    createdAt: '2025-06-15T10:00:00Z',
    role: 'USER' as const,
    postsCount: 12,
    followersCount: 34,
    followingCount: 28,
};

export const DECOY_POSTS = [
    {
        id: 'decoy-post-1',
        type: 'IMAGE',
        content: 'Mr. Whiskers being dramatic again 😂',
        mediaUrl: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=800&h=600&fit=crop',
        mediaType: 'IMAGE',
        likes: 8,
        isLiked: false,
        commentsCount: 2,
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        author: {
            id: 'decoy-user-00',
            username: 'jamie_r',
            displayName: 'Jamie R.',
            avatarUrl: 'https://images.unsplash.com/photo-1535930749574-1399327ce78f?w=200&h=200&fit=crop&crop=face',
        },
    },
    {
        id: 'decoy-post-2',
        type: 'IMAGE',
        content: 'Sunday baking 🍪 tried a new chocolate chip recipe!',
        mediaUrl: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=800&h=600&fit=crop',
        mediaType: 'IMAGE',
        likes: 15,
        isLiked: true,
        commentsCount: 4,
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        author: {
            id: 'decoy-user-00',
            username: 'jamie_r',
            displayName: 'Jamie R.',
            avatarUrl: 'https://images.unsplash.com/photo-1535930749574-1399327ce78f?w=200&h=200&fit=crop&crop=face',
        },
    },
    {
        id: 'decoy-post-3',
        type: 'IMAGE',
        content: 'Beautiful sunset from the garden today',
        mediaUrl: 'https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?w=800&h=600&fit=crop',
        mediaType: 'IMAGE',
        likes: 22,
        isLiked: false,
        commentsCount: 3,
        createdAt: new Date(Date.now() - 172800000).toISOString(),
        author: {
            id: 'decoy-friend-1',
            username: 'sarah_k',
            displayName: 'Sarah K.',
            avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face',
        },
    },
    {
        id: 'decoy-post-4',
        type: 'TEXT',
        content: 'Just finished reading "The Thursday Murder Club" by Richard Osman. Highly recommend for anyone who loves cozy mysteries! 📚',
        likes: 6,
        isLiked: false,
        commentsCount: 1,
        createdAt: new Date(Date.now() - 259200000).toISOString(),
        author: {
            id: 'decoy-friend-2',
            username: 'mom_linda',
            displayName: 'Mom',
            avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&h=200&fit=crop&crop=face',
        },
    },
    {
        id: 'decoy-post-5',
        type: 'IMAGE',
        content: 'New succulent addition to the family 🌵',
        mediaUrl: 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=800&h=600&fit=crop',
        mediaType: 'IMAGE',
        likes: 11,
        isLiked: true,
        commentsCount: 2,
        createdAt: new Date(Date.now() - 345600000).toISOString(),
        author: {
            id: 'decoy-user-00',
            username: 'jamie_r',
            displayName: 'Jamie R.',
            avatarUrl: 'https://images.unsplash.com/photo-1535930749574-1399327ce78f?w=200&h=200&fit=crop&crop=face',
        },
    },
    {
        id: 'decoy-post-6',
        type: 'IMAGE',
        content: 'Made grandma\'s soup recipe today. The house smells amazing!',
        mediaUrl: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800&h=600&fit=crop',
        mediaType: 'IMAGE',
        likes: 19,
        isLiked: true,
        commentsCount: 5,
        createdAt: new Date(Date.now() - 432000000).toISOString(),
        author: {
            id: 'decoy-friend-2',
            username: 'mom_linda',
            displayName: 'Mom',
            avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&h=200&fit=crop&crop=face',
        },
    },
];

export const DECOY_MESSAGES = [
    {
        id: 'decoy-conv-1',
        name: 'Mom',
        avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&h=200&fit=crop&crop=face',
        lastMessage: 'Don\'t forget dinner on Sunday! Dad is grilling 😊',
        time: '2h ago',
        unread: 1,
    },
    {
        id: 'decoy-conv-2',
        name: 'Book Club',
        avatarUrl: 'https://images.unsplash.com/photo-1524578271613-d550eacf6090?w=200&h=200&fit=crop',
        lastMessage: 'Next meeting is Thursday! We\'re reading Lessons in Chemistry',
        time: '5h ago',
        unread: 0,
    },
    {
        id: 'decoy-conv-3',
        name: 'Sarah K.',
        avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face',
        lastMessage: 'That cafe was so good! We should go back',
        time: '1d ago',
        unread: 0,
    },
    {
        id: 'decoy-conv-4',
        name: 'Knitting Circle',
        avatarUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=200&h=200&fit=crop',
        lastMessage: 'Has anyone tried the new yarn from that Etsy shop?',
        time: '2d ago',
        unread: 0,
    },
];

export const DECOY_NOTIFICATIONS = [
    {
        id: 'decoy-notif-1',
        type: 'LIKE' as const,
        message: 'liked your post',
        read: false,
        actorId: 'decoy-friend-1',
        actor: {
            id: 'decoy-friend-1',
            username: 'sarah_k',
            displayName: 'Sarah K.',
            avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face',
        },
        createdAt: new Date(Date.now() - 7200000).toISOString(),
    },
    {
        id: 'decoy-notif-2',
        type: 'COMMENT' as const,
        message: 'commented on your post: "So cute!! 😍"',
        read: true,
        actorId: 'decoy-friend-2',
        actor: {
            id: 'decoy-friend-2',
            username: 'mom_linda',
            displayName: 'Mom',
            avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&h=200&fit=crop&crop=face',
        },
        createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
];
