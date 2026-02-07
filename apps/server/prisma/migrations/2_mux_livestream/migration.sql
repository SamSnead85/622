-- Mux Live Streaming Integration
-- Adds Mux-specific fields to LiveStream model for RTMP ingest, HLS playback, and VOD

ALTER TABLE "LiveStream" ADD COLUMN IF NOT EXISTS "muxStreamId" TEXT;
ALTER TABLE "LiveStream" ADD COLUMN IF NOT EXISTS "muxPlaybackId" TEXT;
ALTER TABLE "LiveStream" ADD COLUMN IF NOT EXISTS "muxAssetId" TEXT;
ALTER TABLE "LiveStream" ADD COLUMN IF NOT EXISTS "category" TEXT;
ALTER TABLE "LiveStream" ADD COLUMN IF NOT EXISTS "tags" TEXT[] DEFAULT '{}';
ALTER TABLE "LiveStream" ADD COLUMN IF NOT EXISTS "isRecorded" BOOLEAN NOT NULL DEFAULT true;

-- Unique index on muxStreamId for webhook lookups
CREATE UNIQUE INDEX IF NOT EXISTS "LiveStream_muxStreamId_key" ON "LiveStream"("muxStreamId");

-- Index on category for filtered discovery queries
CREATE INDEX IF NOT EXISTS "LiveStream_category_idx" ON "LiveStream"("category");

-- Index on muxStreamId for fast webhook processing
CREATE INDEX IF NOT EXISTS "LiveStream_muxStreamId_idx" ON "LiveStream"("muxStreamId");
