/**
 * Re-export shared types from @zerog/types for the web app.
 * 
 * Import from here instead of defining local types for core domain objects.
 * Component-specific props and UI types should remain local to their components.
 */
export type {
    User,
    UserSummary,
    UserProfile,
    Post,
    Comment,
    Message,
    Conversation,
    Community,
    Notification,
    PostMedia,
    MediaType,
    ServerPost,
    ServerComment,
    ServerNotification,
    ServerMessage,
    ServerConversation,
    ServerCommunity,
} from '@zerog/types';

export {
    mapServerPost,
    mapServerComment,
    mapServerNotification,
    mapServerConversation,
} from '@zerog/types';
