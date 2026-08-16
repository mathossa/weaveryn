-- Issue #57 intentionally requires a fresh/reset development database before
-- applying this migration if any existing User row still has username = NULL.
ALTER TABLE "User"
  ALTER COLUMN "username" SET NOT NULL;
