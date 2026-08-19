-- Link each WorldCharacter to at most one WorldEntity in the same World.
-- `worldCharacterWorldId` is an internal integrity field used only by the
-- composite foreign key; the CHECK keeps it equal to the entity's real worldId.
ALTER TABLE "WorldEntity"
ADD COLUMN "worldCharacterId" UUID,
ADD COLUMN "worldCharacterWorldId" UUID;

CREATE UNIQUE INDEX "WorldEntity_worldCharacterId_key"
ON "WorldEntity"("worldCharacterId");

CREATE INDEX "WorldEntity_worldCharacterWorldId_idx"
ON "WorldEntity"("worldCharacterWorldId");

CREATE UNIQUE INDEX "WorldCharacter_id_worldId_key"
ON "WorldCharacter"("id", "worldId");

ALTER TABLE "WorldEntity"
ADD CONSTRAINT "WorldEntity_worldCharacter_same_world_check"
CHECK (
  ("worldCharacterId" IS NULL AND "worldCharacterWorldId" IS NULL)
  OR
  (
    "worldCharacterId" IS NOT NULL
    AND "worldCharacterWorldId" IS NOT NULL
    AND "worldCharacterWorldId" = "worldId"
  )
);

-- Existing WorldCharacters receive a Character-backed WorldEntity representation.
-- The deterministic UUID only seeds this migration; future entities are created by
-- the application service.
INSERT INTO "WorldEntity" (
  "id",
  "worldId",
  "worldCharacterId",
  "worldCharacterWorldId",
  "type",
  "name",
  "description",
  "image",
  "imageFocusX",
  "imageFocusY",
  "data",
  "createdById",
  "visibilityScope",
  "visibilityCampaignId",
  "visibilityUserId",
  "createdAt",
  "updatedAt"
)
SELECT
  md5(wc."id"::text || ':world-character-entity')::uuid,
  wc."worldId",
  wc."id",
  wc."worldId",
  'character',
  COALESCE(NULLIF(wc."nameOverride", ''), c."name"),
  NULL,
  c."image",
  50,
  50,
  '{}'::jsonb,
  c."ownerUserId",
  'WORLD'::"VisibilityScope",
  NULL,
  NULL,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "WorldCharacter" wc
JOIN "Character" c ON c."id" = wc."characterId";

ALTER TABLE "WorldEntity"
ADD CONSTRAINT "WorldEntity_worldCharacterId_worldCharacterWorldId_fkey"
FOREIGN KEY ("worldCharacterId", "worldCharacterWorldId")
REFERENCES "WorldCharacter"("id", "worldId")
ON DELETE CASCADE
ON UPDATE RESTRICT;
