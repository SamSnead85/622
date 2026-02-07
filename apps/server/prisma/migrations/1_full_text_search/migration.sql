-- Full-Text Search Migration for PostgreSQL
-- Phase 12: Adds tsvector columns, GIN indexes, and auto-update triggers
-- for posts, users, and communities.

-- ============================================
-- Add tsvector columns
-- ============================================
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "search_vector" tsvector;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "search_vector" tsvector;
ALTER TABLE "Community" ADD COLUMN IF NOT EXISTS "search_vector" tsvector;

-- ============================================
-- Create GIN indexes for fast full-text search
-- ============================================
CREATE INDEX IF NOT EXISTS post_search_idx ON "Post" USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS user_search_idx ON "User" USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS community_search_idx ON "Community" USING GIN(search_vector);

-- ============================================
-- Auto-update triggers for Post search vector
-- ============================================
CREATE OR REPLACE FUNCTION update_post_search() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', coalesce(NEW.caption, ''));
  RETURN NEW;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS post_search_update ON "Post";
CREATE TRIGGER post_search_update BEFORE INSERT OR UPDATE ON "Post"
  FOR EACH ROW EXECUTE FUNCTION update_post_search();

-- ============================================
-- Auto-update triggers for User search vector
-- ============================================
CREATE OR REPLACE FUNCTION update_user_search() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.username, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW."displayName", '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.bio, '')), 'B');
  RETURN NEW;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_search_update ON "User";
CREATE TRIGGER user_search_update BEFORE INSERT OR UPDATE ON "User"
  FOR EACH ROW EXECUTE FUNCTION update_user_search();

-- ============================================
-- Auto-update triggers for Community search vector
-- ============================================
CREATE OR REPLACE FUNCTION update_community_search() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B');
  RETURN NEW;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS community_search_update ON "Community";
CREATE TRIGGER community_search_update BEFORE INSERT OR UPDATE ON "Community"
  FOR EACH ROW EXECUTE FUNCTION update_community_search();

-- ============================================
-- Backfill existing data
-- ============================================
UPDATE "Post" SET search_vector = to_tsvector('english', coalesce(caption, ''))
  WHERE search_vector IS NULL;

UPDATE "User" SET search_vector =
  setweight(to_tsvector('english', coalesce(username, '')), 'A') ||
  setweight(to_tsvector('english', coalesce("displayName", '')), 'A') ||
  setweight(to_tsvector('english', coalesce(bio, '')), 'B')
  WHERE search_vector IS NULL;

UPDATE "Community" SET search_vector =
  setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(description, '')), 'B')
  WHERE search_vector IS NULL;
