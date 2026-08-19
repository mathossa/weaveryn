-- Prisma requires the full defining field set of a one-to-one relation to be unique.
-- Replace the earlier single-column unique index with the compound key used by
-- the WorldCharacter relation.
DROP INDEX IF EXISTS "WorldEntity_worldCharacterId_key";

CREATE UNIQUE INDEX "WorldEntity_worldCharacterId_worldCharacterWorldId_key"
ON "WorldEntity"("worldCharacterId", "worldCharacterWorldId");
