-- Add performance indexes for common query patterns

-- Post: filter by userId + deletedAt (user's non-deleted posts)
CREATE INDEX IF NOT EXISTS "Post_userId_deletedAt_idx" ON "Post"("userId", "deletedAt");

-- Comment: top-level comment pagination by postId + createdAt
CREATE INDEX IF NOT EXISTS "Comment_postId_createdAt_idx" ON "Comment"("postId", "createdAt" DESC);

-- Notification: filtered queries by userId + type + createdAt
CREATE INDEX IF NOT EXISTS "Notification_userId_type_createdAt_idx" ON "Notification"("userId", "type", "createdAt" DESC);

-- Session: cleanup queries by expiresAt
CREATE INDEX IF NOT EXISTS "Session_expiresAt_idx" ON "Session"("expiresAt");
