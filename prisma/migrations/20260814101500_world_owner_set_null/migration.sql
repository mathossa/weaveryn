-- DropForeignKey
ALTER TABLE "World" DROP CONSTRAINT "World_ownerId_fkey";

-- AlterTable
ALTER TABLE "World" ALTER COLUMN "ownerId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "World" ADD CONSTRAINT "World_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
