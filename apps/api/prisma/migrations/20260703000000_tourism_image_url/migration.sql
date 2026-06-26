-- Tourism postcards: an optional external image URL per place (Wikimedia Commons,
-- etc.). Additive + idempotent.
ALTER TABLE "tourism_places" ADD COLUMN IF NOT EXISTS "image_url" VARCHAR(500);
