// ============================================
// 0G Social Network - Shared Types
// ============================================

// User Types
export interface User {
    id: string;
    email?: string;
    phone?: string;
    username: string;
    displayName?: string;
    bio?: string;
    avatarUrl?: string;
    coverUrl?: string;
    followersCount: number;
    followingCount: number;
    postsCount: number;
    isVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface UserProfile extends User {
    isFollowing: boolean;
    isFollowedBy: boolean;
    mutualFollowers?: User[];
}

// Content Types
export type ContentType = 'video' | 'image' | 'text';

export interface Post {
    id: string;
    userId: string;
    user?: User;
    type: ContentType;
    mediaUrl?: string;
    thumbnailUrl?: string;
    caption?: string;
    hashtags: string[];
    communityId?: string;
    community?: Community;
    likesCount: number;
    commentsCount: number;
    sharesCount: number;
    isLiked: boolean;
    isSaved: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface Comment {
    id: string;
    postId: string;
    userId: string;
    user?: User;
    content: string;
    parentId?: string;
    replies?: Comment[];
    likesCount: number;
    isLiked: boolean;
    createdAt: Date;
}

// Community Types
export type CommunityRole = 'owner' | 'admin' | 'moderator' | 'member';

export interface Community {
    id: string;
    name: string;
    description?: string;
    avatarUrl?: string;
    coverUrl?: string;
    isPublic: boolean;
    membersCount: number;
    postsCount: number;
    creatorId: string;
    creator?: User;
    isMember: boolean;
    role?: CommunityRole;
    createdAt: Date;
}

export interface CommunityMember {
    communityId: string;
    userId: string;
    user?: User;
    role: CommunityRole;
    joinedAt: Date;
}

export interface Discussion {
    id: string;
    communityId: string;
    userId: string;
    user?: User;
    title: string;
    content: string;
    repliesCount: number;
    likesCount: number;
    isPinned: boolean;
    isLocked: boolean;
    createdAt: Date;
    updatedAt: Date;
}

// Messaging Types (Phase 2)
export interface Conversation {
    id: string;
    type: 'direct' | 'group';
    name?: string;
    avatarUrl?: string;
    participants: User[];
    lastMessage?: Message;
    unreadCount: number;
    isEncrypted: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface Message {
    id: string;
    conversationId: string;
    senderId: string;
    sender?: User;
    content: string;
    mediaUrl?: string;
    type: 'text' | 'image' | 'video' | 'voice';
    isRead: boolean;
    isEncrypted: boolean;
    createdAt: Date;
}

// Feed Types
export interface FeedItem {
    id: string;
    type: 'post' | 'community_post' | 'suggested_user' | 'suggested_community';
    post?: Post;
    user?: User;
    community?: Community;
    reason?: string; // e.g., "Because you follow @username"
}

// Auth Types
export interface AuthState {
    user: User | null;
    token: string | null;
    refreshToken: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
}

export interface LoginCredentials {
    email?: string;
    phone?: string;
    password: string;
}

export interface SignupData {
    email?: string;
    phone?: string;
    password: string;
    username: string;
}

// API Response Types
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: ApiError;
    pagination?: Pagination;
}

export interface ApiError {
    code: string;
    message: string;
    details?: Record<string, string>;
}

export interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
}

// Notification Types
export type NotificationType =
    | 'like'
    | 'comment'
    | 'follow'
    | 'mention'
    | 'community_invite'
    | 'community_post';

export interface Notification {
    id: string;
    type: NotificationType;
    userId: string;
    fromUser?: User;
    post?: Post;
    community?: Community;
    message: string;
    isRead: boolean;
    createdAt: Date;
}
