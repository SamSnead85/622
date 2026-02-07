-- Privacy-First Architecture: Dual identity & feed isolation
-- Users are private by default. Opting into the community is explicit.

-- Community opt-in and feed view toggle
ALTER TABLE "User" ADD COLUMN "communityOptIn" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "activeFeedView" TEXT NOT NULL DEFAULT 'private';

-- Separate public persona (optional — used when usePublicProfile = true)
ALTER TABLE "User" ADD COLUMN "usePublicProfile" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "publicDisplayName" TEXT;
ALTER TABLE "User" ADD COLUMN "publicUsername" TEXT;
ALTER TABLE "User" ADD COLUMN "publicAvatarUrl" TEXT;
ALTER TABLE "User" ADD COLUMN "publicBio" TEXT;

-- Public username must be unique when set
CREATE UNIQUE INDEX "User_publicUsername_key" ON "User"("publicUsername");

-- Index for filtering community-visible users
CREATE INDEX "User_communityOptIn_idx" ON "User"("communityOptIn");
