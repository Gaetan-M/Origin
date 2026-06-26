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
