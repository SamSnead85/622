// ============================================
// API Response Envelope Types
// ============================================
//
// These types describe the exact shape of each API endpoint's response.
// They use Server* types (matching Prisma field names) because that's
// what the server actually returns. Client code should use the transform
// functions from ./transforms.ts to convert these into Client types.

import type {
    ServerPost,
    ServerComment,
    ServerNotification,
    ServerMessage,
    ServerConversation,
    ServerCommunity,
    User,
    UserProfile,
    UserSummary,
    UserPresence,
    CursorPagination,
} from './index';

// ── Auth ────────────────────────────────────────────

export interface LoginResponse {
    user: User;
    token: string;
    expiresAt: string;
}

export interface TwoFactorLoginResponse {
    requires2FA: true;
    challengeToken: string;
    userId: string;
}

export interface SignupResponse {
    user: User;
    token: string;
    expiresAt: string;
    requiresEmailVerification: boolean;
}

export interface MeResponse {
    user: User;
}

// ── Posts / Feed ────────────────────────────────────

export interface FeedResponse extends CursorPagination {
    posts: ServerPost[];
    feedView?: 'private' | 'community';
    communityOptIn?: boolean;
}

export interface PostDetailResponse extends ServerPost {
    // Single post detail — the post itself is the top-level object
}

export interface SavedPostsResponse extends CursorPagination {
    posts: Array<ServerPost & { savedAt: string }>;
}

// ── Comments ────────────────────────────────────────

export interface CommentsResponse extends CursorPagination {
    comments: ServerComment[];
}

export interface CreateCommentResponse extends ServerComment {
    // Single created comment — the comment itself is the top-level object
}

// ── Users ───────────────────────────────────────────

export interface UserProfileResponse extends UserProfile {
    // Single user profile — the profile itself is the top-level object
}

export interface UpdateProfileResponse {
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
    isPrivate?: boolean;
    culturalProfile?: Record<string, unknown> | null;
    customGreeting?: string | null;
}

// ── Messages ────────────────────────────────────────

export interface ConversationsResponse {
    conversations: ServerConversation[];
}

export interface ConversationMessagesResponse extends CursorPagination {
    messages: ServerMessage[];
    participant?: UserPresence | null;
    isGroup: boolean;
    groupName?: string | null;
}

export interface SendMessageResponse {
    message: ServerMessage;
}

// ── Notifications ───────────────────────────────────

export interface NotificationsResponse extends CursorPagination {
    notifications: ServerNotification[];
    unreadCount: number;
}

// ── Social ──────────────────────────────────────────

export interface FollowResponse {
    following: boolean;
}

export interface LikeResponse {
    liked: boolean;
}

// ── Communities ─────────────────────────────────────

export interface CommunitiesListResponse extends CursorPagination {
    communities: ServerCommunity[];
}

export interface CommunityDetailResponse extends ServerCommunity {
    // Single community — the community itself is the top-level object
}

// ── Moments ─────────────────────────────────────────

export interface MomentsResponse {
    moments: Array<{
        id: string;
        mediaUrl: string;
        thumbnailUrl?: string | null;
        type: string;
        userId: string;
        user?: UserSummary;
        expiresAt: string;
        viewCount: number;
        isSeen?: boolean;
        createdAt: string;
    }>;
}

// ── Online Users ────────────────────────────────────

export interface OnlineUsersResponse {
    users: UserPresence[];
}
