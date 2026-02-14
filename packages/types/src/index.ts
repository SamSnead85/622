// ============================================
// @zerog/types — Single source of truth for all shared types
// ============================================
//
// These types represent the CANONICAL shapes used across the platform.
// Server types match what Prisma returns (field name: `user`, `sender`, `actor`, `creator`).
// Client types use normalized names (field name: `author` for posts/comments).
// Transform functions in ./transforms.ts bridge the gap.

// ── Re-exports ──────────────────────────────────────
export * from './api-responses';
export * from './transforms';

// ── Enums ───────────────────────────────────────────

export type Role = 'USER' | 'ADMIN' | 'SUPERADMIN';

export type ContentType = 'video' | 'image' | 'text' | 'audio';

export type MediaType = 'image' | 'video' | 'audio' | 'IMAGE' | 'VIDEO' | 'AUDIO';

export type CommunityRole = 'ADMIN' | 'MODERATOR' | 'MEMBER';

export type ConnectionDegree = 1 | 2 | 3 | null;

export type ConnectionStatus = 'connected' | 'pending_sent' | 'pending_received' | 'none';

export type NotificationType =
    | 'like'
    | 'comment'
    | 'follow'
    | 'mention'
    | 'community_invite'
    | 'community_post'
    | 'connection_request'
    | 'connection_accepted'
    | 'game_invite';

export type MessageType = 'text' | 'image' | 'video' | 'voice';

export type FeedView = 'private' | 'community';

// ── Embedded / Partial Types ────────────────────────

/** Minimal user shape returned in includes/joins (posts, comments, etc.) */
export interface UserSummary {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string | null;
    isVerified?: boolean;
}

/** Extended user summary with online/activity info (messages, connections) */
export interface UserPresence extends UserSummary {
    lastActiveAt?: string;
    isOnline?: boolean;
}

// ── Core Domain Types ───────────────────────────────

/** Full user profile as returned by GET /me */
export interface User {
    id: string;
    email?: string;
    phone?: string;
    username: string;
    displayName: string;
    displayNameSecondary?: string | null;
    secondaryLanguage?: string | null;
    bio?: string | null;
    website?: string | null;
    avatarUrl?: string | null;
    avatarFrame?: string | null;
    coverUrl?: string | null;
    isVerified: boolean;
    isPrivate: boolean;
    isGroupOnly?: boolean;
    primaryCommunityId?: string | null;
    role: Role;
    communityOptIn?: boolean;
    activeFeedView?: FeedView;
    usePublicProfile?: boolean;
    publicDisplayName?: string | null;
    publicUsername?: string | null;
    publicAvatarUrl?: string | null;
    publicBio?: string | null;
    onboardingComplete?: boolean;
    emailVerified?: boolean;
    trustLevel?: number;
    culturalProfile?: Record<string, unknown> | null;
    customGreeting?: string | null;
    isGrowthPartner?: boolean;
    growthPartnerTier?: string;
    followersCount: number;
    followingCount: number;
    postsCount: number;
    createdAt: string;
    updatedAt?: string;
}

/** Public profile as returned by GET /users/:username */
export interface UserProfile {
    id: string;
    username: string;
    displayName: string;
    displayNameSecondary?: string | null;
    secondaryLanguage?: string | null;
    bio?: string | null;
    website?: string | null;
    avatarUrl?: string | null;
    avatarFrame?: string | null;
    coverUrl?: string | null;
    isVerified: boolean;
    isPrivate: boolean;
    createdAt: string;
    followersCount: number;
    followingCount: number;
    postsCount: number;
    isFollowing: boolean;
    isOwnProfile: boolean;
    connectionDegree: ConnectionDegree;
    connectionStatus: ConnectionStatus;
    mutualConnectionsCount: number;
}

/** Post media attachment */
export interface PostMedia {
    id: string;
    mediaUrl: string;
    thumbnailUrl?: string | null;
    type: MediaType;
    position: number;
    aspectRatio?: string | null;
    duration?: number | null;
    width?: number | null;
    height?: number | null;
    altText?: string | null;
}

/** Cross-post reference */
export interface CrossPost {
    id: string;
    content?: string;
    user?: UserSummary;
}

// ── Server Response Types ───────────────────────────
// These match what the server ACTUALLY returns (Prisma field names).

/** Post as returned by the server (user field, not author) */
export interface ServerPost {
    id: string;
    content?: string | null;
    caption?: string | null;
    mediaUrl?: string | null;
    thumbnailUrl?: string | null;
    fullMediaUrl?: string | null;
    mediaType?: MediaType | null;
    mediaCropY?: number | null;
    mediaAspectRatio?: string | null;
    sortOrder?: number | null;
    type?: string;
    userId: string;
    user: UserSummary;
    communityId?: string | null;
    community?: { id: string; name: string; slug?: string } | null;
    eventDate?: string | null;
    eventLocation?: string | null;
    likesCount: number;
    commentsCount: number;
    sharesCount: number;
    isLiked?: boolean;
    isSaved?: boolean;
    isRsvped?: boolean;
    crossPost?: CrossPost | null;
    music?: Record<string, unknown> | null;
    media?: PostMedia[];
    authorNote?: string | null;
    createdAt: string;
    updatedAt?: string;
}

/** Comment as returned by the server (user field, not author) */
export interface ServerComment {
    id: string;
    content: string;
    userId: string;
    postId: string;
    parentId?: string | null;
    user: UserSummary;
    likesCount: number;
    isLiked?: boolean;
    repliesCount?: number;
    createdAt: string;
}

/** Notification as returned by the server */
export interface ServerNotification {
    id: string;
    type: NotificationType;
    message?: string | null;
    read: boolean;
    actorId?: string | null;
    actor?: UserSummary | null;
    targetId?: string | null;
    targetType?: string | null;
    createdAt: string;
}

/** Message as returned by the server */
export interface ServerMessage {
    id: string;
    conversationId: string;
    content: string;
    senderId: string;
    sender: UserSummary;
    mediaUrl?: string | null;
    type?: MessageType;
    isRead?: boolean;
    createdAt: string;
}

/** Conversation as returned by the server */
export interface ServerConversation {
    id: string;
    isGroup: boolean;
    groupName?: string | null;
    groupAvatar?: string | null;
    participants: UserPresence[];
    lastMessage?: {
        id: string;
        content: string;
        senderId: string;
        senderUsername?: string;
        createdAt: string;
    } | null;
    unreadCount: number;
    isMuted?: boolean;
    updatedAt?: string;
}

/** Community as returned by the server */
export interface ServerCommunity {
    id: string;
    name: string;
    slug?: string;
    description?: string | null;
    avatarUrl?: string | null;
    coverUrl?: string | null;
    isPublic?: boolean;
    membersCount: number;
    postsCount: number;
    isMember?: boolean;
    role?: CommunityRole | null;
    requestStatus?: string | null;
    creator?: UserSummary;
    rules?: Array<{ id: string; title: string; description: string }>;
    createdAt?: string;
}

// ── Client Types ────────────────────────────────────
// Normalized shapes used by the mobile/web clients.
// Transform functions in ./transforms.ts convert Server* → Client*.

/** Post with normalized `author` field */
export interface Post {
    id: string;
    content: string;
    mediaUrl?: string | null;
    thumbnailUrl?: string | null;
    fullMediaUrl?: string | null;
    mediaType?: MediaType | null;
    mediaCropY?: number | null;
    mediaAspectRatio?: string | null;
    sortOrder?: number | null;
    type?: string;
    author: UserSummary;
    authorNote?: string | null;
    communityId?: string | null;
    community?: { id: string; name: string; slug?: string } | null;
    eventDate?: string | null;
    eventLocation?: string | null;
    likesCount: number;
    commentsCount: number;
    sharesCount: number;
    isLiked: boolean;
    isSaved: boolean;
    isRsvped?: boolean;
    crossPost?: CrossPost | null;
    music?: Record<string, unknown> | null;
    media?: PostMedia[];
    createdAt: string;
    updatedAt?: string;
}

/** Comment with normalized `author` field */
export interface Comment {
    id: string;
    content: string;
    postId?: string;
    parentId?: string | null;
    author: UserSummary;
    likesCount: number;
    isLiked: boolean;
    repliesCount?: number;
    replies?: Comment[];
    createdAt: string;
}

/** Notification with flattened actor fields */
export interface Notification {
    id: string;
    type: NotificationType;
    message?: string | null;
    isRead: boolean;
    actorId?: string | null;
    actorUsername?: string | null;
    actorDisplayName?: string | null;
    actorAvatarUrl?: string | null;
    targetId?: string | null;
    postId?: string | null;
    createdAt: string;
}

/** Message with sender */
export interface Message {
    id: string;
    conversationId: string;
    content: string;
    senderId: string;
    sender: UserSummary;
    mediaUrl?: string | null;
    type?: MessageType;
    isRead?: boolean;
    createdAt: string;
}

/** Conversation normalized for client */
export interface Conversation {
    id: string;
    isGroup: boolean;
    groupName?: string | null;
    groupAvatar?: string | null;
    participant: UserPresence;
    lastMessage?: {
        content: string;
        createdAt: string;
        senderId: string;
    } | null;
    unreadCount: number;
    isPinned?: boolean;
    isArchived?: boolean;
    isMuted?: boolean;
}

/** Community normalized for client */
export interface Community {
    id: string;
    name: string;
    slug?: string;
    description?: string | null;
    avatarUrl?: string | null;
    coverUrl?: string | null;
    isPublic?: boolean;
    membersCount: number;
    postsCount: number;
    isMember: boolean;
    role?: CommunityRole | null;
    requestStatus?: string | null;
    creator?: UserSummary;
    createdAt?: string;
}

// ── Auth Types ──────────────────────────────────────

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
    displayName?: string;
}

export interface AuthResponse {
    user: User;
    token: string;
    expiresAt?: string;
    requiresEmailVerification?: boolean;
}

export interface TwoFactorChallenge {
    requires2FA: true;
    challengeToken: string;
    userId: string;
}

// ── Pagination ──────────────────────────────────────

export interface CursorPagination {
    nextCursor: string | null;
}
