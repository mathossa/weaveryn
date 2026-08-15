-- CreateTable
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

-- CreateIndex
CREATE UNIQUE INDEX "CampaignCharacter_worldCharacterId_campaignId_key" ON "CampaignCharacter"("worldCharacterId", "campaignId");
CREATE INDEX "CampaignCharacter_campaignId_idx" ON "CampaignCharacter"("campaignId");

-- AddForeignKey
ALTER TABLE "CampaignCharacter" ADD CONSTRAINT "CampaignCharacter_worldCharacterId_fkey" FOREIGN KEY ("worldCharacterId") REFERENCES "WorldCharacter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CampaignCharacter" ADD CONSTRAINT "CampaignCharacter_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
