-- CreateEnum
CREATE TYPE "CampaignRole" AS ENUM ('GM', 'ASSISTANT_GM', 'PLAYER', 'SPECTATOR');

-- CreateTable
CREATE TABLE "CampaignMembership" (
    "id" UUID NOT NULL,
    "campaignId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "CampaignRole" NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignMembership_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CampaignMembership_campaignId_userId_key" ON "CampaignMembership"("campaignId", "userId");

-- CreateIndex
CREATE INDEX "CampaignMembership_userId_idx" ON "CampaignMembership"("userId");

-- AddForeignKey
ALTER TABLE "CampaignMembership" ADD CONSTRAINT "CampaignMembership_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignMembership" ADD CONSTRAINT "CampaignMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
