-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('ACTIVE', 'ENDED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "Campaign" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "worldId" UUID,
    "ownerId" UUID NOT NULL,
    "timelineId" UUID,
    "currentWorldPosition" DECIMAL(65,30),
    "currentWorldDateLabel" TEXT,
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

-- CreateIndex
CREATE INDEX "Campaign_worldId_idx" ON "Campaign"("worldId");

-- CreateIndex
CREATE INDEX "Campaign_ownerId_idx" ON "Campaign"("ownerId");

-- CreateIndex
CREATE INDEX "Campaign_timelineId_idx" ON "Campaign"("timelineId");

-- CreateIndex
CREATE INDEX "Campaign_worldId_status_idx" ON "Campaign"("worldId", "status");

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_timelineId_fkey" FOREIGN KEY ("timelineId") REFERENCES "WorldTimeline"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
