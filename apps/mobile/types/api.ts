// ============================================
// Re-export all types from the shared @zerog/types package.
// This file exists for backward compatibility — new code should
// import directly from '@zerog/types'.
// ============================================

export type {
    User,
    UserSummary,
    UserProfile,
    UserPresence,
    Post,
    Comment,
    Notification,
    Message,
    Conversation,
    Community,
    PostMedia,
    Role,
    ContentType,
    MediaType,
    CommunityRole,
    ConnectionDegree,
    ConnectionStatus,
    NotificationType,
    MessageType,
    FeedView,
    CursorPagination,
    // Server types (for raw API responses before transform)
    ServerPost,
    ServerComment,
    ServerNotification,
    ServerMessage,
    ServerConversation,
    ServerCommunity,
    // API response envelopes
    FeedResponse,
    CommentsResponse,
    NotificationsResponse,
    ConversationsResponse,
    MeResponse,
    LoginResponse,
    SignupResponse,
} from '@zerog/types';

// Re-export transforms
export {
    mapServerPost,
    mapServerComment,
    mapServerNotification,
    mapServerConversation,
} from '@zerog/types';
