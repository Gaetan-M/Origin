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
