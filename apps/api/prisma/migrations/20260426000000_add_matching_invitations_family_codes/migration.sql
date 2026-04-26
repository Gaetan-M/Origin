-- AlterEnum: add new notification types
ALTER TYPE "notification_type" ADD VALUE IF NOT EXISTS 'MATCH_FOUND_FOR_USER';
ALTER TYPE "notification_type" ADD VALUE IF NOT EXISTS 'POTENTIAL_MATCH_FOR_INVITER';
ALTER TYPE "notification_type" ADD VALUE IF NOT EXISTS 'KINSHIP_PROBE_RECEIVED';
ALTER TYPE "notification_type" ADD VALUE IF NOT EXISTS 'FAMILY_CODE_REDEEMED';

-- CreateTable: family_codes
CREATE TABLE "family_codes" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "code" VARCHAR(20) NOT NULL,
    "account_id" UUID NOT NULL,
    "label" VARCHAR(100),
    "max_uses" INTEGER NOT NULL DEFAULT 50,
    "used_count" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '90 days'),
    "revoked_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "family_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "family_codes_code_key" ON "family_codes"("code");
CREATE INDEX "idx_family_code_code" ON "family_codes"("code");
CREATE INDEX "idx_family_code_account" ON "family_codes"("account_id");

-- AddForeignKey
ALTER TABLE "family_codes" ADD CONSTRAINT "family_codes_account_id_fkey"
    FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: family_code_uses
CREATE TABLE "family_code_uses" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "family_code_id" UUID NOT NULL,
    "used_by_account_id" UUID NOT NULL,
    "used_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "family_code_uses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_family_code_use" ON "family_code_uses"("family_code_id", "used_by_account_id");

-- AddForeignKey
ALTER TABLE "family_code_uses" ADD CONSTRAINT "family_code_uses_family_code_id_fkey"
    FOREIGN KEY ("family_code_id") REFERENCES "family_codes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "family_code_uses" ADD CONSTRAINT "family_code_uses_used_by_account_id_fkey"
    FOREIGN KEY ("used_by_account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
