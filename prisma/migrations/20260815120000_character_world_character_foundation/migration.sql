CREATE TABLE "Character" (
    "id" UUID NOT NULL,
    "ownerUserId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "image" TEXT,
    "coreData" JSONB,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Character_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorldCharacter" (
    "id" UUID NOT NULL,
    "characterId" UUID NOT NULL,
    "worldId" UUID NOT NULL,
    "nameOverride" TEXT,
    "worldData" JSONB,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorldCharacter_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Character_ownerUserId_idx" ON "Character"("ownerUserId");
CREATE UNIQUE INDEX "WorldCharacter_characterId_worldId_key" ON "WorldCharacter"("characterId", "worldId");
CREATE INDEX "WorldCharacter_worldId_idx" ON "WorldCharacter"("worldId");

ALTER TABLE "Character" ADD CONSTRAINT "Character_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorldCharacter" ADD CONSTRAINT "WorldCharacter_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorldCharacter" ADD CONSTRAINT "WorldCharacter_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE CASCADE ON UPDATE CASCADE;
