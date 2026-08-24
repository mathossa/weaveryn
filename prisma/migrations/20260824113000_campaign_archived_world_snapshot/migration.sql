-- Preserve the small immutable World context required by detached archived Campaigns.
ALTER TABLE "Campaign"
ADD COLUMN "archivedWorldSnapshot" JSONB;
