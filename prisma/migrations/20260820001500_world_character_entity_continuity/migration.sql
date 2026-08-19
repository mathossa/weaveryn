-- Preserve the portable Character identity behind a WorldEntity even when a
-- WorldCharacter leaves and its graph node is detached into a Person / NPC.
ALTER TABLE "WorldEntity"
ADD COLUMN "originCharacterId" UUID;

-- Existing Character-backed entities already have enough information to
-- establish their portable Character origin.
UPDATE "WorldEntity" AS entity
SET "originCharacterId" = world_character."characterId"
FROM "WorldCharacter" AS world_character
WHERE entity."worldCharacterId" = world_character."id"
  AND entity."worldCharacterWorldId" = world_character."worldId";

CREATE UNIQUE INDEX "WorldEntity_worldId_originCharacterId_key"
ON "WorldEntity"("worldId", "originCharacterId");

CREATE INDEX "WorldEntity_originCharacterId_idx"
ON "WorldEntity"("originCharacterId");

ALTER TABLE "WorldEntity"
ADD CONSTRAINT "WorldEntity_originCharacterId_fkey"
FOREIGN KEY ("originCharacterId") REFERENCES "Character"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
