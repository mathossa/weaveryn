-- CreateEnum
CREATE TYPE "MembershipInvitationKind" AS ENUM ('WORLD', 'CAMPAIGN');

-- CreateTable
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

-- CreateIndex
CREATE UNIQUE INDEX "MembershipInvitation_tokenHash_key" ON "MembershipInvitation"("tokenHash");

-- CreateIndex
CREATE INDEX "MembershipInvitation_worldId_expiresAt_idx" ON "MembershipInvitation"("worldId", "expiresAt");

-- CreateIndex
CREATE INDEX "MembershipInvitation_campaignId_expiresAt_idx" ON "MembershipInvitation"("campaignId", "expiresAt");

-- CreateIndex
CREATE INDEX "MembershipInvitation_createdById_idx" ON "MembershipInvitation"("createdById");

-- CreateIndex
CREATE INDEX "MembershipInvitation_acceptedById_idx" ON "MembershipInvitation"("acceptedById");

-- CreateIndex
CREATE INDEX "MembershipInvitation_expiresAt_idx" ON "MembershipInvitation"("expiresAt");

-- AddForeignKey
ALTER TABLE "MembershipInvitation" ADD CONSTRAINT "MembershipInvitation_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipInvitation" ADD CONSTRAINT "MembershipInvitation_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipInvitation" ADD CONSTRAINT "MembershipInvitation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipInvitation" ADD CONSTRAINT "MembershipInvitation_acceptedById_fkey" FOREIGN KEY ("acceptedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
