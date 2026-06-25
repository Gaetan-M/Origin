-- ============================================
-- Visibility scope model (additive, safe)
-- Adds the VisibilityScope enum and visibility columns to the
-- user-generated content tables (sources, media). Existing rows backfill
-- to PRIVATE_SELF via the column default. visible_max_degree is only
-- meaningful when visibility_scope = 'FAMILY' and stays NULL otherwise.
-- ============================================

-- Enum (guarded so re-runs / partially-applied states are safe)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'visibility_scope') THEN
    CREATE TYPE "visibility_scope" AS ENUM ('PRIVATE_SELF', 'FAMILY', 'PUBLIC');
  END IF;
END
$$;

-- sources: visibility columns (existing rows default to PRIVATE_SELF)
ALTER TABLE "sources"
  ADD COLUMN IF NOT EXISTS "visibility_scope" "visibility_scope" NOT NULL DEFAULT 'PRIVATE_SELF',
  ADD COLUMN IF NOT EXISTS "visible_max_degree" INT;

-- media: visibility columns (existing rows default to PRIVATE_SELF)
ALTER TABLE "media"
  ADD COLUMN IF NOT EXISTS "visibility_scope" "visibility_scope" NOT NULL DEFAULT 'PRIVATE_SELF',
  ADD COLUMN IF NOT EXISTS "visible_max_degree" INT;
