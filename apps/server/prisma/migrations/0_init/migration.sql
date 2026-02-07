npm warn Unknown env config "devdir". This will stop working in the next major version of npm.
-- CreateEnum
CREATE TYPE "ProposalType" AS ENUM ('RULE_CHANGE', 'MODERATOR_ELECTION', 'BAN_APPEAL', 'FEATURE_REQUEST', 'POLICY_CHANGE');

-- CreateEnum
CREATE TYPE "ProposalStatus" AS ENUM ('ACTIVE', 'PASSED', 'REJECTED', 'EXPIRED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "ScheduleStatus" AS ENUM ('PENDING', 'PUBLISHED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'MODERATOR', 'ADMIN', 'SUPERADMIN');

-- CreateEnum
CREATE TYPE "MomentType" AS ENUM ('IMAGE', 'VIDEO', 'TEXT');

-- CreateEnum
CREATE TYPE "LiveStreamStatus" AS ENUM ('SCHEDULED', 'LIVE', 'ENDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ChatType" AS ENUM ('MESSAGE', 'GIFT', 'REACTION', 'JOIN', 'LEAVE');

-- CreateEnum
CREATE TYPE "PostType" AS ENUM ('IMAGE', 'VIDEO', 'TEXT', 'POLL', 'RALLY');

-- CreateEnum
CREATE TYPE "RSVPStatus" AS ENUM ('IN', 'MAYBE', 'OUT');

-- CreateEnum
CREATE TYPE "CommunityRole" AS ENUM ('MEMBER', 'MODERATOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "MessageMedia" AS ENUM ('IMAGE', 'VIDEO', 'AUDIO', 'FILE');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('LIKE', 'COMMENT', 'FOLLOW', 'MENTION', 'COMMUNITY_INVITE', 'COMMUNITY_POST', 'MESSAGE', 'SYSTEM', 'WAVE');

-- CreateEnum
CREATE TYPE "MigrationPlatform" AS ENUM ('INSTAGRAM', 'TIKTOK', 'TWITTER', 'FACEBOOK', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "MigrationStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('PENDING', 'IMPORTING', 'COMPLETED', 'SKIPPED', 'FAILED');

-- CreateEnum
CREATE TYPE "ConnectionType" AS ENUM ('FOLLOWER', 'FOLLOWING', 'MUTUAL', 'CONTACT');

-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('NOT_SENT', 'SENT', 'REMINDED', 'OPENED', 'JOINED', 'DECLINED', 'BOUNCED');

-- CreateEnum
CREATE TYPE "InviteMethod" AS ENUM ('EMAIL', 'SMS', 'LINK');

-- CreateEnum
CREATE TYPE "TerritoryType" AS ENUM ('CIRCLE', 'CLAN', 'TRIBE', 'NATION', 'WORLD');

-- CreateEnum
CREATE TYPE "TerritoryRole" AS ENUM ('MEMBER', 'GUARDIAN', 'ELDER', 'CHIEF');

-- CreateEnum
CREATE TYPE "TerritoryConnectionType" AS ENUM ('ALLIED', 'FEDERATED', 'OBSERVED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "ConnectionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'ACCEPTED', 'DECLINED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "PostPermission" AS ENUM ('ANYONE', 'MEMBERS', 'GUARDIANS', 'ELDERS', 'CHIEFS');

-- CreateEnum
CREATE TYPE "RuleType" AS ENUM ('KEYWORD_FILTER', 'CONTENT_RATING', 'SPAM_DETECTION', 'CUSTOM');

-- CreateEnum
CREATE TYPE "RuleAction" AS ENUM ('FLAG', 'HIDE', 'DELETE', 'WARN', 'STRIKE');

-- CreateEnum
CREATE TYPE "GeoBlockType" AS ENUM ('FULL', 'VIEW_ONLY', 'NO_JOIN');

-- CreateEnum
CREATE TYPE "SecurityPolicyType" AS ENUM ('RATE_LIMITING', 'IP_BLOCKING', 'GEO_RESTRICTION', 'CONTENT_SCANNING', 'AUTH_HARDENING', 'DATA_PROTECTION', 'THREAT_DETECTION');

-- CreateEnum
CREATE TYPE "ThreatLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "BulletinType" AS ENUM ('ANNOUNCEMENT', 'JOB', 'COLLABORATION', 'INVESTMENT', 'EVENT', 'CALL_TO_ACTION', 'SPOTLIGHT', 'DISCUSSION');

-- CreateEnum
CREATE TYPE "BulletinCategory" AS ENUM ('SOCIAL_JUSTICE', 'CAREER', 'BUSINESS', 'COMMUNITY', 'CULTURE', 'TECH', 'ACTIVISM', 'GENERAL');

-- CreateEnum
CREATE TYPE "StreamPlatform" AS ENUM ('YOUTUBE', 'TWITCH', 'FACEBOOK', 'INSTAGRAM', 'TIKTOK', 'NATIVE');

-- CreateEnum
CREATE TYPE "SuggestionStatus" AS ENUM ('PENDING', 'APPROVED', 'LIVE', 'ENDED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('active', 'canceled', 'incomplete', 'incomplete_expired', 'past_due', 'paused', 'trialing', 'unpaid', 'INACTIVE');

-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('POST', 'USER', 'COMMENT', 'COMMUNITY', 'LIVESTREAM', 'MESSAGE');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'REVIEWING', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "InterestLevel" AS ENUM ('NOT_INTERESTED', 'INTERESTED', 'VERY_INTERESTED');

-- CreateEnum
CREATE TYPE "TerritoryTier" AS ENUM ('TIER_1_PERSONAL', 'TIER_2_SOVEREIGN', 'TIER_3_FEDERATED');

-- CreateEnum
CREATE TYPE "EncryptionScheme" AS ENUM ('NONE', 'STANDARD', 'SIGNAL_PROTOCOL', 'PGP');

-- CreateEnum
CREATE TYPE "KeyRotationPolicy" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'NEVER');

-- CreateEnum
CREATE TYPE "AlgorithmTemplate" AS ENUM ('CHRONOLOGICAL', 'FAMILY_FEED', 'ACTIVIST', 'NEWS_HUB', 'BALANCED', 'CUSTOM');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "username" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "displayNameSecondary" TEXT,
    "secondaryLanguage" TEXT,
    "bio" TEXT,
    "website" TEXT,
    "avatarUrl" TEXT,
    "coverUrl" TEXT,
    "passwordHash" TEXT,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "isBanned" BOOLEAN NOT NULL DEFAULT false,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resetToken" TEXT,
    "resetTokenExpiry" TIMESTAMP(3),
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorSecret" TEXT,
    "twoFactorBackupCodes" TEXT[],
    "twoFactorVerifiedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "deviceType" TEXT,
    "deviceName" TEXT,
    "ipAddress" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TwoFactorChallenge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TwoFactorChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OAuthAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OAuthAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Moment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "MomentType" NOT NULL DEFAULT 'IMAGE',
    "mediaUrl" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "duration" INTEGER,
    "caption" TEXT,
    "musicId" TEXT,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Moment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MomentView" (
    "id" TEXT NOT NULL,
    "momentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MomentView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveStream" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "thumbnailUrl" TEXT,
    "streamKey" TEXT NOT NULL,
    "playbackUrl" TEXT,
    "status" "LiveStreamStatus" NOT NULL DEFAULT 'SCHEDULED',
    "viewerCount" INTEGER NOT NULL DEFAULT 0,
    "peakViewerCount" INTEGER NOT NULL DEFAULT 0,
    "totalViews" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "scheduledFor" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LiveStream_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveStreamChat" (
    "id" TEXT NOT NULL,
    "streamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" "ChatType" NOT NULL DEFAULT 'MESSAGE',
    "giftType" TEXT,
    "giftAmount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LiveStreamChat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Follow" (
    "id" TEXT NOT NULL,
    "followerId" TEXT NOT NULL,
    "followingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Follow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "communityId" TEXT,
    "type" "PostType" NOT NULL DEFAULT 'VIDEO',
    "caption" TEXT,
    "mediaUrl" TEXT,
    "thumbnailUrl" TEXT,
    "duration" INTEGER,
    "musicId" TEXT,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Music" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "artist" TEXT NOT NULL,
    "audioUrl" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "coverUrl" TEXT,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Music_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "parentId" TEXT,
    "content" TEXT NOT NULL,
    "likesCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Like" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Like_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Share" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Share_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Save" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Save_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostRSVP" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "RSVPStatus" NOT NULL DEFAULT 'IN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostRSVP_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hashtag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Hashtag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostHashtag" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "hashtagId" TEXT NOT NULL,

    CONSTRAINT "PostHashtag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Community" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "avatarUrl" TEXT,
    "coverUrl" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "memberCount" INTEGER NOT NULL DEFAULT 0,
    "postCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Community_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Proposal" (
    "id" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "ProposalType" NOT NULL,
    "status" "ProposalStatus" NOT NULL DEFAULT 'ACTIVE',
    "targetData" JSONB,
    "votesFor" INTEGER NOT NULL DEFAULT 0,
    "votesAgainst" INTEGER NOT NULL DEFAULT 0,
    "quorum" INTEGER NOT NULL DEFAULT 10,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Proposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProposalVote" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "vote" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProposalVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModerationLog" (
    "id" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "moderatorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModerationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityMember" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "role" "CommunityRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityRule" (
    "id" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "isGroup" BOOLEAN NOT NULL DEFAULT false,
    "groupName" TEXT,
    "groupAvatar" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationParticipant" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lastReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isMuted" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "mediaUrl" TEXT,
    "mediaType" "MessageMedia",
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "actorId" TEXT,
    "targetId" TEXT,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Migration" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" "MigrationPlatform" NOT NULL,
    "status" "MigrationStatus" NOT NULL DEFAULT 'PENDING',
    "filePath" TEXT,
    "stats" JSONB,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Migration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportedPost" (
    "id" TEXT NOT NULL,
    "migrationId" TEXT NOT NULL,
    "originalPlatform" TEXT NOT NULL,
    "originalId" TEXT,
    "originalTimestamp" TIMESTAMP(3),
    "type" "PostType" NOT NULL DEFAULT 'IMAGE',
    "caption" TEXT,
    "mediaUrls" TEXT[],
    "location" TEXT,
    "tags" TEXT[],
    "importStatus" "ImportStatus" NOT NULL DEFAULT 'PENDING',
    "caravanPostId" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportedPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PendingConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "migrationId" TEXT,
    "platform" "MigrationPlatform" NOT NULL,
    "originalUsername" TEXT NOT NULL,
    "displayName" TEXT,
    "profileImageUrl" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "matchedUserId" TEXT,
    "matchConfidence" INTEGER,
    "connectionType" "ConnectionType" NOT NULL DEFAULT 'FOLLOWER',
    "inviteStatus" "InviteStatus" NOT NULL DEFAULT 'NOT_SENT',
    "inviteSentAt" TIMESTAMP(3),
    "inviteMethod" "InviteMethod",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PendingConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invite" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "recipientEmail" TEXT,
    "recipientPhone" TEXT,
    "method" "InviteMethod" NOT NULL,
    "status" "InviteStatus" NOT NULL DEFAULT 'SENT',
    "referralCode" TEXT NOT NULL,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "openedAt" TIMESTAMP(3),
    "joinedAt" TIMESTAMP(3),
    "joinedUserId" TEXT,

    CONSTRAINT "Invite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Territory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "type" "TerritoryType" NOT NULL,
    "tier" "TerritoryTier" NOT NULL DEFAULT 'TIER_2_SOVEREIGN',
    "maxMembers" INTEGER,
    "avatarUrl" TEXT,
    "coverUrl" TEXT,
    "primaryColor" TEXT DEFAULT '#D4AF37',
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "requireApproval" BOOLEAN NOT NULL DEFAULT true,
    "parentId" TEXT,
    "memberCount" INTEGER NOT NULL DEFAULT 0,
    "postCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Territory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TerritoryMember" (
    "id" TEXT NOT NULL,
    "territoryId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "TerritoryRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "invitedById" TEXT,
    "isMuted" BOOLEAN NOT NULL DEFAULT false,
    "strikeCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TerritoryMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TerritoryPost" (
    "id" TEXT NOT NULL,
    "territoryId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "sharedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TerritoryPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TerritoryConnection" (
    "id" TEXT NOT NULL,
    "fromTerritoryId" TEXT NOT NULL,
    "toTerritoryId" TEXT NOT NULL,
    "type" "TerritoryConnectionType" NOT NULL DEFAULT 'OBSERVED',
    "shareContent" BOOLEAN NOT NULL DEFAULT false,
    "shareMembers" BOOLEAN NOT NULL DEFAULT false,
    "status" "ConnectionStatus" NOT NULL DEFAULT 'PENDING',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),

    CONSTRAINT "TerritoryConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TerritoryAlgorithmSettings" (
    "id" TEXT NOT NULL,
    "territoryId" TEXT NOT NULL,
    "recencyWeight" INTEGER NOT NULL DEFAULT 50,
    "engagementWeight" INTEGER NOT NULL DEFAULT 30,
    "familiarityWeight" INTEGER NOT NULL DEFAULT 60,
    "noveltyWeight" INTEGER NOT NULL DEFAULT 20,
    "contentSourceWeights" JSONB,
    "rankingSignals" JSONB,
    "safetyFilters" JSONB,
    "algorithmTemplate" "AlgorithmTemplate" NOT NULL DEFAULT 'BALANCED',
    "isCustomized" BOOLEAN NOT NULL DEFAULT false,
    "contentRatings" TEXT[] DEFAULT ARRAY['G', 'PG', 'PG13']::TEXT[],
    "whoCanPost" "PostPermission" NOT NULL DEFAULT 'MEMBERS',
    "whoCanComment" "PostPermission" NOT NULL DEFAULT 'MEMBERS',
    "whoCanInvite" "PostPermission" NOT NULL DEFAULT 'ELDERS',
    "allowCrossPosting" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TerritoryAlgorithmSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityEncryption" (
    "id" TEXT NOT NULL,
    "territoryId" TEXT NOT NULL,
    "encryptionScheme" "EncryptionScheme" NOT NULL DEFAULT 'STANDARD',
    "keyRotationPolicy" "KeyRotationPolicy" NOT NULL DEFAULT 'MONTHLY',
    "publicKey" TEXT,
    "keyDerivationSalt" TEXT,
    "mediaEncryption" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityEncryption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TerritoryFeedCache" (
    "id" TEXT NOT NULL,
    "territoryId" TEXT NOT NULL,
    "userId" TEXT,
    "feedSignature" TEXT NOT NULL,
    "cachedContent" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TerritoryFeedCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TerritoryModerationRule" (
    "id" TEXT NOT NULL,
    "territoryId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "RuleType" NOT NULL,
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "action" "RuleAction" NOT NULL DEFAULT 'FLAG',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TerritoryModerationRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TerritoryStrike" (
    "id" TEXT NOT NULL,
    "territoryId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "issuedById" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "postId" TEXT,
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TerritoryStrike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeoBlock" (
    "id" TEXT NOT NULL,
    "territoryId" TEXT,
    "countryCode" TEXT NOT NULL,
    "countryName" TEXT NOT NULL,
    "reason" TEXT,
    "blockType" "GeoBlockType" NOT NULL DEFAULT 'FULL',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "GeoBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentModerationSettings" (
    "id" TEXT NOT NULL,
    "territoryId" TEXT NOT NULL,
    "explicitLanguageFilter" BOOLEAN NOT NULL DEFAULT false,
    "explicitMaterialsFilter" BOOLEAN NOT NULL DEFAULT false,
    "aiModerationEnabled" BOOLEAN NOT NULL DEFAULT true,
    "aiSensitivity" INTEGER NOT NULL DEFAULT 50,
    "blockedWords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "flaggedWords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "minContentRating" TEXT NOT NULL DEFAULT 'G',
    "maxContentRating" TEXT NOT NULL DEFAULT 'PG13',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentModerationSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformSecurityPolicy" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "type" "SecurityPolicyType" NOT NULL,
    "config" JSONB NOT NULL DEFAULT '{}',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformSecurityPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlockedIP" (
    "id" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "reason" TEXT,
    "threatLevel" "ThreatLevel" NOT NULL DEFAULT 'MEDIUM',
    "source" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "BlockedIP_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecurityAuditLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "userId" TEXT,
    "ipAddress" TEXT NOT NULL,
    "countryCode" TEXT,
    "userAgent" TEXT,
    "details" JSONB,
    "severity" "ThreatLevel" NOT NULL DEFAULT 'LOW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecurityAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BulletinPost" (
    "id" TEXT NOT NULL,
    "type" "BulletinType" NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "mediaUrl" TEXT,
    "externalLink" TEXT,
    "upvotes" INTEGER NOT NULL DEFAULT 0,
    "downvotes" INTEGER NOT NULL DEFAULT 0,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "category" "BulletinCategory" NOT NULL,
    "tags" TEXT[],
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "location" TEXT,
    "locationGeo" TEXT,
    "eventDate" TIMESTAMP(3),
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "BulletinPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BulletinComment" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "bulletinId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BulletinComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BulletinVote" (
    "id" TEXT NOT NULL,
    "bulletinId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isUpvote" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BulletinVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveStreamSuggestion" (
    "id" TEXT NOT NULL,
    "platformType" "StreamPlatform" NOT NULL,
    "externalId" TEXT NOT NULL,
    "embedUrl" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "description" TEXT,
    "upvotes" INTEGER NOT NULL DEFAULT 0,
    "downvotes" INTEGER NOT NULL DEFAULT 0,
    "status" "SuggestionStatus" NOT NULL DEFAULT 'PENDING',
    "suggestedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LiveStreamSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StreamVote" (
    "id" TEXT NOT NULL,
    "suggestionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isUpvote" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StreamVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConnectionRequest" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "status" "ConnectionStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConnectionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserConnectionSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "autoApprove" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "UserConnectionSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPresence" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT true,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentPage" TEXT,

    CONSTRAINT "UserPresence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "stripePriceId" TEXT,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'INACTIVE',
    "currentPeriodEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "targetType" "ReportType" NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Topic" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "color" TEXT,
    "postCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Topic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostTopic" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,

    CONSTRAINT "PostTopic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserInterest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "level" "InterestLevel" NOT NULL DEFAULT 'INTERESTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserInterest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserKeyBundle" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "identityKey" TEXT NOT NULL,
    "signedPreKey" TEXT NOT NULL,
    "preKeySignature" TEXT NOT NULL,
    "oneTimePreKeys" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserKeyBundle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduledPost" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "PostType" NOT NULL,
    "caption" TEXT,
    "mediaUrl" TEXT,
    "thumbnailUrl" TEXT,
    "communityId" TEXT,
    "topicIds" TEXT[],
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "status" "ScheduleStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScheduledPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserFeedPreferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "recencyWeight" INTEGER NOT NULL DEFAULT 50,
    "engagementWeight" INTEGER NOT NULL DEFAULT 50,
    "followingRatio" INTEGER NOT NULL DEFAULT 70,
    "contentTypes" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserFeedPreferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationPreferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pushEnabled" BOOLEAN NOT NULL DEFAULT true,
    "emailDigest" TEXT NOT NULL DEFAULT 'daily',
    "quietHoursFrom" TEXT,
    "quietHoursTo" TEXT,
    "quietTimezone" TEXT,
    "channels" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "NotificationPreferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostAnalytics" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "comments" INTEGER NOT NULL DEFAULT 0,
    "shares" INTEGER NOT NULL DEFAULT 0,
    "saves" INTEGER NOT NULL DEFAULT 0,
    "avgViewSec" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "date" DATE NOT NULL,

    CONSTRAINT "PostAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_username_idx" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_token_idx" ON "Session"("token");

-- CreateIndex
CREATE UNIQUE INDEX "TwoFactorChallenge_token_key" ON "TwoFactorChallenge"("token");

-- CreateIndex
CREATE INDEX "TwoFactorChallenge_token_idx" ON "TwoFactorChallenge"("token");

-- CreateIndex
CREATE INDEX "TwoFactorChallenge_userId_idx" ON "TwoFactorChallenge"("userId");

-- CreateIndex
CREATE INDEX "OAuthAccount_userId_idx" ON "OAuthAccount"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "OAuthAccount_provider_providerId_key" ON "OAuthAccount"("provider", "providerId");

-- CreateIndex
CREATE INDEX "Moment_userId_idx" ON "Moment"("userId");

-- CreateIndex
CREATE INDEX "Moment_expiresAt_idx" ON "Moment"("expiresAt");

-- CreateIndex
CREATE INDEX "Moment_createdAt_idx" ON "Moment"("createdAt");

-- CreateIndex
CREATE INDEX "MomentView_momentId_idx" ON "MomentView"("momentId");

-- CreateIndex
CREATE INDEX "MomentView_userId_idx" ON "MomentView"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MomentView_momentId_userId_key" ON "MomentView"("momentId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "LiveStream_streamKey_key" ON "LiveStream"("streamKey");

-- CreateIndex
CREATE INDEX "LiveStream_userId_idx" ON "LiveStream"("userId");

-- CreateIndex
CREATE INDEX "LiveStream_status_idx" ON "LiveStream"("status");

-- CreateIndex
CREATE INDEX "LiveStream_startedAt_idx" ON "LiveStream"("startedAt");

-- CreateIndex
CREATE INDEX "LiveStreamChat_streamId_idx" ON "LiveStreamChat"("streamId");

-- CreateIndex
CREATE INDEX "LiveStreamChat_userId_idx" ON "LiveStreamChat"("userId");

-- CreateIndex
CREATE INDEX "LiveStreamChat_createdAt_idx" ON "LiveStreamChat"("createdAt");

-- CreateIndex
CREATE INDEX "Follow_followerId_idx" ON "Follow"("followerId");

-- CreateIndex
CREATE INDEX "Follow_followingId_idx" ON "Follow"("followingId");

-- CreateIndex
CREATE UNIQUE INDEX "Follow_followerId_followingId_key" ON "Follow"("followerId", "followingId");

-- CreateIndex
CREATE INDEX "Post_userId_idx" ON "Post"("userId");

-- CreateIndex
CREATE INDEX "Post_communityId_idx" ON "Post"("communityId");

-- CreateIndex
CREATE INDEX "Post_createdAt_idx" ON "Post"("createdAt");

-- CreateIndex
CREATE INDEX "Post_isPublic_createdAt_isPinned_idx" ON "Post"("isPublic", "createdAt" DESC, "isPinned");

-- CreateIndex
CREATE INDEX "Post_isPublic_isPinned_createdAt_idx" ON "Post"("isPublic", "isPinned", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Post_deletedAt_idx" ON "Post"("deletedAt");

-- CreateIndex
CREATE INDEX "Music_title_idx" ON "Music"("title");

-- CreateIndex
CREATE INDEX "Music_artist_idx" ON "Music"("artist");

-- CreateIndex
CREATE INDEX "Comment_postId_idx" ON "Comment"("postId");

-- CreateIndex
CREATE INDEX "Comment_userId_idx" ON "Comment"("userId");

-- CreateIndex
CREATE INDEX "Comment_parentId_idx" ON "Comment"("parentId");

-- CreateIndex
CREATE INDEX "Comment_postId_parentId_createdAt_idx" ON "Comment"("postId", "parentId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Like_postId_idx" ON "Like"("postId");

-- CreateIndex
CREATE INDEX "Like_userId_idx" ON "Like"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Like_userId_postId_key" ON "Like"("userId", "postId");

-- CreateIndex
CREATE INDEX "Share_postId_idx" ON "Share"("postId");

-- CreateIndex
CREATE INDEX "Save_userId_idx" ON "Save"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Save_userId_postId_key" ON "Save"("userId", "postId");

-- CreateIndex
CREATE INDEX "PostRSVP_postId_idx" ON "PostRSVP"("postId");

-- CreateIndex
CREATE UNIQUE INDEX "PostRSVP_userId_postId_key" ON "PostRSVP"("userId", "postId");

-- CreateIndex
CREATE UNIQUE INDEX "Hashtag_name_key" ON "Hashtag"("name");

-- CreateIndex
CREATE INDEX "Hashtag_name_idx" ON "Hashtag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "PostHashtag_postId_hashtagId_key" ON "PostHashtag"("postId", "hashtagId");

-- CreateIndex
CREATE UNIQUE INDEX "Community_name_key" ON "Community"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Community_slug_key" ON "Community"("slug");

-- CreateIndex
CREATE INDEX "Community_name_idx" ON "Community"("name");

-- CreateIndex
CREATE INDEX "Community_slug_idx" ON "Community"("slug");

-- CreateIndex
CREATE INDEX "Proposal_communityId_status_idx" ON "Proposal"("communityId", "status");

-- CreateIndex
CREATE INDEX "ProposalVote_userId_idx" ON "ProposalVote"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ProposalVote_proposalId_userId_key" ON "ProposalVote"("proposalId", "userId");

-- CreateIndex
CREATE INDEX "ModerationLog_communityId_createdAt_idx" ON "ModerationLog"("communityId", "createdAt");

-- CreateIndex
CREATE INDEX "ModerationLog_moderatorId_idx" ON "ModerationLog"("moderatorId");

-- CreateIndex
CREATE INDEX "CommunityMember_communityId_idx" ON "CommunityMember"("communityId");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityMember_userId_communityId_key" ON "CommunityMember"("userId", "communityId");

-- CreateIndex
CREATE INDEX "CommunityRule_communityId_idx" ON "CommunityRule"("communityId");

-- CreateIndex
CREATE INDEX "ConversationParticipant_userId_idx" ON "ConversationParticipant"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ConversationParticipant_conversationId_userId_key" ON "ConversationParticipant"("conversationId", "userId");

-- CreateIndex
CREATE INDEX "Message_conversationId_idx" ON "Message"("conversationId");

-- CreateIndex
CREATE INDEX "Message_senderId_idx" ON "Message"("senderId");

-- CreateIndex
CREATE INDEX "Message_createdAt_idx" ON "Message"("createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_createdAt_idx" ON "Notification"("userId", "isRead", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Notification_actorId_idx" ON "Notification"("actorId");

-- CreateIndex
CREATE INDEX "Migration_userId_idx" ON "Migration"("userId");

-- CreateIndex
CREATE INDEX "Migration_status_idx" ON "Migration"("status");

-- CreateIndex
CREATE INDEX "ImportedPost_migrationId_idx" ON "ImportedPost"("migrationId");

-- CreateIndex
CREATE INDEX "ImportedPost_importStatus_idx" ON "ImportedPost"("importStatus");

-- CreateIndex
CREATE INDEX "PendingConnection_userId_idx" ON "PendingConnection"("userId");

-- CreateIndex
CREATE INDEX "PendingConnection_inviteStatus_idx" ON "PendingConnection"("inviteStatus");

-- CreateIndex
CREATE INDEX "PendingConnection_originalUsername_idx" ON "PendingConnection"("originalUsername");

-- CreateIndex
CREATE UNIQUE INDEX "Invite_referralCode_key" ON "Invite"("referralCode");

-- CreateIndex
CREATE UNIQUE INDEX "Invite_joinedUserId_key" ON "Invite"("joinedUserId");

-- CreateIndex
CREATE INDEX "Invite_senderId_idx" ON "Invite"("senderId");

-- CreateIndex
CREATE INDEX "Invite_referralCode_idx" ON "Invite"("referralCode");

-- CreateIndex
CREATE INDEX "Invite_status_idx" ON "Invite"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Territory_slug_key" ON "Territory"("slug");

-- CreateIndex
CREATE INDEX "Territory_type_idx" ON "Territory"("type");

-- CreateIndex
CREATE INDEX "Territory_tier_idx" ON "Territory"("tier");

-- CreateIndex
CREATE INDEX "Territory_parentId_idx" ON "Territory"("parentId");

-- CreateIndex
CREATE INDEX "Territory_slug_idx" ON "Territory"("slug");

-- CreateIndex
CREATE INDEX "TerritoryMember_userId_idx" ON "TerritoryMember"("userId");

-- CreateIndex
CREATE INDEX "TerritoryMember_territoryId_idx" ON "TerritoryMember"("territoryId");

-- CreateIndex
CREATE UNIQUE INDEX "TerritoryMember_territoryId_userId_key" ON "TerritoryMember"("territoryId", "userId");

-- CreateIndex
CREATE INDEX "TerritoryPost_territoryId_idx" ON "TerritoryPost"("territoryId");

-- CreateIndex
CREATE UNIQUE INDEX "TerritoryPost_territoryId_postId_key" ON "TerritoryPost"("territoryId", "postId");

-- CreateIndex
CREATE INDEX "TerritoryConnection_fromTerritoryId_idx" ON "TerritoryConnection"("fromTerritoryId");

-- CreateIndex
CREATE INDEX "TerritoryConnection_toTerritoryId_idx" ON "TerritoryConnection"("toTerritoryId");

-- CreateIndex
CREATE UNIQUE INDEX "TerritoryConnection_fromTerritoryId_toTerritoryId_key" ON "TerritoryConnection"("fromTerritoryId", "toTerritoryId");

-- CreateIndex
CREATE UNIQUE INDEX "TerritoryAlgorithmSettings_territoryId_key" ON "TerritoryAlgorithmSettings"("territoryId");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityEncryption_territoryId_key" ON "CommunityEncryption"("territoryId");

-- CreateIndex
CREATE INDEX "TerritoryFeedCache_territoryId_idx" ON "TerritoryFeedCache"("territoryId");

-- CreateIndex
CREATE INDEX "TerritoryFeedCache_expiresAt_idx" ON "TerritoryFeedCache"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "TerritoryFeedCache_territoryId_userId_feedSignature_key" ON "TerritoryFeedCache"("territoryId", "userId", "feedSignature");

-- CreateIndex
CREATE INDEX "TerritoryModerationRule_territoryId_idx" ON "TerritoryModerationRule"("territoryId");

-- CreateIndex
CREATE INDEX "TerritoryStrike_territoryId_idx" ON "TerritoryStrike"("territoryId");

-- CreateIndex
CREATE INDEX "TerritoryStrike_userId_idx" ON "TerritoryStrike"("userId");

-- CreateIndex
CREATE INDEX "GeoBlock_countryCode_idx" ON "GeoBlock"("countryCode");

-- CreateIndex
CREATE INDEX "GeoBlock_territoryId_idx" ON "GeoBlock"("territoryId");

-- CreateIndex
CREATE UNIQUE INDEX "GeoBlock_territoryId_countryCode_key" ON "GeoBlock"("territoryId", "countryCode");

-- CreateIndex
CREATE UNIQUE INDEX "ContentModerationSettings_territoryId_key" ON "ContentModerationSettings"("territoryId");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformSecurityPolicy_name_key" ON "PlatformSecurityPolicy"("name");

-- CreateIndex
CREATE INDEX "PlatformSecurityPolicy_type_idx" ON "PlatformSecurityPolicy"("type");

-- CreateIndex
CREATE INDEX "PlatformSecurityPolicy_isActive_idx" ON "PlatformSecurityPolicy"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "BlockedIP_ipAddress_key" ON "BlockedIP"("ipAddress");

-- CreateIndex
CREATE INDEX "BlockedIP_expiresAt_idx" ON "BlockedIP"("expiresAt");

-- CreateIndex
CREATE INDEX "SecurityAuditLog_userId_idx" ON "SecurityAuditLog"("userId");

-- CreateIndex
CREATE INDEX "SecurityAuditLog_action_idx" ON "SecurityAuditLog"("action");

-- CreateIndex
CREATE INDEX "SecurityAuditLog_createdAt_idx" ON "SecurityAuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "SecurityAuditLog_ipAddress_idx" ON "SecurityAuditLog"("ipAddress");

-- CreateIndex
CREATE INDEX "BulletinPost_type_idx" ON "BulletinPost"("type");

-- CreateIndex
CREATE INDEX "BulletinPost_category_idx" ON "BulletinPost"("category");

-- CreateIndex
CREATE INDEX "BulletinPost_authorId_idx" ON "BulletinPost"("authorId");

-- CreateIndex
CREATE INDEX "BulletinPost_createdAt_idx" ON "BulletinPost"("createdAt");

-- CreateIndex
CREATE INDEX "BulletinPost_isPinned_idx" ON "BulletinPost"("isPinned");

-- CreateIndex
CREATE INDEX "BulletinComment_bulletinId_idx" ON "BulletinComment"("bulletinId");

-- CreateIndex
CREATE INDEX "BulletinComment_authorId_idx" ON "BulletinComment"("authorId");

-- CreateIndex
CREATE INDEX "BulletinComment_createdAt_idx" ON "BulletinComment"("createdAt");

-- CreateIndex
CREATE INDEX "BulletinVote_bulletinId_idx" ON "BulletinVote"("bulletinId");

-- CreateIndex
CREATE INDEX "BulletinVote_userId_idx" ON "BulletinVote"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BulletinVote_bulletinId_userId_key" ON "BulletinVote"("bulletinId", "userId");

-- CreateIndex
CREATE INDEX "LiveStreamSuggestion_status_idx" ON "LiveStreamSuggestion"("status");

-- CreateIndex
CREATE INDEX "LiveStreamSuggestion_platformType_idx" ON "LiveStreamSuggestion"("platformType");

-- CreateIndex
CREATE INDEX "LiveStreamSuggestion_suggestedById_idx" ON "LiveStreamSuggestion"("suggestedById");

-- CreateIndex
CREATE INDEX "LiveStreamSuggestion_createdAt_idx" ON "LiveStreamSuggestion"("createdAt");

-- CreateIndex
CREATE INDEX "StreamVote_suggestionId_idx" ON "StreamVote"("suggestionId");

-- CreateIndex
CREATE INDEX "StreamVote_userId_idx" ON "StreamVote"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "StreamVote_suggestionId_userId_key" ON "StreamVote"("suggestionId", "userId");

-- CreateIndex
CREATE INDEX "ConnectionRequest_senderId_idx" ON "ConnectionRequest"("senderId");

-- CreateIndex
CREATE INDEX "ConnectionRequest_receiverId_idx" ON "ConnectionRequest"("receiverId");

-- CreateIndex
CREATE INDEX "ConnectionRequest_status_idx" ON "ConnectionRequest"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ConnectionRequest_senderId_receiverId_key" ON "ConnectionRequest"("senderId", "receiverId");

-- CreateIndex
CREATE UNIQUE INDEX "UserConnectionSettings_userId_key" ON "UserConnectionSettings"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserPresence_userId_key" ON "UserPresence"("userId");

-- CreateIndex
CREATE INDEX "UserPresence_isOnline_idx" ON "UserPresence"("isOnline");

-- CreateIndex
CREATE INDEX "UserPresence_lastSeenAt_idx" ON "UserPresence"("lastSeenAt");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_userId_key" ON "Subscription"("userId");

-- CreateIndex
CREATE INDEX "Subscription_stripeCustomerId_idx" ON "Subscription"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");

-- CreateIndex
CREATE INDEX "Report_status_idx" ON "Report"("status");

-- CreateIndex
CREATE INDEX "Report_targetType_idx" ON "Report"("targetType");

-- CreateIndex
CREATE INDEX "Report_createdAt_idx" ON "Report"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Topic_slug_key" ON "Topic"("slug");

-- CreateIndex
CREATE INDEX "Topic_slug_idx" ON "Topic"("slug");

-- CreateIndex
CREATE INDEX "Topic_postCount_idx" ON "Topic"("postCount");

-- CreateIndex
CREATE INDEX "PostTopic_postId_idx" ON "PostTopic"("postId");

-- CreateIndex
CREATE INDEX "PostTopic_topicId_idx" ON "PostTopic"("topicId");

-- CreateIndex
CREATE UNIQUE INDEX "PostTopic_postId_topicId_key" ON "PostTopic"("postId", "topicId");

-- CreateIndex
CREATE INDEX "UserInterest_userId_idx" ON "UserInterest"("userId");

-- CreateIndex
CREATE INDEX "UserInterest_topicId_idx" ON "UserInterest"("topicId");

-- CreateIndex
CREATE INDEX "UserInterest_level_idx" ON "UserInterest"("level");

-- CreateIndex
CREATE UNIQUE INDEX "UserInterest_userId_topicId_key" ON "UserInterest"("userId", "topicId");

-- CreateIndex
CREATE UNIQUE INDEX "UserKeyBundle_userId_key" ON "UserKeyBundle"("userId");

-- CreateIndex
CREATE INDEX "UserKeyBundle_userId_idx" ON "UserKeyBundle"("userId");

-- CreateIndex
CREATE INDEX "ScheduledPost_userId_status_idx" ON "ScheduledPost"("userId", "status");

-- CreateIndex
CREATE INDEX "ScheduledPost_scheduledFor_status_idx" ON "ScheduledPost"("scheduledFor", "status");

-- CreateIndex
CREATE UNIQUE INDEX "UserFeedPreferences_userId_key" ON "UserFeedPreferences"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreferences_userId_key" ON "NotificationPreferences"("userId");

-- CreateIndex
CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");

-- CreateIndex
CREATE INDEX "PostAnalytics_postId_idx" ON "PostAnalytics"("postId");

-- CreateIndex
CREATE INDEX "PostAnalytics_date_idx" ON "PostAnalytics"("date");

-- CreateIndex
CREATE UNIQUE INDEX "PostAnalytics_postId_date_key" ON "PostAnalytics"("postId", "date");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TwoFactorChallenge" ADD CONSTRAINT "TwoFactorChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OAuthAccount" ADD CONSTRAINT "OAuthAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Moment" ADD CONSTRAINT "Moment_musicId_fkey" FOREIGN KEY ("musicId") REFERENCES "Music"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Moment" ADD CONSTRAINT "Moment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MomentView" ADD CONSTRAINT "MomentView_momentId_fkey" FOREIGN KEY ("momentId") REFERENCES "Moment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MomentView" ADD CONSTRAINT "MomentView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveStream" ADD CONSTRAINT "LiveStream_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveStreamChat" ADD CONSTRAINT "LiveStreamChat_streamId_fkey" FOREIGN KEY ("streamId") REFERENCES "LiveStream"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveStreamChat" ADD CONSTRAINT "LiveStreamChat_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_musicId_fkey" FOREIGN KEY ("musicId") REFERENCES "Music"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Like" ADD CONSTRAINT "Like_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Like" ADD CONSTRAINT "Like_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Share" ADD CONSTRAINT "Share_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Share" ADD CONSTRAINT "Share_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Save" ADD CONSTRAINT "Save_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Save" ADD CONSTRAINT "Save_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostRSVP" ADD CONSTRAINT "PostRSVP_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostRSVP" ADD CONSTRAINT "PostRSVP_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostHashtag" ADD CONSTRAINT "PostHashtag_hashtagId_fkey" FOREIGN KEY ("hashtagId") REFERENCES "Hashtag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostHashtag" ADD CONSTRAINT "PostHashtag_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Community" ADD CONSTRAINT "Community_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposalVote" ADD CONSTRAINT "ProposalVote_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModerationLog" ADD CONSTRAINT "ModerationLog_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityMember" ADD CONSTRAINT "CommunityMember_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityMember" ADD CONSTRAINT "CommunityMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityRule" ADD CONSTRAINT "CommunityRule_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Migration" ADD CONSTRAINT "Migration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportedPost" ADD CONSTRAINT "ImportedPost_migrationId_fkey" FOREIGN KEY ("migrationId") REFERENCES "Migration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PendingConnection" ADD CONSTRAINT "PendingConnection_matchedUserId_fkey" FOREIGN KEY ("matchedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PendingConnection" ADD CONSTRAINT "PendingConnection_migrationId_fkey" FOREIGN KEY ("migrationId") REFERENCES "Migration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PendingConnection" ADD CONSTRAINT "PendingConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_joinedUserId_fkey" FOREIGN KEY ("joinedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Territory" ADD CONSTRAINT "Territory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Territory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TerritoryMember" ADD CONSTRAINT "TerritoryMember_territoryId_fkey" FOREIGN KEY ("territoryId") REFERENCES "Territory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TerritoryPost" ADD CONSTRAINT "TerritoryPost_territoryId_fkey" FOREIGN KEY ("territoryId") REFERENCES "Territory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TerritoryConnection" ADD CONSTRAINT "TerritoryConnection_fromTerritoryId_fkey" FOREIGN KEY ("fromTerritoryId") REFERENCES "Territory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TerritoryConnection" ADD CONSTRAINT "TerritoryConnection_toTerritoryId_fkey" FOREIGN KEY ("toTerritoryId") REFERENCES "Territory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TerritoryAlgorithmSettings" ADD CONSTRAINT "TerritoryAlgorithmSettings_territoryId_fkey" FOREIGN KEY ("territoryId") REFERENCES "Territory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityEncryption" ADD CONSTRAINT "CommunityEncryption_territoryId_fkey" FOREIGN KEY ("territoryId") REFERENCES "Territory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TerritoryFeedCache" ADD CONSTRAINT "TerritoryFeedCache_territoryId_fkey" FOREIGN KEY ("territoryId") REFERENCES "Territory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TerritoryModerationRule" ADD CONSTRAINT "TerritoryModerationRule_territoryId_fkey" FOREIGN KEY ("territoryId") REFERENCES "Territory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TerritoryStrike" ADD CONSTRAINT "TerritoryStrike_territoryId_fkey" FOREIGN KEY ("territoryId") REFERENCES "Territory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeoBlock" ADD CONSTRAINT "GeoBlock_territoryId_fkey" FOREIGN KEY ("territoryId") REFERENCES "Territory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentModerationSettings" ADD CONSTRAINT "ContentModerationSettings_territoryId_fkey" FOREIGN KEY ("territoryId") REFERENCES "Territory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BulletinPost" ADD CONSTRAINT "BulletinPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BulletinComment" ADD CONSTRAINT "BulletinComment_bulletinId_fkey" FOREIGN KEY ("bulletinId") REFERENCES "BulletinPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveStreamSuggestion" ADD CONSTRAINT "LiveStreamSuggestion_suggestedById_fkey" FOREIGN KEY ("suggestedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StreamVote" ADD CONSTRAINT "StreamVote_suggestionId_fkey" FOREIGN KEY ("suggestionId") REFERENCES "LiveStreamSuggestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConnectionRequest" ADD CONSTRAINT "ConnectionRequest_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConnectionRequest" ADD CONSTRAINT "ConnectionRequest_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserConnectionSettings" ADD CONSTRAINT "UserConnectionSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPresence" ADD CONSTRAINT "UserPresence_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostTopic" ADD CONSTRAINT "PostTopic_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostTopic" ADD CONSTRAINT "PostTopic_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserInterest" ADD CONSTRAINT "UserInterest_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserInterest" ADD CONSTRAINT "UserInterest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserKeyBundle" ADD CONSTRAINT "UserKeyBundle_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledPost" ADD CONSTRAINT "ScheduledPost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFeedPreferences" ADD CONSTRAINT "UserFeedPreferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPreferences" ADD CONSTRAINT "NotificationPreferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostAnalytics" ADD CONSTRAINT "PostAnalytics_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

