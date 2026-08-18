-- CreateEnum
CREATE TYPE "EntryPreferenceKind" AS ENUM ('CHARACTER', 'WEAVER');

-- CreateTable
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
CREATE UNIQUE INDEX "EntryPreference_userId_entryKey_key" ON "EntryPreference"("userId", "entryKey");
CREATE INDEX "EntryPreference_userId_pinned_lastUsedAt_idx" ON "EntryPreference"("userId", "pinned", "lastUsedAt");
CREATE INDEX "EntryPreference_worldCharacterId_idx" ON "EntryPreference"("worldCharacterId");
CREATE INDEX "EntryPreference_campaignId_idx" ON "EntryPreference"("campaignId");
CREATE INDEX "EntryPreference_worldId_idx" ON "EntryPreference"("worldId");

-- AddForeignKey
ALTER TABLE "EntryPreference" ADD CONSTRAINT "EntryPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EntryPreference" ADD CONSTRAINT "EntryPreference_worldCharacterId_fkey" FOREIGN KEY ("worldCharacterId") REFERENCES "WorldCharacter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EntryPreference" ADD CONSTRAINT "EntryPreference_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EntryPreference" ADD CONSTRAINT "EntryPreference_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE CASCADE ON UPDATE CASCADE;
