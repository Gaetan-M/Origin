-- Cultural discovery postcards: an optional external image URL per content item
-- (Wikimedia Commons, etc.), plus a new PEOPLE content type for documenting
-- ethnic groups / peoples. Additive + idempotent.

-- 1. External image URL column.
ALTER TABLE "cultural_content" ADD COLUMN IF NOT EXISTS "image_url" VARCHAR(500);

-- 2. New PEOPLE enum value (guarded so re-running is a no-op).
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'cultural_content_type'
      AND e.enumlabel = 'PEOPLE'
  ) THEN
    ALTER TYPE "cultural_content_type" ADD VALUE 'PEOPLE';
  END IF;
END $$;
