-- Live rebuild — additive, idempotent-guarded
-- Adds, on top of the Phase 5 LIVE feature:
--   - live_invitation_status enum
--   - live_sessions.invite_code (nullable, unique) — a shareable join code
--   - live_participants.hand_raised + live_participants.is_speaker (defaults)
--   - live_invitations table (invite an existing account OR a phone number)
--
-- Cross-aggregate references to accounts are modeled as plain scalar UUID
-- columns in the Prisma schema (no back-relation fields on Account); the real
-- FOREIGN KEY constraints are declared here. The live_invitations ->
-- live_sessions relation is a full Prisma relation (FK + cascade).
--
-- Everything below is guarded so the migration is safe to re-run.

-- ---------------------------------------------------------------------------
-- Enum (guarded)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'live_invitation_status') THEN
    CREATE TYPE "live_invitation_status" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');
  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- live_sessions.invite_code (nullable, unique)
-- ---------------------------------------------------------------------------
ALTER TABLE "live_sessions" ADD COLUMN IF NOT EXISTS "invite_code" VARCHAR(16);
CREATE UNIQUE INDEX IF NOT EXISTS "live_sessions_invite_code_key" ON "live_sessions" ("invite_code");

-- ---------------------------------------------------------------------------
-- live_participants speaker controls
-- ---------------------------------------------------------------------------
ALTER TABLE "live_participants" ADD COLUMN IF NOT EXISTS "hand_raised" BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE "live_participants" ADD COLUMN IF NOT EXISTS "is_speaker"  BOOLEAN NOT NULL DEFAULT FALSE;

-- ---------------------------------------------------------------------------
-- Table: live_invitations
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "live_invitations" (
  "id"                  UUID                     NOT NULL DEFAULT uuid_generate_v4(),
  "live_session_id"     UUID                     NOT NULL,
  "inviter_account_id"  UUID                     NOT NULL,
  "invited_account_id"  UUID,
  "invited_phone"       VARCHAR(20),
  "status"              "live_invitation_status" NOT NULL DEFAULT 'PENDING',
  "created_at"          TIMESTAMPTZ              NOT NULL DEFAULT NOW(),
  "responded_at"        TIMESTAMPTZ,
  "deleted_at"          TIMESTAMPTZ,
  CONSTRAINT "live_invitations_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'live_invitations_live_session_id_fkey') THEN
    ALTER TABLE "live_invitations"
      ADD CONSTRAINT "live_invitations_live_session_id_fkey"
      FOREIGN KEY ("live_session_id") REFERENCES "live_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'live_invitations_inviter_account_id_fkey') THEN
    ALTER TABLE "live_invitations"
      ADD CONSTRAINT "live_invitations_inviter_account_id_fkey"
      FOREIGN KEY ("inviter_account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'live_invitations_invited_account_id_fkey') THEN
    ALTER TABLE "live_invitations"
      ADD CONSTRAINT "live_invitations_invited_account_id_fkey"
      FOREIGN KEY ("invited_account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS "idx_live_invitations_session" ON "live_invitations" ("live_session_id");
CREATE INDEX IF NOT EXISTS "idx_live_invitations_invited_account" ON "live_invitations" ("invited_account_id");
