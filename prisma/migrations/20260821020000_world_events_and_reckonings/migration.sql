-- CreateEnum
CREATE TYPE "ReckoningDirection" AS ENUM ('BEFORE', 'AFTER');

-- CreateTable
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

-- CreateTable
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

-- CreateTable
CREATE TABLE "WorldEventEntity" (
    "worldEventId" UUID NOT NULL,
    "worldEntityId" UUID NOT NULL,
    "role" TEXT,

    CONSTRAINT "WorldEventEntity_pkey" PRIMARY KEY ("worldEventId", "worldEntityId")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorldReckoning_worldId_name_key" ON "WorldReckoning"("worldId", "name");
CREATE INDEX "WorldReckoning_worldId_anchorWorldPosition_idx" ON "WorldReckoning"("worldId", "anchorWorldPosition");
CREATE INDEX "WorldEvent_timelineId_startWorldPosition_idx" ON "WorldEvent"("timelineId", "startWorldPosition");
CREATE INDEX "WorldEvent_startReckoningId_idx" ON "WorldEvent"("startReckoningId");
CREATE INDEX "WorldEvent_endReckoningId_idx" ON "WorldEvent"("endReckoningId");
CREATE INDEX "WorldEventEntity_worldEntityId_idx" ON "WorldEventEntity"("worldEntityId");

-- AddForeignKey
ALTER TABLE "WorldReckoning" ADD CONSTRAINT "WorldReckoning_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorldEvent" ADD CONSTRAINT "WorldEvent_timelineId_fkey" FOREIGN KEY ("timelineId") REFERENCES "WorldTimeline"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorldEvent" ADD CONSTRAINT "WorldEvent_startReckoningId_fkey" FOREIGN KEY ("startReckoningId") REFERENCES "WorldReckoning"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorldEvent" ADD CONSTRAINT "WorldEvent_endReckoningId_fkey" FOREIGN KEY ("endReckoningId") REFERENCES "WorldReckoning"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorldEventEntity" ADD CONSTRAINT "WorldEventEntity_worldEventId_fkey" FOREIGN KEY ("worldEventId") REFERENCES "WorldEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorldEventEntity" ADD CONSTRAINT "WorldEventEntity_worldEntityId_fkey" FOREIGN KEY ("worldEntityId") REFERENCES "WorldEntity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
