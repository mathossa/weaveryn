-- Weaveryn pre-0.1.0 audited baseline.
--
-- This migration is intentionally a clean-install baseline for an empty
-- PostgreSQL database before the first stable release. Historical development
-- data backfills are intentionally omitted. Database-only integrity CHECKs that
-- Prisma cannot represent in schema.prisma are preserved explicitly below.

-- CreateEnum
CREATE TYPE "WorldRole" AS ENUM ('ADMIN', 'MEMBER', 'VIEWER');
CREATE TYPE "CampaignStatus" AS ENUM ('ACTIVE', 'ENDED', 'ARCHIVED');
CREATE TYPE "CampaignRole" AS ENUM ('GM', 'ASSISTANT_GM', 'PLAYER', 'SPECTATOR');
CREATE TYPE "CampaignCapability" AS ENUM ('UPDATE_CURRENT_LOCATION');
CREATE TYPE "VisibilityScope" AS ENUM ('WORLD', 'CAMPAIGN', 'GM', 'PLAYER', 'PRIVATE');
CREATE TYPE "EntryPreferenceKind" AS ENUM ('CHARACTER', 'WEAVER');
CREATE TYPE "MembershipInvitationKind" AS ENUM ('WORLD', 'CAMPAIGN');
CREATE TYPE "ReckoningDirection" AS ENUM ('BEFORE', 'AFTER');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "username" TEXT NOT NULL,
    "displayName" TEXT,
    "image" TEXT,
    "isInstanceAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuthSession" (
    "id" UUID NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" UUID NOT NULL,

    CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuthAccount" (
    "id" UUID NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuthVerification" (
    "id" UUID NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthVerification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "World" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "ownerId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "World_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Character" (
    "id" UUID NOT NULL,
    "ownerUserId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "image" TEXT,
    "coreData" JSONB,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Character_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorldCharacter" (
    "id" UUID NOT NULL,
    "characterId" UUID NOT NULL,
    "worldId" UUID NOT NULL,
    "nameOverride" TEXT,
    "worldData" JSONB,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorldCharacter_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorldTimeline" (
    "id" UUID NOT NULL,
    "worldId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorldTimeline_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorldReckoning" (
    "id" UUID NOT NULL,
    "worldId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "anchorWorldPosition" DECIMAL(65,30) NOT NULL,
    "anchorWorldDateLabel" TEXT NOT NULL,
    "beforeLabel" TEXT NOT NULL,
    "beforeAbbreviation" TEXT,
    "afterLabel" TEXT NOT NULL,
    "afterAbbreviation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorldReckoning_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorldEvent" (
    "id" UUID NOT NULL,
    "timelineId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startWorldPosition" DECIMAL(65,30) NOT NULL,
    "endWorldPosition" DECIMAL(65,30),
    "startWorldDateLabel" TEXT NOT NULL,
    "endWorldDateLabel" TEXT,
    "startReckoningId" UUID,
    "startReckoningDirection" "ReckoningDirection",
    "endReckoningId" UUID,
    "endReckoningDirection" "ReckoningDirection",
    "type" TEXT NOT NULL DEFAULT 'event',
    "data" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorldEvent_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "WorldEvent_end_not_before_start_check" CHECK ("endWorldPosition" IS NULL OR "endWorldPosition" >= "startWorldPosition"),
    CONSTRAINT "WorldEvent_start_reckoning_pair_check" CHECK (("startReckoningId" IS NULL) = ("startReckoningDirection" IS NULL)),
    CONSTRAINT "WorldEvent_end_reckoning_pair_check" CHECK (("endReckoningId" IS NULL) = ("endReckoningDirection" IS NULL)),
    CONSTRAINT "WorldEvent_end_date_pair_check" CHECK (("endWorldPosition" IS NULL AND "endWorldDateLabel" IS NULL AND "endReckoningId" IS NULL AND "endReckoningDirection" IS NULL) OR ("endWorldPosition" IS NOT NULL AND "endWorldDateLabel" IS NOT NULL))
);

CREATE TABLE "WorldMembership" (
    "id" UUID NOT NULL,
    "worldId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "WorldRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorldMembership_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Campaign" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "worldId" UUID,
    "ownerId" UUID NOT NULL,
    "timelineId" UUID,
    "currentWorldPosition" DECIMAL(65,30),
    "currentWorldDateLabel" TEXT,
    "currentLocationId" UUID,
    "currentFocus" TEXT,
    "archivedWorldSnapshot" JSONB,
    "status" "CampaignStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Campaign_active_context_check" CHECK (
        "status" <> 'ACTIVE'
        OR (
            "worldId" IS NOT NULL
            AND "timelineId" IS NOT NULL
            AND "currentWorldPosition" IS NOT NULL
            AND "currentWorldDateLabel" IS NOT NULL
        )
    )
);

CREATE TABLE "CampaignMembership" (
    "id" UUID NOT NULL,
    "campaignId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "CampaignRole" NOT NULL,
    "capabilities" "CampaignCapability"[] DEFAULT ARRAY[]::"CampaignCapability"[],
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignMembership_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorldEntity" (
    "id" UUID NOT NULL,
    "worldId" UUID NOT NULL,
    "worldCharacterId" UUID,
    "worldCharacterWorldId" UUID,
    "originCharacterId" UUID,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "image" TEXT,
    "imageFocusX" INTEGER NOT NULL DEFAULT 50,
    "imageFocusY" INTEGER NOT NULL DEFAULT 50,
    "data" JSONB NOT NULL DEFAULT '{}',
    "createdById" UUID,
    "visibilityScope" "VisibilityScope" NOT NULL DEFAULT 'WORLD',
    "visibilityCampaignId" UUID,
    "visibilityUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorldEntity_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "WorldEntity_worldCharacter_same_world_check" CHECK (
      ("worldCharacterId" IS NULL AND "worldCharacterWorldId" IS NULL)
      OR
      (
        "worldCharacterId" IS NOT NULL
        AND "worldCharacterWorldId" IS NOT NULL
        AND "worldCharacterWorldId" = "worldId"
      )
    ),
    CONSTRAINT "WorldEntity_image_focus_x_check" CHECK ("imageFocusX" BETWEEN 0 AND 100),
    CONSTRAINT "WorldEntity_image_focus_y_check" CHECK ("imageFocusY" BETWEEN 0 AND 100)
);

CREATE TABLE "EntityRelationship" (
    "id" UUID NOT NULL,
    "worldId" UUID NOT NULL,
    "sourceEntityId" UUID NOT NULL,
    "targetEntityId" UUID NOT NULL,
    "relationshipType" TEXT NOT NULL,
    "label" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdById" UUID,
    "visibilityScope" "VisibilityScope" NOT NULL DEFAULT 'WORLD',
    "visibilityCampaignId" UUID,
    "visibilityUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EntityRelationship_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorldEntityType" (
    "id" UUID NOT NULL,
    "worldId" UUID NOT NULL,
    "campaignId" UUID,
    "scopeKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorldEntityType_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorldEventEntity" (
    "worldEventId" UUID NOT NULL,
    "worldEntityId" UUID NOT NULL,
    "role" TEXT,

    CONSTRAINT "WorldEventEntity_pkey" PRIMARY KEY ("worldEventId", "worldEntityId")
);

CREATE TABLE "MembershipInvitation" (
    "id" UUID NOT NULL,
    "kind" "MembershipInvitationKind" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "worldId" UUID,
    "campaignId" UUID,
    "worldRole" "WorldRole",
    "campaignRole" "CampaignRole",
    "createdById" UUID NOT NULL,
    "acceptedById" UUID,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MembershipInvitation_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "MembershipInvitation_target_role_check" CHECK (
      (
        "kind" = 'WORLD'::"MembershipInvitationKind"
        AND "worldId" IS NOT NULL
        AND "campaignId" IS NULL
        AND "worldRole" IS NOT NULL
        AND "campaignRole" IS NULL
      )
      OR
      (
        "kind" = 'CAMPAIGN'::"MembershipInvitationKind"
        AND "worldId" IS NULL
        AND "campaignId" IS NOT NULL
        AND "worldRole" IS NULL
        AND "campaignRole" IS NOT NULL
      )
    )
);

CREATE TABLE "CampaignCharacter" (
    "id" UUID NOT NULL,
    "worldCharacterId" UUID NOT NULL,
    "campaignId" UUID NOT NULL,
    "sheetData" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignCharacter_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EntryPreference" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "entryKey" TEXT NOT NULL,
    "kind" "EntryPreferenceKind" NOT NULL,
    "worldCharacterId" UUID,
    "campaignId" UUID,
    "worldId" UUID,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EntryPreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX "AuthSession_token_key" ON "AuthSession"("token");
CREATE INDEX "AuthSession_userId_idx" ON "AuthSession"("userId");
CREATE UNIQUE INDEX "AuthAccount_providerId_accountId_key" ON "AuthAccount"("providerId", "accountId");
CREATE INDEX "AuthAccount_userId_idx" ON "AuthAccount"("userId");
CREATE INDEX "AuthVerification_identifier_idx" ON "AuthVerification"("identifier");
CREATE INDEX "World_ownerId_idx" ON "World"("ownerId");
CREATE INDEX "Character_ownerUserId_idx" ON "Character"("ownerUserId");
CREATE UNIQUE INDEX "WorldCharacter_characterId_worldId_key" ON "WorldCharacter"("characterId", "worldId");
CREATE UNIQUE INDEX "WorldCharacter_id_worldId_key" ON "WorldCharacter"("id", "worldId");
CREATE INDEX "WorldCharacter_worldId_idx" ON "WorldCharacter"("worldId");
CREATE INDEX "WorldTimeline_worldId_idx" ON "WorldTimeline"("worldId");
CREATE UNIQUE INDEX "WorldReckoning_worldId_name_key" ON "WorldReckoning"("worldId", "name");
CREATE INDEX "WorldReckoning_worldId_anchorWorldPosition_idx" ON "WorldReckoning"("worldId", "anchorWorldPosition");
CREATE INDEX "WorldEvent_timelineId_startWorldPosition_idx" ON "WorldEvent"("timelineId", "startWorldPosition");
CREATE INDEX "WorldEvent_startReckoningId_idx" ON "WorldEvent"("startReckoningId");
CREATE INDEX "WorldEvent_endReckoningId_idx" ON "WorldEvent"("endReckoningId");
CREATE INDEX "WorldMembership_userId_idx" ON "WorldMembership"("userId");
CREATE UNIQUE INDEX "WorldMembership_worldId_userId_key" ON "WorldMembership"("worldId", "userId");
CREATE INDEX "Campaign_worldId_idx" ON "Campaign"("worldId");
CREATE INDEX "Campaign_ownerId_idx" ON "Campaign"("ownerId");
CREATE INDEX "Campaign_timelineId_idx" ON "Campaign"("timelineId");
CREATE INDEX "Campaign_currentLocationId_idx" ON "Campaign"("currentLocationId");
CREATE INDEX "Campaign_worldId_status_idx" ON "Campaign"("worldId", "status");
CREATE UNIQUE INDEX "CampaignMembership_campaignId_userId_key" ON "CampaignMembership"("campaignId", "userId");
CREATE INDEX "CampaignMembership_userId_idx" ON "CampaignMembership"("userId");
CREATE UNIQUE INDEX "WorldEntity_worldCharacterId_worldCharacterWorldId_key" ON "WorldEntity"("worldCharacterId", "worldCharacterWorldId");
CREATE INDEX "WorldEntity_worldId_idx" ON "WorldEntity"("worldId");
CREATE INDEX "WorldEntity_worldCharacterWorldId_idx" ON "WorldEntity"("worldCharacterWorldId");
CREATE INDEX "WorldEntity_originCharacterId_idx" ON "WorldEntity"("originCharacterId");
CREATE INDEX "WorldEntity_worldId_originCharacterId_idx" ON "WorldEntity"("worldId", "originCharacterId");
CREATE INDEX "WorldEntity_createdById_idx" ON "WorldEntity"("createdById");
CREATE INDEX "WorldEntity_visibilityCampaignId_idx" ON "WorldEntity"("visibilityCampaignId");
CREATE INDEX "WorldEntity_visibilityUserId_idx" ON "WorldEntity"("visibilityUserId");
CREATE INDEX "WorldEntity_worldId_visibilityScope_idx" ON "WorldEntity"("worldId", "visibilityScope");
CREATE INDEX "EntityRelationship_worldId_idx" ON "EntityRelationship"("worldId");
CREATE INDEX "EntityRelationship_sourceEntityId_idx" ON "EntityRelationship"("sourceEntityId");
CREATE INDEX "EntityRelationship_targetEntityId_idx" ON "EntityRelationship"("targetEntityId");
CREATE INDEX "EntityRelationship_createdById_idx" ON "EntityRelationship"("createdById");
CREATE INDEX "EntityRelationship_visibilityCampaignId_idx" ON "EntityRelationship"("visibilityCampaignId");
CREATE INDEX "EntityRelationship_visibilityUserId_idx" ON "EntityRelationship"("visibilityUserId");
CREATE INDEX "EntityRelationship_worldId_visibilityScope_idx" ON "EntityRelationship"("worldId", "visibilityScope");
CREATE UNIQUE INDEX "WorldEntityType_worldId_scopeKey_normalizedName_key" ON "WorldEntityType"("worldId", "scopeKey", "normalizedName");
CREATE INDEX "WorldEntityType_worldId_idx" ON "WorldEntityType"("worldId");
CREATE INDEX "WorldEntityType_campaignId_idx" ON "WorldEntityType"("campaignId");
CREATE INDEX "WorldEntityType_createdById_idx" ON "WorldEntityType"("createdById");
CREATE INDEX "WorldEventEntity_worldEntityId_idx" ON "WorldEventEntity"("worldEntityId");
CREATE UNIQUE INDEX "MembershipInvitation_tokenHash_key" ON "MembershipInvitation"("tokenHash");
CREATE INDEX "MembershipInvitation_worldId_expiresAt_idx" ON "MembershipInvitation"("worldId", "expiresAt");
CREATE INDEX "MembershipInvitation_campaignId_expiresAt_idx" ON "MembershipInvitation"("campaignId", "expiresAt");
CREATE INDEX "MembershipInvitation_createdById_idx" ON "MembershipInvitation"("createdById");
CREATE INDEX "MembershipInvitation_acceptedById_idx" ON "MembershipInvitation"("acceptedById");
CREATE INDEX "MembershipInvitation_expiresAt_idx" ON "MembershipInvitation"("expiresAt");
CREATE UNIQUE INDEX "CampaignCharacter_worldCharacterId_campaignId_key" ON "CampaignCharacter"("worldCharacterId", "campaignId");
CREATE INDEX "CampaignCharacter_campaignId_idx" ON "CampaignCharacter"("campaignId");
CREATE UNIQUE INDEX "EntryPreference_userId_entryKey_key" ON "EntryPreference"("userId", "entryKey");
CREATE INDEX "EntryPreference_userId_pinned_lastUsedAt_idx" ON "EntryPreference"("userId", "pinned", "lastUsedAt");
CREATE INDEX "EntryPreference_worldCharacterId_idx" ON "EntryPreference"("worldCharacterId");
CREATE INDEX "EntryPreference_campaignId_idx" ON "EntryPreference"("campaignId");
CREATE INDEX "EntryPreference_worldId_idx" ON "EntryPreference"("worldId");

-- AddForeignKey
ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuthAccount" ADD CONSTRAINT "AuthAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "World" ADD CONSTRAINT "World_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Character" ADD CONSTRAINT "Character_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorldCharacter" ADD CONSTRAINT "WorldCharacter_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorldCharacter" ADD CONSTRAINT "WorldCharacter_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorldTimeline" ADD CONSTRAINT "WorldTimeline_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorldReckoning" ADD CONSTRAINT "WorldReckoning_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorldEvent" ADD CONSTRAINT "WorldEvent_timelineId_fkey" FOREIGN KEY ("timelineId") REFERENCES "WorldTimeline"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorldEvent" ADD CONSTRAINT "WorldEvent_startReckoningId_fkey" FOREIGN KEY ("startReckoningId") REFERENCES "WorldReckoning"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorldEvent" ADD CONSTRAINT "WorldEvent_endReckoningId_fkey" FOREIGN KEY ("endReckoningId") REFERENCES "WorldReckoning"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorldMembership" ADD CONSTRAINT "WorldMembership_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorldMembership" ADD CONSTRAINT "WorldMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_timelineId_fkey" FOREIGN KEY ("timelineId") REFERENCES "WorldTimeline"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CampaignMembership" ADD CONSTRAINT "CampaignMembership_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CampaignMembership" ADD CONSTRAINT "CampaignMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorldEntity" ADD CONSTRAINT "WorldEntity_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorldEntity" ADD CONSTRAINT "WorldEntity_worldCharacterId_worldCharacterWorldId_fkey" FOREIGN KEY ("worldCharacterId", "worldCharacterWorldId") REFERENCES "WorldCharacter"("id", "worldId") ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE "WorldEntity" ADD CONSTRAINT "WorldEntity_originCharacterId_fkey" FOREIGN KEY ("originCharacterId") REFERENCES "Character"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WorldEntity" ADD CONSTRAINT "WorldEntity_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WorldEntity" ADD CONSTRAINT "WorldEntity_visibilityCampaignId_fkey" FOREIGN KEY ("visibilityCampaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WorldEntity" ADD CONSTRAINT "WorldEntity_visibilityUserId_fkey" FOREIGN KEY ("visibilityUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EntityRelationship" ADD CONSTRAINT "EntityRelationship_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EntityRelationship" ADD CONSTRAINT "EntityRelationship_sourceEntityId_fkey" FOREIGN KEY ("sourceEntityId") REFERENCES "WorldEntity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EntityRelationship" ADD CONSTRAINT "EntityRelationship_targetEntityId_fkey" FOREIGN KEY ("targetEntityId") REFERENCES "WorldEntity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EntityRelationship" ADD CONSTRAINT "EntityRelationship_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EntityRelationship" ADD CONSTRAINT "EntityRelationship_visibilityCampaignId_fkey" FOREIGN KEY ("visibilityCampaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EntityRelationship" ADD CONSTRAINT "EntityRelationship_visibilityUserId_fkey" FOREIGN KEY ("visibilityUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WorldEntityType" ADD CONSTRAINT "WorldEntityType_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorldEntityType" ADD CONSTRAINT "WorldEntityType_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorldEntityType" ADD CONSTRAINT "WorldEntityType_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WorldEventEntity" ADD CONSTRAINT "WorldEventEntity_worldEventId_fkey" FOREIGN KEY ("worldEventId") REFERENCES "WorldEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorldEventEntity" ADD CONSTRAINT "WorldEventEntity_worldEntityId_fkey" FOREIGN KEY ("worldEntityId") REFERENCES "WorldEntity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_currentLocationId_fkey" FOREIGN KEY ("currentLocationId") REFERENCES "WorldEntity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MembershipInvitation" ADD CONSTRAINT "MembershipInvitation_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MembershipInvitation" ADD CONSTRAINT "MembershipInvitation_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MembershipInvitation" ADD CONSTRAINT "MembershipInvitation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MembershipInvitation" ADD CONSTRAINT "MembershipInvitation_acceptedById_fkey" FOREIGN KEY ("acceptedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CampaignCharacter" ADD CONSTRAINT "CampaignCharacter_worldCharacterId_fkey" FOREIGN KEY ("worldCharacterId") REFERENCES "WorldCharacter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CampaignCharacter" ADD CONSTRAINT "CampaignCharacter_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EntryPreference" ADD CONSTRAINT "EntryPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EntryPreference" ADD CONSTRAINT "EntryPreference_worldCharacterId_fkey" FOREIGN KEY ("worldCharacterId") REFERENCES "WorldCharacter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EntryPreference" ADD CONSTRAINT "EntryPreference_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EntryPreference" ADD CONSTRAINT "EntryPreference_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE CASCADE ON UPDATE CASCADE;
