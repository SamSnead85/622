-- Scalability indexes for high-growth tables
-- These composite indexes prevent full table scans on the most frequently queried paths

-- Message: pagination within a conversation (chat screen loads)
CREATE INDEX IF NOT EXISTS "Message_conversationId_createdAt_idx"
  ON "Message"("conversationId", "createdAt" DESC);

-- Like: user's like timeline
CREATE INDEX IF NOT EXISTS "Like_userId_createdAt_idx"
  ON "Like"("userId", "createdAt" DESC);

-- Share: user's share history
CREATE INDEX IF NOT EXISTS "Share_userId_createdAt_idx"
  ON "Share"("userId", "createdAt" DESC);

-- Notification: deduplication queries (prevents duplicate notifications)
CREATE INDEX IF NOT EXISTS "Notification_userId_type_actorId_targetId_createdAt_idx"
  ON "Notification"("userId", "type", "actorId", "targetId", "createdAt");

-- Post: community feed with soft-delete filter
CREATE INDEX IF NOT EXISTS "Post_communityId_deletedAt_createdAt_idx"
  ON "Post"("communityId", "deletedAt", "createdAt" DESC);

-- Post: user profile posts sorted by pin order
CREATE INDEX IF NOT EXISTS "Post_userId_sortOrder_createdAt_idx"
  ON "Post"("userId", "sortOrder" DESC, "createdAt" DESC);
