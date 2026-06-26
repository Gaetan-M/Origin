-- Phase 6 — TOURISM & LEARNING (additive, idempotent-guarded)
-- Adds: tourism_source + tourism_category + learning_level enums, and the
-- tourism_places, learning_lessons and lesson_enrollments tables.
--
-- TOURISM: highlighted places of heritage/tourism surfaced PUBLIC in discovery.
-- Data may originate from the Ministry of Tourism / NGOs / the community but is
-- used STRICTLY as a cited SOURCE with provenance shown (source + source_ref).
-- INDEPENDENCE is a core value: this data NEVER governs or controls the family
-- graph, has NO write access to it, and is never coupled to private person data.
-- `verified` reflects SOURCE verification only (set by a moderator/admin) and
-- confers no authority over the graph.
--
-- LEARNING: structured mini-lessons (especially LANGUAGE lessons). A lesson is
-- authored content, optionally attributed to a verified CulturalAuthority; a
-- lesson from a verified authority may be auto-approved (moderation_status
-- APPROVED), otherwise PENDING (enforced in the service layer). A lesson may be
-- ticketed and linked to a live LESSON (live_session_id). Users enroll and track
-- progress via lesson_enrollments.
--
-- Cross-aggregate references to accounts / cultural_authorities / media /
-- live_sessions are modeled as plain scalar UUID columns in the Prisma schema
-- (no back-relation fields on Account/CulturalAuthority/Media/LiveSession); the
-- real FOREIGN KEY constraints are declared here. The
-- learning_lessons <-> lesson_enrollments relation is a full Prisma relation
-- (FK + cascade).

-- ---------------------------------------------------------------------------
-- Enums (guarded)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tourism_source') THEN
    CREATE TYPE "tourism_source" AS ENUM ('MINISTRY', 'NGO', 'COMMUNITY');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tourism_category') THEN
    CREATE TYPE "tourism_category" AS ENUM ('HERITAGE', 'NATURE', 'CULTURE', 'MUSEUM', 'CHEFFERIE', 'RELIGIOUS', 'OTHER');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'learning_level') THEN
    CREATE TYPE "learning_level" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');
  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- Table: tourism_places
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "tourism_places" (
  "id"                      UUID               NOT NULL DEFAULT uuid_generate_v4(),
  "name"                    VARCHAR(200)       NOT NULL,
  "description"             TEXT,
  "region"                  VARCHAR(120),
  "category"                "tourism_category" NOT NULL,
  "latitude"                DECIMAL(9, 6),
  "longitude"               DECIMAL(9, 6),
  "source"                  "tourism_source"   NOT NULL,
  "source_ref"              VARCHAR(300),
  "verified"                BOOLEAN            NOT NULL DEFAULT FALSE,
  "verified_by_account_id"  UUID,
  "media_id"                UUID,
  "submitted_by_account_id" UUID,
  "visibility_scope"        "visibility_scope" NOT NULL DEFAULT 'PUBLIC',
  "created_at"              TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
  "updated_at"              TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
  "deleted_at"              TIMESTAMPTZ,
  CONSTRAINT "tourism_places_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tourism_places_verified_by_account_id_fkey') THEN
    ALTER TABLE "tourism_places"
      ADD CONSTRAINT "tourism_places_verified_by_account_id_fkey"
      FOREIGN KEY ("verified_by_account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tourism_places_submitted_by_account_id_fkey') THEN
    ALTER TABLE "tourism_places"
      ADD CONSTRAINT "tourism_places_submitted_by_account_id_fkey"
      FOREIGN KEY ("submitted_by_account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tourism_places_media_id_fkey') THEN
    ALTER TABLE "tourism_places"
      ADD CONSTRAINT "tourism_places_media_id_fkey"
      FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS "idx_tourism_places_region" ON "tourism_places" ("region");
CREATE INDEX IF NOT EXISTS "idx_tourism_places_category" ON "tourism_places" ("category");
CREATE INDEX IF NOT EXISTS "idx_tourism_places_verified" ON "tourism_places" ("verified");
CREATE INDEX IF NOT EXISTS "idx_tourism_places_source" ON "tourism_places" ("source");

-- ---------------------------------------------------------------------------
-- Table: learning_lessons
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "learning_lessons" (
  "id"                UUID                NOT NULL DEFAULT uuid_generate_v4(),
  "title"             VARCHAR(200)        NOT NULL,
  "description"       TEXT,
  "content"           TEXT,
  "language_code"     VARCHAR(10),
  "level"             "learning_level"    NOT NULL DEFAULT 'BEGINNER',
  "ethnic_group"      VARCHAR(120),
  "authority_id"      UUID,
  "author_account_id" UUID                NOT NULL,
  "media_id"          UUID,
  "is_ticketed"       BOOLEAN             NOT NULL DEFAULT FALSE,
  "live_session_id"   UUID,
  "visibility_scope"  "visibility_scope"  NOT NULL DEFAULT 'PUBLIC',
  "moderation_status" "moderation_status" NOT NULL DEFAULT 'PENDING',
  "position"          INTEGER             NOT NULL DEFAULT 0,
  "created_at"        TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
  "updated_at"        TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
  "deleted_at"        TIMESTAMPTZ,
  CONSTRAINT "learning_lessons_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'learning_lessons_authority_id_fkey') THEN
    ALTER TABLE "learning_lessons"
      ADD CONSTRAINT "learning_lessons_authority_id_fkey"
      FOREIGN KEY ("authority_id") REFERENCES "cultural_authorities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'learning_lessons_author_account_id_fkey') THEN
    ALTER TABLE "learning_lessons"
      ADD CONSTRAINT "learning_lessons_author_account_id_fkey"
      FOREIGN KEY ("author_account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'learning_lessons_media_id_fkey') THEN
    ALTER TABLE "learning_lessons"
      ADD CONSTRAINT "learning_lessons_media_id_fkey"
      FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'learning_lessons_live_session_id_fkey') THEN
    ALTER TABLE "learning_lessons"
      ADD CONSTRAINT "learning_lessons_live_session_id_fkey"
      FOREIGN KEY ("live_session_id") REFERENCES "live_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS "idx_learning_lessons_language_code" ON "learning_lessons" ("language_code");
CREATE INDEX IF NOT EXISTS "idx_learning_lessons_level" ON "learning_lessons" ("level");
CREATE INDEX IF NOT EXISTS "idx_learning_lessons_moderation_created" ON "learning_lessons" ("moderation_status", "created_at" DESC);

-- ---------------------------------------------------------------------------
-- Table: lesson_enrollments
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "lesson_enrollments" (
  "id"               UUID        NOT NULL DEFAULT uuid_generate_v4(),
  "lesson_id"        UUID        NOT NULL,
  "account_id"       UUID        NOT NULL,
  "progress_percent" INTEGER     NOT NULL DEFAULT 0,
  "completed_at"     TIMESTAMPTZ,
  "created_at"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "lesson_enrollments_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lesson_enrollments_lesson_id_fkey') THEN
    ALTER TABLE "lesson_enrollments"
      ADD CONSTRAINT "lesson_enrollments_lesson_id_fkey"
      FOREIGN KEY ("lesson_id") REFERENCES "learning_lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lesson_enrollments_account_id_fkey') THEN
    ALTER TABLE "lesson_enrollments"
      ADD CONSTRAINT "lesson_enrollments_account_id_fkey"
      FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS "uq_lesson_enrollment_lesson_account" ON "lesson_enrollments" ("lesson_id", "account_id");
CREATE INDEX IF NOT EXISTS "idx_lesson_enrollments_lesson" ON "lesson_enrollments" ("lesson_id");
CREATE INDEX IF NOT EXISTS "idx_lesson_enrollments_account" ON "lesson_enrollments" ("account_id");
