-- CreateEnum
CREATE TYPE "CampaignCapability" AS ENUM ('UPDATE_CURRENT_LOCATION');

-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "currentFocus" TEXT,
ADD COLUMN     "currentLocationId" UUID;

-- AlterTable
ALTER TABLE "CampaignMembership" ADD COLUMN     "capabilities" "CampaignCapability"[] DEFAULT ARRAY[]::"CampaignCapability"[];

-- CreateIndex
CREATE INDEX "Campaign_currentLocationId_idx" ON "Campaign"("currentLocationId");

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_currentLocationId_fkey" FOREIGN KEY ("currentLocationId") REFERENCES "WorldEntity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
