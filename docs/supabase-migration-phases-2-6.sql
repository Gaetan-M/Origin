-- ============================================================================
-- ORIGIN — Supabase migration: Phases 2 to 6  (ADDITIVE & IDEMPOTENT)
-- Safe on a DB that already has data + Phase 1 applied. Run in Supabase SQL Editor.
-- Covers: culture+moderation, kinship test, memory/albums, live, tourism+learning.
-- All guarded (IF NOT EXISTS / pg_constraint) -> re-runnable, no data loss.
-- (Render also applies these automatically via prisma migrate deploy on each deploy.)
-- ============================================================================

BEGIN;

-- ============================================================================
-- 20260627000000_phase2_culture_moderation
-- ============================================================================
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


-- ============================================================================
-- 20260628000000_phase3_kinship_check
-- ============================================================================
-- Phase 3 — "Sommes-nous parents ?" / Kinship Check (additive, idempotent-guarded)
-- Adds: kinship_check_status enum and the kinship_checks table.
--
-- The signature consent-gated relatedness probe. Two accounts mutually consent;
-- the system computes whether they are related THROUGH the global graph and
-- persists ONLY the aggregate result: a boolean, a bounded degree, and a
-- derived human label (FR/EN).
--
-- PRIVACY INVARIANT (non-negotiable): NO person ids, names, ancestors, or graph
-- path are EVER stored in this table. The graph is read transiently at compute
-- time and everything except the degree + label is discarded.
--
-- Cross-aggregate references to accounts are modeled as plain scalar UUID
-- columns in the Prisma schema (no back-relation fields on Account); the real
-- FOREIGN KEY constraints are declared here. target_account_id is nullable
-- (resolved once the invited target is known) and target_phone supports
-- invite-by-phone before the target has an account.

-- ---------------------------------------------------------------------------
-- Enum (guarded)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'kinship_check_status') THEN
    CREATE TYPE "kinship_check_status" AS ENUM ('PENDING_CONSENT', 'CONSENTED', 'DECLINED', 'COMPUTED', 'EXPIRED', 'CANCELLED');
  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- Table: kinship_checks
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "kinship_checks" (
  "id"                     UUID                   NOT NULL DEFAULT uuid_generate_v4(),
  "requester_account_id"   UUID                   NOT NULL,
  "target_account_id"      UUID,
  "target_phone"           VARCHAR(20),
  "status"                 "kinship_check_status" NOT NULL DEFAULT 'PENDING_CONSENT',
  "requester_consent"      BOOLEAN                NOT NULL DEFAULT TRUE,
  "target_consent"         BOOLEAN                NOT NULL DEFAULT FALSE,
  "result_degree"          INTEGER,
  "result_related"         BOOLEAN,
  "result_label_fr"        VARCHAR(120),
  "result_label_en"        VARCHAR(120),
  "computed_at"            TIMESTAMPTZ,
  "expires_at"             TIMESTAMPTZ,
  "created_at"             TIMESTAMPTZ            NOT NULL DEFAULT NOW(),
  "updated_at"             TIMESTAMPTZ            NOT NULL DEFAULT NOW(),
  "deleted_at"             TIMESTAMPTZ,
  CONSTRAINT "kinship_checks_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'kinship_checks_requester_account_id_fkey') THEN
    ALTER TABLE "kinship_checks"
      ADD CONSTRAINT "kinship_checks_requester_account_id_fkey"
      FOREIGN KEY ("requester_account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'kinship_checks_target_account_id_fkey') THEN
    ALTER TABLE "kinship_checks"
      ADD CONSTRAINT "kinship_checks_target_account_id_fkey"
      FOREIGN KEY ("target_account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS "idx_kinship_checks_requester" ON "kinship_checks" ("requester_account_id");
CREATE INDEX IF NOT EXISTS "idx_kinship_checks_target" ON "kinship_checks" ("target_account_id");
CREATE INDEX IF NOT EXISTS "idx_kinship_checks_status" ON "kinship_checks" ("status");
CREATE INDEX IF NOT EXISTS "idx_kinship_checks_target_phone" ON "kinship_checks" ("target_phone");


-- ============================================================================
-- 20260629000000_phase4_memory
-- ============================================================================
-- Phase 4 — Living Memory (additive, idempotent-guarded)
-- Adds: album_kind + memorial_tribute_kind enums, and the albums, album_items
-- and memorial_tributes tables.
--
-- ALBUMS document a person's life curated over time (e.g. a parent curating a
-- child from newborn to adult). MEMORIAL TRIBUTES (candle / message / photo /
-- video) honor DECEASED ancestors. Oral history REUSES the existing `sources`
-- table as-is (media_file_id + audio_transcript + visibility_scope) — this
-- migration adds NO column to `sources`.
--
-- Cross-aggregate references to accounts / persons / media are modeled as
-- plain scalar UUID columns in the Prisma schema (no back-relation fields on
-- Account/Person/Media); the real FOREIGN KEY constraints are declared here.
-- The Album <-> AlbumItem relation is a full Prisma relation (FK + cascade).
--
-- Visibility: albums default PRIVATE_SELF (opt-in family/public); memorial
-- tributes default FAMILY. Both are soft-deleted (deleted_at). The
-- "tributes only on DECEASED persons" rule is enforced in the service layer,
-- not by a DB constraint.

-- ---------------------------------------------------------------------------
-- Enums (guarded)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'album_kind') THEN
    CREATE TYPE "album_kind" AS ENUM ('PERSONAL', 'FAMILY', 'EVENT');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'memorial_tribute_kind') THEN
    CREATE TYPE "memorial_tribute_kind" AS ENUM ('CANDLE', 'MESSAGE', 'PHOTO', 'VIDEO');
  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- Table: albums
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "albums" (
  "id"                 UUID              NOT NULL DEFAULT uuid_generate_v4(),
  "subject_person_id"  UUID,
  "owner_account_id"   UUID              NOT NULL,
  "title"              VARCHAR(200)      NOT NULL,
  "description"        TEXT,
  "kind"               "album_kind"      NOT NULL DEFAULT 'PERSONAL',
  "cover_media_id"     UUID,
  "visibility_scope"   "visibility_scope" NOT NULL DEFAULT 'PRIVATE_SELF',
  "visible_max_degree" INTEGER,
  "created_at"         TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  "updated_at"         TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  "deleted_at"         TIMESTAMPTZ,
  CONSTRAINT "albums_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'albums_subject_person_id_fkey') THEN
    ALTER TABLE "albums"
      ADD CONSTRAINT "albums_subject_person_id_fkey"
      FOREIGN KEY ("subject_person_id") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'albums_owner_account_id_fkey') THEN
    ALTER TABLE "albums"
      ADD CONSTRAINT "albums_owner_account_id_fkey"
      FOREIGN KEY ("owner_account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'albums_cover_media_id_fkey') THEN
    ALTER TABLE "albums"
      ADD CONSTRAINT "albums_cover_media_id_fkey"
      FOREIGN KEY ("cover_media_id") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS "idx_albums_subject_person" ON "albums" ("subject_person_id");
CREATE INDEX IF NOT EXISTS "idx_albums_owner_account" ON "albums" ("owner_account_id");
CREATE INDEX IF NOT EXISTS "idx_albums_visibility" ON "albums" ("visibility_scope");

-- ---------------------------------------------------------------------------
-- Table: album_items
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "album_items" (
  "id"            UUID         NOT NULL DEFAULT uuid_generate_v4(),
  "album_id"      UUID         NOT NULL,
  "media_id"      UUID         NOT NULL,
  "caption"       VARCHAR(500),
  "taken_at"      DATE,
  "taken_at_text" VARCHAR(100),
  "position"      INTEGER      NOT NULL DEFAULT 0,
  "created_at"    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "deleted_at"    TIMESTAMPTZ,
  CONSTRAINT "album_items_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'album_items_album_id_fkey') THEN
    ALTER TABLE "album_items"
      ADD CONSTRAINT "album_items_album_id_fkey"
      FOREIGN KEY ("album_id") REFERENCES "albums"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'album_items_media_id_fkey') THEN
    ALTER TABLE "album_items"
      ADD CONSTRAINT "album_items_media_id_fkey"
      FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS "idx_album_items_album_position" ON "album_items" ("album_id", "position");

-- ---------------------------------------------------------------------------
-- Table: memorial_tributes
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "memorial_tributes" (
  "id"                 UUID                    NOT NULL DEFAULT uuid_generate_v4(),
  "person_id"          UUID                    NOT NULL,
  "author_account_id"  UUID                    NOT NULL,
  "kind"               "memorial_tribute_kind" NOT NULL,
  "message"            TEXT,
  "media_id"           UUID,
  "visibility_scope"   "visibility_scope"      NOT NULL DEFAULT 'FAMILY',
  "visible_max_degree" INTEGER,
  "created_at"         TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
  "deleted_at"         TIMESTAMPTZ,
  CONSTRAINT "memorial_tributes_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'memorial_tributes_person_id_fkey') THEN
    ALTER TABLE "memorial_tributes"
      ADD CONSTRAINT "memorial_tributes_person_id_fkey"
      FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'memorial_tributes_author_account_id_fkey') THEN
    ALTER TABLE "memorial_tributes"
      ADD CONSTRAINT "memorial_tributes_author_account_id_fkey"
      FOREIGN KEY ("author_account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'memorial_tributes_media_id_fkey') THEN
    ALTER TABLE "memorial_tributes"
      ADD CONSTRAINT "memorial_tributes_media_id_fkey"
      FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS "idx_memorial_tributes_person_created" ON "memorial_tributes" ("person_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_memorial_tributes_author" ON "memorial_tributes" ("author_account_id");


-- ============================================================================
-- 20260630000000_phase5_live
-- ============================================================================
-- Phase 5 — LIVE (additive, idempotent-guarded)
-- Adds: live_session_status + live_session_kind enums, and the live_sessions
-- and live_participants tables.
--
-- LIVE sessions are real-time audio-first broadcasts built on LiveKit Cloud.
--   - PRIVATE/FAMILY lives (ceremonies, family councils) are bounded by
--     visible_max_degree around subject_person_id (GraphDegreeService).
--   - PUBLIC lives (lessons, storytelling, masterclasses) are hosted by
--     verified authorities/experts and open to any authenticated user.
-- Sessions are recorded; recording_media_id is the REPLAY that, once
-- replay_published, feeds the public/family feed.
--
-- Cross-aggregate references to accounts / cultural_authorities / persons /
-- media are modeled as plain scalar UUID columns in the Prisma schema (no
-- back-relation fields on Account/CulturalAuthority/Person/Media); the real
-- FOREIGN KEY constraints are declared here. The LiveSession <-> LiveParticipant
-- relation is a full Prisma relation (FK + cascade).
--
-- LiveSession is soft-deleted (deleted_at). Access-control / "only host (or a
-- verified authority for public LESSON/MASTERCLASS) may START a public live"
-- rules are enforced in the service layer, not by DB constraints.

-- ---------------------------------------------------------------------------
-- Enums (guarded)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'live_session_status') THEN
    CREATE TYPE "live_session_status" AS ENUM ('SCHEDULED', 'LIVE', 'ENDED', 'CANCELLED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'live_session_kind') THEN
    CREATE TYPE "live_session_kind" AS ENUM ('CEREMONY', 'FAMILY_COUNCIL', 'LESSON', 'STORYTELLING', 'MASTERCLASS', 'OTHER');
  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- Table: live_sessions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "live_sessions" (
  "id"                  UUID                  NOT NULL DEFAULT uuid_generate_v4(),
  "host_account_id"     UUID                  NOT NULL,
  "host_authority_id"   UUID,
  "title"               VARCHAR(200)          NOT NULL,
  "description"         TEXT,
  "kind"                "live_session_kind"   NOT NULL,
  "visibility_scope"    "visibility_scope"    NOT NULL DEFAULT 'FAMILY',
  "visible_max_degree"  INTEGER,
  "subject_person_id"   UUID,
  "room_name"           VARCHAR(120)          NOT NULL,
  "status"              "live_session_status" NOT NULL DEFAULT 'SCHEDULED',
  "scheduled_at"        TIMESTAMPTZ,
  "started_at"          TIMESTAMPTZ,
  "ended_at"            TIMESTAMPTZ,
  "recording_media_id"  UUID,
  "replay_published"    BOOLEAN               NOT NULL DEFAULT FALSE,
  "created_at"          TIMESTAMPTZ           NOT NULL DEFAULT NOW(),
  "updated_at"          TIMESTAMPTZ           NOT NULL DEFAULT NOW(),
  "deleted_at"          TIMESTAMPTZ,
  CONSTRAINT "live_sessions_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'live_sessions_host_account_id_fkey') THEN
    ALTER TABLE "live_sessions"
      ADD CONSTRAINT "live_sessions_host_account_id_fkey"
      FOREIGN KEY ("host_account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'live_sessions_host_authority_id_fkey') THEN
    ALTER TABLE "live_sessions"
      ADD CONSTRAINT "live_sessions_host_authority_id_fkey"
      FOREIGN KEY ("host_authority_id") REFERENCES "cultural_authorities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'live_sessions_subject_person_id_fkey') THEN
    ALTER TABLE "live_sessions"
      ADD CONSTRAINT "live_sessions_subject_person_id_fkey"
      FOREIGN KEY ("subject_person_id") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'live_sessions_recording_media_id_fkey') THEN
    ALTER TABLE "live_sessions"
      ADD CONSTRAINT "live_sessions_recording_media_id_fkey"
      FOREIGN KEY ("recording_media_id") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

-- Unique LiveKit room name (Prisma @unique -> default constraint name)
CREATE UNIQUE INDEX IF NOT EXISTS "live_sessions_room_name_key" ON "live_sessions" ("room_name");

CREATE INDEX IF NOT EXISTS "idx_live_sessions_status_scheduled" ON "live_sessions" ("status", "scheduled_at");
CREATE INDEX IF NOT EXISTS "idx_live_sessions_host_account" ON "live_sessions" ("host_account_id");
CREATE INDEX IF NOT EXISTS "idx_live_sessions_visibility" ON "live_sessions" ("visibility_scope");
CREATE INDEX IF NOT EXISTS "idx_live_sessions_subject_person" ON "live_sessions" ("subject_person_id");

-- ---------------------------------------------------------------------------
-- Table: live_participants
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "live_participants" (
  "id"              UUID         NOT NULL DEFAULT uuid_generate_v4(),
  "live_session_id" UUID         NOT NULL,
  "account_id"      UUID         NOT NULL,
  "role"            VARCHAR(20)  NOT NULL,
  "joined_at"       TIMESTAMPTZ,
  "left_at"         TIMESTAMPTZ,
  "created_at"      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT "live_participants_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'live_participants_live_session_id_fkey') THEN
    ALTER TABLE "live_participants"
      ADD CONSTRAINT "live_participants_live_session_id_fkey"
      FOREIGN KEY ("live_session_id") REFERENCES "live_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'live_participants_account_id_fkey') THEN
    ALTER TABLE "live_participants"
      ADD CONSTRAINT "live_participants_account_id_fkey"
      FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS "uq_live_participant_session_account" ON "live_participants" ("live_session_id", "account_id");
CREATE INDEX IF NOT EXISTS "idx_live_participants_session" ON "live_participants" ("live_session_id");


-- ============================================================================
-- 20260701000000_phase6_tourism_learning
-- ============================================================================
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


COMMIT;
