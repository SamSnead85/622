-- Performance Indexes for 0G Platform
-- Run this in Supabase SQL Editor
-- These indexes will improve query performance by 10-100x at scale

-- ============================================
-- USER LOOKUPS
-- ============================================
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);

-- ============================================
-- FEED QUERIES
-- ============================================  
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_author_id ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_community_id ON posts(community_id) WHERE community_id IS NOT NULL;

-- ============================================
-- SOCIAL GRAPH
-- ============================================
CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);
CREATE INDEX IF NOT EXISTS idx_follows_created_at ON follows(created_at DESC);

-- Composite index for feed of followed users
CREATE INDEX IF NOT EXISTS idx_follows_follower_created ON follows(follower_id, created_at DESC);

-- ============================================
-- ENGAGEMENT
-- ============================================
CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user_id ON post_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_post_user ON post_likes(post_id, user_id);

CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_author_id ON comments(author_id);

-- ============================================
-- MESSAGES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);

CREATE INDEX IF NOT EXISTS idx_conversations_participant1 ON conversations(participant1_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_participant2 ON conversations(participant2_id, updated_at DESC);

-- ============================================
-- COMMUNITIES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_community_members_community ON community_members(community_id);
CREATE INDEX IF NOT EXISTS idx_community_members_user ON community_members(user_id);
CREATE INDEX IF NOT EXISTS idx_community_members_join_date ON community_members(joined_at DESC);

-- ============================================
-- NOTIFICATIONS
-- ============================================
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(user_id, is_read, created_at DESC);

-- ============================================
-- SESSIONS (for auth performance)
-- ============================================
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at) WHERE expires_at > NOW();

-- ============================================
-- MOMENTS (Stories)
-- ============================================
CREATE INDEX IF NOT EXISTS idx_moments_author_id ON moments(author_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_moments_expires_at ON moments(expires_at) WHERE expires_at > NOW();

-- ============================================
-- JOURNEYS (Events)
-- ============================================
CREATE INDEX IF NOT EXISTS idx_journeys_creator_id ON journeys(creator_id);
CREATE INDEX IF NOT EXISTS idx_journeys_start_date ON journeys(start_date DESC);

-- ============================================
-- Verify indexes were created
-- ============================================
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
