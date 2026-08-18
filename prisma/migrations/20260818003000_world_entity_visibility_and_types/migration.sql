-- CreateEnum
CREATE TYPE "VisibilityScope" AS ENUM ('WORLD', 'CAMPAIGN', 'GM', 'PLAYER', 'PRIVATE');

-- AlterTable
ALTER TABLE "WorldEntity"
ADD COLUMN "visibilityScope" "VisibilityScope" NOT NULL DEFAULT 'WORLD',
ADD COLUMN "visibilityCampaignId" UUID,
ADD COLUMN "visibilityUserId" UUID;

-- AlterTable
ALTER TABLE "EntityRelationship"
ADD COLUMN "createdById" UUID,
ADD COLUMN "visibilityScope" "VisibilityScope" NOT NULL DEFAULT 'WORLD',
ADD COLUMN "visibilityCampaignId" UUID,
ADD COLUMN "visibilityUserId" UUID;

-- CreateTable
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

-- CreateIndex
CREATE INDEX "WorldEntity_visibilityCampaignId_idx" ON "WorldEntity"("visibilityCampaignId");
CREATE INDEX "WorldEntity_visibilityUserId_idx" ON "WorldEntity"("visibilityUserId");
CREATE INDEX "WorldEntity_worldId_visibilityScope_idx" ON "WorldEntity"("worldId", "visibilityScope");
CREATE INDEX "EntityRelationship_createdById_idx" ON "EntityRelationship"("createdById");
CREATE INDEX "EntityRelationship_visibilityCampaignId_idx" ON "EntityRelationship"("visibilityCampaignId");
CREATE INDEX "EntityRelationship_visibilityUserId_idx" ON "EntityRelationship"("visibilityUserId");
CREATE INDEX "EntityRelationship_worldId_visibilityScope_idx" ON "EntityRelationship"("worldId", "visibilityScope");
CREATE INDEX "WorldEntityType_worldId_idx" ON "WorldEntityType"("worldId");
CREATE INDEX "WorldEntityType_campaignId_idx" ON "WorldEntityType"("campaignId");
CREATE INDEX "WorldEntityType_createdById_idx" ON "WorldEntityType"("createdById");
CREATE UNIQUE INDEX "WorldEntityType_worldId_scopeKey_normalizedName_key" ON "WorldEntityType"("worldId", "scopeKey", "normalizedName");

-- AddForeignKey
ALTER TABLE "WorldEntity" ADD CONSTRAINT "WorldEntity_visibilityCampaignId_fkey" FOREIGN KEY ("visibilityCampaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WorldEntity" ADD CONSTRAINT "WorldEntity_visibilityUserId_fkey" FOREIGN KEY ("visibilityUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EntityRelationship" ADD CONSTRAINT "EntityRelationship_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EntityRelationship" ADD CONSTRAINT "EntityRelationship_visibilityCampaignId_fkey" FOREIGN KEY ("visibilityCampaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EntityRelationship" ADD CONSTRAINT "EntityRelationship_visibilityUserId_fkey" FOREIGN KEY ("visibilityUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WorldEntityType" ADD CONSTRAINT "WorldEntityType_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorldEntityType" ADD CONSTRAINT "WorldEntityType_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorldEntityType" ADD CONSTRAINT "WorldEntityType_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
