-- ============================================================================
-- HOTFIX — Engagement layer (polymorphic interactions over PUBLIC entities)
-- ----------------------------------------------------------------------------
-- Mirror of prisma/migrations/20260705000000_engagement_layer/migration.sql.
-- Fully IDEMPOTENT: safe to run multiple times in Supabase > SQL Editor.
--
-- Adds: engagement_target_type enum, and the entity_reactions, entity_comments,
-- entity_photos, place_ratings and edit_suggestions tables (reactions, comments,
-- contributed photos [moderated], star ratings [tourism only], edit-suggestions).
--
-- `target_id` is a polymorphic UUID keyed by `target_type` (no FK on it). The
-- account / media / tourism_place references carry real FOREIGN KEYs (guarded).
--
-- NOTE: MediaPurpose.CONTRIBUTED_MEDIA is a TypeScript enum value only — media
-- .file_type is a plain VARCHAR, NOT a Postgres enum, so no DB enum change is
-- required for it.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Enum (guarded)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'engagement_target_type') THEN
    CREATE TYPE "engagement_target_type" AS ENUM ('TOURISM_PLACE', 'CULTURAL_CONTENT');
  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- Table: entity_reactions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "entity_reactions" (
  "id"            UUID                     NOT NULL DEFAULT uuid_generate_v4(),
  "target_type"   "engagement_target_type" NOT NULL,
  "target_id"     UUID                     NOT NULL,
  "account_id"    UUID                     NOT NULL,
  "reaction_type" VARCHAR(30)              NOT NULL,
  "created_at"    TIMESTAMPTZ              NOT NULL DEFAULT NOW(),
  CONSTRAINT "entity_reactions_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'entity_reactions_account_id_fkey') THEN
    ALTER TABLE "entity_reactions"
      ADD CONSTRAINT "entity_reactions_account_id_fkey"
      FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS "uq_entity_reaction" ON "entity_reactions" ("target_type", "target_id", "account_id");
CREATE INDEX IF NOT EXISTS "idx_entity_reactions_target" ON "entity_reactions" ("target_type", "target_id");

-- ---------------------------------------------------------------------------
-- Table: entity_comments
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "entity_comments" (
  "id"          UUID                     NOT NULL DEFAULT uuid_generate_v4(),
  "target_type" "engagement_target_type" NOT NULL,
  "target_id"   UUID                     NOT NULL,
  "account_id"  UUID                     NOT NULL,
  "body"        TEXT                     NOT NULL,
  "created_at"  TIMESTAMPTZ              NOT NULL DEFAULT NOW(),
  "updated_at"  TIMESTAMPTZ              NOT NULL DEFAULT NOW(),
  "deleted_at"  TIMESTAMPTZ,
  CONSTRAINT "entity_comments_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'entity_comments_account_id_fkey') THEN
    ALTER TABLE "entity_comments"
      ADD CONSTRAINT "entity_comments_account_id_fkey"
      FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS "idx_entity_comments_target_created" ON "entity_comments" ("target_type", "target_id", "created_at");

-- ---------------------------------------------------------------------------
-- Table: entity_photos
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "entity_photos" (
  "id"                     UUID                     NOT NULL DEFAULT uuid_generate_v4(),
  "target_type"            "engagement_target_type" NOT NULL,
  "target_id"              UUID                     NOT NULL,
  "account_id"             UUID                     NOT NULL,
  "media_id"               UUID                     NOT NULL,
  "caption"                VARCHAR(300),
  "status"                 VARCHAR(20)              NOT NULL DEFAULT 'PENDING',
  "reviewed_by_account_id" UUID,
  "reviewed_at"            TIMESTAMPTZ,
  "created_at"             TIMESTAMPTZ              NOT NULL DEFAULT NOW(),
  CONSTRAINT "entity_photos_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'entity_photos_account_id_fkey') THEN
    ALTER TABLE "entity_photos"
      ADD CONSTRAINT "entity_photos_account_id_fkey"
      FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'entity_photos_media_id_fkey') THEN
    ALTER TABLE "entity_photos"
      ADD CONSTRAINT "entity_photos_media_id_fkey"
      FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'entity_photos_reviewed_by_account_id_fkey') THEN
    ALTER TABLE "entity_photos"
      ADD CONSTRAINT "entity_photos_reviewed_by_account_id_fkey"
      FOREIGN KEY ("reviewed_by_account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS "idx_entity_photos_target_status" ON "entity_photos" ("target_type", "target_id", "status");

-- ---------------------------------------------------------------------------
-- Table: place_ratings
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "place_ratings" (
  "id"         UUID        NOT NULL DEFAULT uuid_generate_v4(),
  "place_id"   UUID        NOT NULL,
  "account_id" UUID        NOT NULL,
  "stars"      INTEGER     NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "place_ratings_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'place_ratings_place_id_fkey') THEN
    ALTER TABLE "place_ratings"
      ADD CONSTRAINT "place_ratings_place_id_fkey"
      FOREIGN KEY ("place_id") REFERENCES "tourism_places"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'place_ratings_account_id_fkey') THEN
    ALTER TABLE "place_ratings"
      ADD CONSTRAINT "place_ratings_account_id_fkey"
      FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS "uq_place_rating" ON "place_ratings" ("place_id", "account_id");
CREATE INDEX IF NOT EXISTS "idx_place_ratings_place" ON "place_ratings" ("place_id");

-- ---------------------------------------------------------------------------
-- Table: edit_suggestions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "edit_suggestions" (
  "id"                     UUID                     NOT NULL DEFAULT uuid_generate_v4(),
  "target_type"            "engagement_target_type" NOT NULL,
  "target_id"              UUID                     NOT NULL,
  "account_id"             UUID                     NOT NULL,
  "field"                  VARCHAR(60)              NOT NULL,
  "proposed_value"         TEXT                     NOT NULL,
  "note"                   TEXT,
  "status"                 VARCHAR(20)              NOT NULL DEFAULT 'PENDING',
  "reviewed_by_account_id" UUID,
  "reviewed_at"            TIMESTAMPTZ,
  "created_at"             TIMESTAMPTZ              NOT NULL DEFAULT NOW(),
  CONSTRAINT "edit_suggestions_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'edit_suggestions_account_id_fkey') THEN
    ALTER TABLE "edit_suggestions"
      ADD CONSTRAINT "edit_suggestions_account_id_fkey"
      FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'edit_suggestions_reviewed_by_account_id_fkey') THEN
    ALTER TABLE "edit_suggestions"
      ADD CONSTRAINT "edit_suggestions_reviewed_by_account_id_fkey"
      FOREIGN KEY ("reviewed_by_account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS "idx_edit_suggestions_status" ON "edit_suggestions" ("status");
