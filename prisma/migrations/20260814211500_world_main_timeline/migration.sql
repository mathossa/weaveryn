-- CreateTable
CREATE TABLE "WorldTimeline" (
    "id" UUID NOT NULL,
    "worldId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorldTimeline_pkey" PRIMARY KEY ("id")
);

-- Preserve the invariant for Worlds that existed before timelines were introduced.
INSERT INTO "WorldTimeline" ("id", "worldId", "name", "createdAt", "updatedAt")
SELECT md5("id"::text || ':main-timeline')::uuid, "id", 'Main', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "World";

-- CreateIndex
CREATE INDEX "WorldTimeline_worldId_idx" ON "WorldTimeline"("worldId");

-- AddForeignKey
ALTER TABLE "WorldTimeline" ADD CONSTRAINT "WorldTimeline_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE CASCADE ON UPDATE CASCADE;
