// ============================================
// Server → Client Transform Functions
// ============================================
//
// Pure functions that convert server response shapes (Prisma field names)
// into client-friendly shapes (normalized field names).
//
// These handle the `user` → `author` rename, fallback field resolution,
// and any other normalization needed between server and client.

import type {
    ServerPost,
    ServerComment,
    ServerNotification,
    ServerConversation,
    Post,
    Comment,
    Notification,
    Conversation,
    UserSummary,
    UserPresence,
} from './index';

// ── Helpers ─────────────────────────────────────────

const UNKNOWN_USER: UserSummary = {
    id: '',
    username: 'unknown',
    displayName: 'Unknown',
    avatarUrl: null,
};

/** Safely extract a UserSummary from a raw object that may have `user` or `author` */
function extractUser(raw: Record<string, unknown>): UserSummary {
    const source = (raw.user ?? raw.author ?? raw.sender ?? null) as UserSummary | null;
    if (!source || typeof source !== 'object') return UNKNOWN_USER;
    return {
        id: String(source.id ?? ''),
        username: String(source.username ?? 'unknown'),
        displayName: String(source.displayName ?? source.username ?? 'Unknown'),
        avatarUrl: (source.avatarUrl as string) ?? null,
        isVerified: Boolean(source.isVerified),
    };
}

// ── Post Transforms ─────────────────────────────────

/** Transform a server post into a client post */
export function mapServerPost(raw: ServerPost | Record<string, unknown>): Post {
    const r = raw as Record<string, unknown>;
    const author = extractUser(r);

    return {
        id: String(r.id ?? ''),
        content: String(r.caption ?? r.content ?? ''),
        mediaUrl: (r.mediaUrl as string) ?? null,
        thumbnailUrl: (r.thumbnailUrl as string) ?? null,
        fullMediaUrl: (r.fullMediaUrl as string) ?? null,
        mediaType: (r.mediaType as Post['mediaType']) ?? null,
        mediaCropY: (r.mediaCropY as number) ?? null,
        mediaAspectRatio: (r.mediaAspectRatio as string) ?? null,
        sortOrder: (r.sortOrder as number) ?? null,
        type: (r.type as string) ?? undefined,
        author,
        authorNote: (r.authorNote as string) ?? null,
        communityId: (r.communityId as string) ?? null,
        community: r.community as Post['community'] ?? null,
        eventDate: (r.eventDate as string) ?? null,
        eventLocation: (r.eventLocation as string) ?? null,
        likesCount: Number(r.likesCount ?? (r._count as Record<string, number>)?.likes ?? 0),
        commentsCount: Number(r.commentsCount ?? (r._count as Record<string, number>)?.comments ?? 0),
        sharesCount: Number(r.sharesCount ?? (r._count as Record<string, number>)?.shares ?? 0),
        isLiked: Boolean(r.isLiked),
        isSaved: Boolean(r.isSaved),
        isRsvped: r.isRsvped != null ? Boolean(r.isRsvped) : undefined,
        crossPost: r.crossPost as Post['crossPost'] ?? null,
        music: r.music as Post['music'] ?? null,
        media: (r.media as Post['media']) ?? undefined,
        createdAt: String(r.createdAt ?? new Date().toISOString()),
        updatedAt: r.updatedAt ? String(r.updatedAt) : undefined,
    };
}

// ── Comment Transforms ──────────────────────────────

/** Transform a server comment into a client comment */
export function mapServerComment(raw: ServerComment | Record<string, unknown>): Comment {
    const r = raw as Record<string, unknown>;
    const author = extractUser(r);

    return {
        id: String(r.id ?? ''),
        content: String(r.content ?? ''),
        postId: r.postId ? String(r.postId) : undefined,
        parentId: r.parentId ? String(r.parentId) : null,
        author,
        likesCount: Number(r.likesCount ?? (r._count as Record<string, number>)?.likes ?? 0),
        isLiked: Boolean(r.isLiked),
        repliesCount: Number(r.repliesCount ?? (r._count as Record<string, number>)?.replies ?? 0),
        replies: Array.isArray(r.replies)
            ? (r.replies as Array<Record<string, unknown>>).map(mapServerComment)
            : undefined,
        createdAt: String(r.createdAt ?? new Date().toISOString()),
    };
}

// ── Notification Transforms ─────────────────────────

/** Transform a server notification into a client notification */
export function mapServerNotification(raw: ServerNotification | Record<string, unknown>): Notification {
    const r = raw as Record<string, unknown>;
    const actor = (r.actor ?? null) as UserSummary | null;

    return {
        id: String(r.id ?? ''),
        type: (r.type as Notification['type']) ?? 'follow',
        message: r.message ? String(r.message) : null,
        isRead: Boolean(r.read ?? r.isRead),
        actorId: actor?.id ?? (r.actorId ? String(r.actorId) : null),
        actorUsername: actor?.username ?? (r.actorUsername ? String(r.actorUsername) : null),
        actorDisplayName: actor?.displayName ?? (r.actorDisplayName ? String(r.actorDisplayName) : null),
        actorAvatarUrl: actor?.avatarUrl ?? (r.actorAvatarUrl as string) ?? null,
        targetId: r.targetId ? String(r.targetId) : null,
        postId: r.postId ? String(r.postId) : null,
        createdAt: String(r.createdAt ?? new Date().toISOString()),
    };
}

// ── Conversation Transforms ─────────────────────────

/** Transform a server conversation into a client conversation */
export function mapServerConversation(
    raw: ServerConversation | Record<string, unknown>,
    currentUserId?: string
): Conversation {
    const r = raw as Record<string, unknown>;

    // Extract participant: prefer `participant` field, fall back to first non-self participant
    let participant: UserPresence;
    if (r.participant && typeof r.participant === 'object') {
        const p = r.participant as UserPresence;
        participant = {
            id: String(p.id ?? ''),
            username: String(p.username ?? 'unknown'),
            displayName: String(p.displayName ?? 'Unknown'),
            avatarUrl: (p.avatarUrl as string) ?? null,
            isOnline: Boolean(p.isOnline),
            lastActiveAt: p.lastActiveAt ? String(p.lastActiveAt) : undefined,
        };
    } else if (Array.isArray(r.participants) && r.participants.length > 0) {
        const participants = r.participants as UserPresence[];
        const other = currentUserId
            ? participants.find((p) => p.id !== currentUserId) ?? participants[0]
            : participants[0];
        participant = {
            id: String(other.id ?? ''),
            username: String(other.username ?? 'unknown'),
            displayName: String(other.displayName ?? 'Unknown'),
            avatarUrl: (other.avatarUrl as string) ?? null,
            isOnline: Boolean(other.isOnline),
            lastActiveAt: other.lastActiveAt ? String(other.lastActiveAt) : undefined,
        };
    } else {
        participant = { ...UNKNOWN_USER, isOnline: false };
    }

    const lastMsg = r.lastMessage as Record<string, unknown> | null;

    return {
        id: String(r.id ?? ''),
        isGroup: Boolean(r.isGroup),
        groupName: r.groupName ? String(r.groupName) : null,
        groupAvatar: r.groupAvatar ? String(r.groupAvatar) : null,
        participant,
        lastMessage: lastMsg
            ? {
                  content: String(lastMsg.content ?? ''),
                  createdAt: String(lastMsg.createdAt ?? ''),
                  senderId: String(lastMsg.senderId ?? ''),
              }
            : null,
        unreadCount: Number(r.unreadCount ?? 0),
        isPinned: Boolean(r.isPinned),
        isArchived: Boolean(r.isArchived),
        isMuted: Boolean(r.isMuted),
    };
}
