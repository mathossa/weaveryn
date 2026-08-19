-- Link each WorldCharacter to at most one WorldEntity in the same World.
ALTER TABLE "WorldEntity"
ADD COLUMN "worldCharacterId" UUID;

CREATE UNIQUE INDEX "WorldEntity_worldCharacterId_key"
ON "WorldEntity"("worldCharacterId");

CREATE UNIQUE INDEX "WorldCharacter_id_worldId_key"
ON "WorldCharacter"("id", "worldId");

-- Existing WorldCharacters receive a Character-backed WorldEntity representation.
-- The deterministic UUID only seeds this migration; future entities are created by
-- the application service.
INSERT INTO "WorldEntity" (
  "id",
  "worldId",
  "worldCharacterId",
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
ADD CONSTRAINT "WorldEntity_worldCharacterId_worldId_fkey"
FOREIGN KEY ("worldCharacterId", "worldId")
REFERENCES "WorldCharacter"("id", "worldId")
ON DELETE CASCADE
ON UPDATE RESTRICT;
