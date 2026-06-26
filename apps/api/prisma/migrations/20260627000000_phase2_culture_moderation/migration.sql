-- Phase 2 — Public Cultural Heritage & Moderation (additive, idempotent-guarded)
-- Adds: cultural_authority_kind, cultural_content_type, moderation_status,
-- moderation_target_type, moderation_report_status enums and the
-- cultural_authorities, cultural_content, moderation_reports tables.
--
-- These models belong to the PUBLIC world and carry NO family-graph data.
-- Cross-aggregate references to accounts/media are enforced here as real
-- FOREIGN KEY constraints (the Prisma schema models them as plain scalar UUID
-- columns to keep the change additive on existing models). moderation_reports
-- target_id is polymorphic (keyed by target_type) and intentionally has no FK.

-- ---------------------------------------------------------------------------
-- Enums (guarded)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cultural_authority_kind') THEN
    CREATE TYPE "cultural_authority_kind" AS ENUM ('CHEFFERIE', 'EXPERT', 'INSTITUTION');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cultural_content_type') THEN
    CREATE TYPE "cultural_content_type" AS ENUM ('LANGUAGE', 'RECIPE', 'TALE', 'PROVERB', 'RITE', 'CUSTOM', 'MUSIC', 'OTHER');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'moderation_status') THEN
    CREATE TYPE "moderation_status" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'moderation_target_type') THEN
    CREATE TYPE "moderation_target_type" AS ENUM ('CULTURAL_CONTENT', 'FEED_POST', 'FEED_COMMENT', 'PERSON');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'moderation_report_status') THEN
    CREATE TYPE "moderation_report_status" AS ENUM ('OPEN', 'REVIEWING', 'RESOLVED', 'DISMISSED');
  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- Table: cultural_authorities
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "cultural_authorities" (
  "id"                      UUID                      NOT NULL DEFAULT uuid_generate_v4(),
  "account_id"              UUID                      NOT NULL,
  "kind"                    "cultural_authority_kind" NOT NULL,
  "display_name"            VARCHAR(255)              NOT NULL,
  "region"                  VARCHAR(100),
  "ethnic_group"            VARCHAR(100),
  "bio"                     TEXT,
  "verified"                BOOLEAN                   NOT NULL DEFAULT FALSE,
  "verified_at"             TIMESTAMPTZ,
  "verified_by_account_id"  UUID,
  "created_at"              TIMESTAMPTZ               NOT NULL DEFAULT NOW(),
  "updated_at"              TIMESTAMPTZ               NOT NULL DEFAULT NOW(),
  "deleted_at"              TIMESTAMPTZ,
  CONSTRAINT "cultural_authorities_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cultural_authorities_account_id_fkey') THEN
    ALTER TABLE "cultural_authorities"
      ADD CONSTRAINT "cultural_authorities_account_id_fkey"
      FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cultural_authorities_verified_by_account_id_fkey') THEN
    ALTER TABLE "cultural_authorities"
      ADD CONSTRAINT "cultural_authorities_verified_by_account_id_fkey"
      FOREIGN KEY ("verified_by_account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS "cultural_authorities_account_id_key" ON "cultural_authorities" ("account_id");
CREATE INDEX IF NOT EXISTS "idx_cultural_authorities_kind" ON "cultural_authorities" ("kind");
CREATE INDEX IF NOT EXISTS "idx_cultural_authorities_verified" ON "cultural_authorities" ("verified");
CREATE INDEX IF NOT EXISTS "idx_cultural_authorities_ethnic_group" ON "cultural_authorities" ("ethnic_group");
CREATE INDEX IF NOT EXISTS "idx_cultural_authorities_region" ON "cultural_authorities" ("region");

-- ---------------------------------------------------------------------------
-- Table: cultural_content
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "cultural_content" (
  "id"                          UUID                    NOT NULL DEFAULT uuid_generate_v4(),
  "author_account_id"           UUID                    NOT NULL,
  "authority_id"                UUID,
  "content_type"                "cultural_content_type" NOT NULL,
  "title"                       VARCHAR(255)            NOT NULL,
  "body"                        TEXT,
  "language_code"               VARCHAR(10),
  "region"                      VARCHAR(100),
  "ethnic_group"                VARCHAR(100),
  "media_id"                    UUID,
  "visibility_scope"            "visibility_scope"      NOT NULL DEFAULT 'PUBLIC',
  "moderation_status"           "moderation_status"     NOT NULL DEFAULT 'PENDING',
  "is_from_verified_authority"  BOOLEAN                 NOT NULL DEFAULT FALSE,
  "created_at"                  TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
  "updated_at"                  TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
  "deleted_at"                  TIMESTAMPTZ,
  CONSTRAINT "cultural_content_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cultural_content_author_account_id_fkey') THEN
    ALTER TABLE "cultural_content"
      ADD CONSTRAINT "cultural_content_author_account_id_fkey"
      FOREIGN KEY ("author_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cultural_content_authority_id_fkey') THEN
    ALTER TABLE "cultural_content"
      ADD CONSTRAINT "cultural_content_authority_id_fkey"
      FOREIGN KEY ("authority_id") REFERENCES "cultural_authorities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cultural_content_media_id_fkey') THEN
    ALTER TABLE "cultural_content"
      ADD CONSTRAINT "cultural_content_media_id_fkey"
      FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS "idx_cultural_content_moderation_created" ON "cultural_content" ("moderation_status", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_cultural_content_type" ON "cultural_content" ("content_type");
CREATE INDEX IF NOT EXISTS "idx_cultural_content_ethnic_group" ON "cultural_content" ("ethnic_group");
CREATE INDEX IF NOT EXISTS "idx_cultural_content_authority" ON "cultural_content" ("authority_id");

-- ---------------------------------------------------------------------------
-- Table: moderation_reports
-- target_id is polymorphic (keyed by target_type) — intentionally no FK.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "moderation_reports" (
  "id"                       UUID                       NOT NULL DEFAULT uuid_generate_v4(),
  "reporter_account_id"      UUID                       NOT NULL,
  "target_type"              "moderation_target_type"   NOT NULL,
  "target_id"                UUID                       NOT NULL,
  "reason"                   VARCHAR(50)                NOT NULL,
  "details"                  TEXT,
  "status"                   "moderation_report_status" NOT NULL DEFAULT 'OPEN',
  "resolved_by_account_id"   UUID,
  "resolution"               TEXT,
  "created_at"               TIMESTAMPTZ                NOT NULL DEFAULT NOW(),
  "resolved_at"              TIMESTAMPTZ,
  CONSTRAINT "moderation_reports_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'moderation_reports_reporter_account_id_fkey') THEN
    ALTER TABLE "moderation_reports"
      ADD CONSTRAINT "moderation_reports_reporter_account_id_fkey"
      FOREIGN KEY ("reporter_account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'moderation_reports_resolved_by_account_id_fkey') THEN
    ALTER TABLE "moderation_reports"
      ADD CONSTRAINT "moderation_reports_resolved_by_account_id_fkey"
      FOREIGN KEY ("resolved_by_account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS "idx_moderation_reports_status_created" ON "moderation_reports" ("status", "created_at");
CREATE INDEX IF NOT EXISTS "idx_moderation_reports_target" ON "moderation_reports" ("target_type", "target_id");
