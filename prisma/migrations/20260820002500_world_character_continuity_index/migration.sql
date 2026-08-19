-- The portable Character origin is provenance, not a hard uniqueness boundary.
-- Legacy data may temporarily contain more than one detached entity for the same
-- Character in one World. Application logic detects that ambiguity explicitly
-- instead of making unrelated lifecycle operations fail with a database error.
DROP INDEX IF EXISTS "WorldEntity_worldId_originCharacterId_key";

CREATE INDEX IF NOT EXISTS "WorldEntity_worldId_originCharacterId_idx"
ON "WorldEntity"("worldId", "originCharacterId");
