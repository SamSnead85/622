// Common API response wrapper
export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}

// User types
export interface User {
  id: string;
  username: string;
  displayName: string;
  email: string;
  avatarUrl?: string | null;
  coverUrl?: string | null;
  bio?: string | null;
  isVerified: boolean;
  role: 'USER' | 'ADMIN' | 'SUPERADMIN';
  createdAt: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
}

// Post types
export interface Post {
  id: string;
  content: string;
  mediaUrl?: string | null;
  mediaType?: 'image' | 'video' | 'audio' | null;
  thumbnailUrl?: string | null;
  userId: string;
  author: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string | null;
    isVerified: boolean;
  };
  communityId?: string | null;
  community?: { id: string; name: string; slug: string } | null;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  isLiked: boolean;
  isSaved: boolean;
  feedReason?: string;
  createdAt: string;
  updatedAt: string;
}

// Comment type
export interface Comment {
  id: string;
  content: string;
  userId: string;
  postId: string;
  parentId?: string | null;
  sender: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string | null;
    isVerified: boolean;
  };
  replies?: Comment[];
  likesCount: number;
  isLiked: boolean;
  createdAt: string;
}

// Community types
export interface Community {
  id: string;
  name: string;
  slug: string;
  description?: string;
  avatarUrl?: string | null;
  coverUrl?: string | null;
  memberCount: number;
  isPrivate: boolean;
  role?: string | null;
  createdAt: string;
}

// Notification type
export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  data?: Record<string, string>;
  createdAt: string;
}

// Message types
export interface Message {
  id: string;
  content: string;
  senderId: string;
  conversationId: string;
  sender: { id: string; username: string; displayName: string; avatarUrl?: string | null };
  createdAt: string;
}

export interface Conversation {
  id: string;
  participants: { id: string; username: string; displayName: string; avatarUrl?: string | null }[];
  lastMessage?: Message | null;
  unreadCount: number;
  updatedAt: string;
}

// Feed response
export interface FeedResponse {
  posts: Post[];
  hasMore: boolean;
  nextCursor?: string;
}

// Moment types
export interface Moment {
  id: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  caption?: string;
  userId: string;
  user: { id: string; username: string; displayName: string; avatarUrl?: string | null };
  viewCount: number;
  createdAt: string;
  expiresAt: string;
}
