-- ============================================
-- Admin RBAC: roles, audit log, helpful indexes
-- ============================================

-- Enums
CREATE TYPE "account_role" AS ENUM ('USER', 'MODERATOR', 'ADMIN', 'SUPER_ADMIN');
CREATE TYPE "admin_action_severity" AS ENUM ('INFO', 'NOTICE', 'WARNING', 'CRITICAL');

-- Account columns for role + ban metadata + admin notes
ALTER TABLE "accounts"
  ADD COLUMN "role" "account_role" NOT NULL DEFAULT 'USER',
  ADD COLUMN "role_assigned_at" TIMESTAMPTZ,
  ADD COLUMN "role_assigned_by_account_id" UUID,
  ADD COLUMN "banned_at" TIMESTAMPTZ,
  ADD COLUMN "banned_by_account_id" UUID,
  ADD COLUMN "full_name" VARCHAR(255),
  ADD COLUMN "admin_notes" TEXT;

ALTER TABLE "accounts"
  ADD CONSTRAINT "accounts_banned_by_account_id_fkey"
    FOREIGN KEY ("banned_by_account_id") REFERENCES "accounts"("id") ON DELETE SET NULL,
  ADD CONSTRAINT "accounts_role_assigned_by_account_id_fkey"
    FOREIGN KEY ("role_assigned_by_account_id") REFERENCES "accounts"("id") ON DELETE SET NULL;

CREATE INDEX "idx_accounts_role" ON "accounts" ("role");
CREATE INDEX "idx_accounts_status" ON "accounts" ("is_banned", "deleted_at");
CREATE INDEX "idx_accounts_created" ON "accounts" ("created_at" DESC);

-- Audit log
CREATE TABLE "admin_audit_logs" (
  "id"                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "actor_account_id"    UUID NOT NULL,
  "actor_role"          "account_role" NOT NULL,
  "action"              VARCHAR(100) NOT NULL,
  "category"            VARCHAR(50) NOT NULL,
  "severity"            "admin_action_severity" NOT NULL DEFAULT 'INFO',
  "target_entity_type"  VARCHAR(50),
  "target_entity_id"    UUID,
  "target_account_id"   UUID,
  "reason"              TEXT,
  "before_state"        JSONB,
  "after_state"         JSONB,
  "metadata"            JSONB,
  "ip_address"          INET,
  "user_agent"          VARCHAR(500),
  "request_id"          VARCHAR(64),
  "created_at"          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "admin_audit_logs_actor_account_id_fkey"
    FOREIGN KEY ("actor_account_id") REFERENCES "accounts"("id"),
  CONSTRAINT "admin_audit_logs_target_account_id_fkey"
    FOREIGN KEY ("target_account_id") REFERENCES "accounts"("id")
);

CREATE INDEX "idx_admin_audit_actor"          ON "admin_audit_logs" ("actor_account_id", "created_at" DESC);
CREATE INDEX "idx_admin_audit_target_entity"  ON "admin_audit_logs" ("target_entity_type", "target_entity_id");
CREATE INDEX "idx_admin_audit_target_account" ON "admin_audit_logs" ("target_account_id", "created_at" DESC);
CREATE INDEX "idx_admin_audit_category"       ON "admin_audit_logs" ("category", "created_at" DESC);
CREATE INDEX "idx_admin_audit_created"        ON "admin_audit_logs" ("created_at" DESC);
