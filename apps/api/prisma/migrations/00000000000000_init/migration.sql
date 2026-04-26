-- CreateEnum
CREATE TYPE "life_status" AS ENUM ('ALIVE', 'DECEASED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "claim_status" AS ENUM ('PENDING', 'PENDING_VERIFICATION', 'VERIFIED', 'REJECTED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "verification_level" AS ENUM ('UNVERIFIED', 'SELF_DECLARED', 'COMMUNITY_VERIFIED', 'DOCUMENT_DECLARED', 'DOCUMENT_VERIFIED', 'ADMIN_VERIFIED');

-- CreateEnum
CREATE TYPE "union_type" AS ENUM ('CUSTOMARY', 'CIVIL', 'RELIGIOUS', 'FREE_UNION', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "union_status" AS ENUM ('ACTIVE', 'ENDED', 'WIDOWED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "parent_relationship_type" AS ENUM ('BIOLOGICAL', 'CUSTOMARY_ADOPTIVE', 'LEGAL_ADOPTIVE', 'PRESUMED', 'STEP');

-- CreateEnum
CREATE TYPE "document_type" AS ENUM ('CNI_CAMEROUN', 'PASSPORT_CAMEROUN', 'PASSPORT_FOREIGN', 'ACTE_NAISSANCE', 'CARTE_CONSULAIRE', 'PERMIS_CONDUIRE', 'CARTE_ELECTEUR', 'CARTE_SCOLAIRE', 'OTHER');

-- CreateEnum
CREATE TYPE "document_verification_status" AS ENUM ('UNVERIFIED', 'SELF_DECLARED', 'COMMUNITY_VERIFIED', 'DOCUMENT_VERIFIED', 'ADMIN_VERIFIED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "name_type" AS ENUM ('CIVIL', 'TRADITIONAL', 'NICKNAME', 'MARRIED', 'RELIGIOUS', 'FORMER');

-- CreateEnum
CREATE TYPE "date_precision" AS ENUM ('EXACT', 'MONTH', 'YEAR', 'DECADE', 'APPROXIMATE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "notification_type" AS ENUM ('INVITATION_RECEIVED', 'CLAIM_REQUEST', 'CLAIM_VALIDATED', 'MERGE_PROPOSAL', 'MODIFICATION_SUGGESTED', 'NEW_FAMILY_MEMBER', 'DECEASE_REPORTED', 'BIRTHDAY_REMINDER', 'MEMORIAL_REMINDER', 'DOCUMENT_VERIFIED', 'OTHER');

-- CreateTable
CREATE TABLE "accounts" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "phone_number" VARCHAR(20) NOT NULL,
    "phone_country_code" VARCHAR(5) NOT NULL DEFAULT '+237',
    "phone_operator" VARCHAR(20),
    "pin_hash" VARCHAR(255),
    "pin_enabled" BOOLEAN NOT NULL DEFAULT false,
    "language_preference" VARCHAR(5) NOT NULL DEFAULT 'fr',
    "data_saver_mode" BOOLEAN NOT NULL DEFAULT false,
    "large_text_mode" BOOLEAN NOT NULL DEFAULT false,
    "last_login_at" TIMESTAMPTZ,
    "last_login_ip" INET,
    "last_login_device_id" VARCHAR(255),
    "email" VARCHAR(255),
    "whatsapp_enabled" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_banned" BOOLEAN NOT NULL DEFAULT false,
    "banned_reason" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "persons" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "display_name" VARCHAR(255) NOT NULL,
    "normalized_name" VARCHAR(255) NOT NULL,
    "name_soundex" VARCHAR(10),
    "name_metaphone" VARCHAR(20),
    "gender" VARCHAR(1),
    "life_status" "life_status" NOT NULL DEFAULT 'UNKNOWN',
    "deceased_assumed" BOOLEAN NOT NULL DEFAULT false,
    "birth_date" DATE,
    "birth_date_precision" "date_precision" NOT NULL DEFAULT 'UNKNOWN',
    "birth_year_approximate" INTEGER,
    "birth_date_text" VARCHAR(100),
    "deceased_date" DATE,
    "deceased_date_precision" "date_precision" NOT NULL DEFAULT 'UNKNOWN',
    "deceased_year_approximate" INTEGER,
    "deceased_date_text" VARCHAR(100),
    "birth_place" VARCHAR(255),
    "birth_region" VARCHAR(100),
    "birth_country" VARCHAR(100) DEFAULT 'Cameroun',
    "deceased_place" VARCHAR(255),
    "deceased_region" VARCHAR(100),
    "deceased_country" VARCHAR(100),
    "current_residence_place" VARCHAR(255),
    "current_residence_country" VARCHAR(100),
    "ethnicity" VARCHAR(100),
    "village_origin" VARCHAR(255),
    "chefferie" VARCHAR(255),
    "biography" TEXT,
    "occupation" VARCHAR(255),
    "primary_photo_id" UUID,
    "has_photo" BOOLEAN NOT NULL DEFAULT false,
    "verification_level" "verification_level" NOT NULL DEFAULT 'UNVERIFIED',
    "confidence_score" DECIMAL(3,2) NOT NULL DEFAULT 0.0,
    "created_by_account_id" UUID,
    "updated_by_account_id" UUID,
    "claimed_by_account_id" UUID,
    "claim_verified_at" TIMESTAMPTZ,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "privacy_level" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "persons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "person_names" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "person_id" UUID NOT NULL,
    "name_type" "name_type" NOT NULL,
    "full_name" VARCHAR(255) NOT NULL,
    "first_name" VARCHAR(100),
    "last_name" VARCHAR(100),
    "middle_names" VARCHAR(255),
    "normalized_full_name" VARCHAR(255) NOT NULL,
    "soundex_code" VARCHAR(10),
    "metaphone_code" VARCHAR(20),
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "used_from_date" DATE,
    "used_until_date" DATE,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "person_names_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unions" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "union_type" "union_type" NOT NULL DEFAULT 'UNKNOWN',
    "status" "union_status" NOT NULL DEFAULT 'UNKNOWN',
    "start_date" DATE,
    "start_date_precision" "date_precision" NOT NULL DEFAULT 'UNKNOWN',
    "start_year_approximate" INTEGER,
    "start_date_text" VARCHAR(100),
    "end_date" DATE,
    "end_date_precision" "date_precision" NOT NULL DEFAULT 'UNKNOWN',
    "end_year_approximate" INTEGER,
    "end_reason" VARCHAR(50),
    "place" VARCHAR(255),
    "notes" TEXT,
    "created_by_account_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "unions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "union_partners" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "union_id" UUID NOT NULL,
    "person_id" UUID NOT NULL,
    "role" VARCHAR(50),
    "wife_rank" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "union_partners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parent_child" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "parent_id" UUID NOT NULL,
    "child_id" UUID NOT NULL,
    "relationship_type" "parent_relationship_type" NOT NULL DEFAULT 'BIOLOGICAL',
    "union_id" UUID,
    "confidence" DECIMAL(3,2) NOT NULL DEFAULT 1.0,
    "notes" TEXT,
    "created_by_account_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "parent_child_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "claims" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "account_id" UUID NOT NULL,
    "person_id" UUID NOT NULL,
    "status" "claim_status" NOT NULL DEFAULT 'PENDING',
    "verification_level" "verification_level" NOT NULL DEFAULT 'SELF_DECLARED',
    "validated_by_account_ids" UUID[] DEFAULT ARRAY[]::UUID[],
    "validation_count" INTEGER NOT NULL DEFAULT 0,
    "disputed_by_claim_id" UUID,
    "dispute_reason" TEXT,
    "evidence" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMPTZ,

    CONSTRAINT "claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity_documents" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "person_id" UUID NOT NULL,
    "document_type" "document_type" NOT NULL,
    "document_number_hash" VARCHAR(64) NOT NULL,
    "document_number_last4" VARCHAR(4),
    "document_number_encrypted" TEXT,
    "issuing_authority" VARCHAR(255),
    "issuing_place" VARCHAR(255),
    "issue_date" DATE,
    "expiry_date" DATE,
    "scan_file_id" UUID,
    "scan_expires_at" TIMESTAMPTZ,
    "verification_status" "document_verification_status" NOT NULL DEFAULT 'SELF_DECLARED',
    "verified_by_account_id" UUID,
    "verified_at" TIMESTAMPTZ,
    "ocr_extracted_data" JSONB,
    "added_by_account_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "identity_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contributions" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "account_id" UUID NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" UUID NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "field_name" VARCHAR(100),
    "old_value" JSONB,
    "new_value" JSONB,
    "note" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contributions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sources" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "person_id" UUID,
    "union_id" UUID,
    "source_type" VARCHAR(50),
    "title" VARCHAR(255),
    "description" TEXT,
    "media_file_id" UUID,
    "audio_transcript" TEXT,
    "added_by_account_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "file_type" VARCHAR(20) NOT NULL,
    "mime_type" VARCHAR(50),
    "file_size_bytes" BIGINT,
    "s3_bucket" VARCHAR(100) NOT NULL,
    "s3_key" VARCHAR(500) NOT NULL,
    "cdn_url" VARCHAR(500),
    "is_encrypted" BOOLEAN NOT NULL DEFAULT false,
    "encryption_key_id" VARCHAR(100),
    "width" INTEGER,
    "height" INTEGER,
    "duration_seconds" INTEGER,
    "uploaded_by_account_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitation_tokens" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "token" VARCHAR(64) NOT NULL,
    "inviter_account_id" UUID NOT NULL,
    "target_person_id" UUID,
    "target_phone_number" VARCHAR(20),
    "relationship_hint" VARCHAR(100),
    "used_at" TIMESTAMPTZ,
    "used_by_account_id" UUID,
    "expires_at" TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '90 days',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invitation_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_requests" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "request_type" VARCHAR(50) NOT NULL,
    "related_entity_type" VARCHAR(50),
    "related_entity_id" UUID,
    "submitted_by_account_id" UUID,
    "submitted_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "priority" INTEGER NOT NULL DEFAULT 5,
    "assigned_moderator_id" UUID,
    "resolved_at" TIMESTAMPTZ,
    "resolution_note" TEXT,
    "data" JSONB,

    CONSTRAINT "verification_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "merge_proposals" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "person_a_id" UUID NOT NULL,
    "person_b_id" UUID NOT NULL,
    "match_score" DECIMAL(3,2) NOT NULL,
    "matching_signals" JSONB,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "proposed_by" VARCHAR(20),
    "proposed_by_account_id" UUID,
    "reviewed_by_account_ids" UUID[] DEFAULT ARRAY[]::UUID[],
    "accepted_by_account_ids" UUID[] DEFAULT ARRAY[]::UUID[],
    "rejected_by_account_ids" UUID[] DEFAULT ARRAY[]::UUID[],
    "resolved_at" TIMESTAMPTZ,
    "resolved_into_person_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "merge_proposals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "account_id" UUID NOT NULL,
    "notification_type" "notification_type" NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "body" TEXT,
    "related_entity_type" VARCHAR(50),
    "related_entity_id" UUID,
    "action_url" VARCHAR(500),
    "channels" TEXT[] DEFAULT ARRAY['push']::TEXT[],
    "sent_at" TIMESTAMPTZ,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_requests" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "phone_number" VARCHAR(20) NOT NULL,
    "otp_hash" VARCHAR(64) NOT NULL,
    "channel" VARCHAR(20) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verified_at" TIMESTAMPTZ,
    "ip_address" INET,
    "device_id" VARCHAR(255),
    "expires_at" TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '5 minutes',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "accounts_phone_number_key" ON "accounts"("phone_number");

-- CreateIndex
CREATE INDEX "idx_persons_soundex" ON "persons"("name_soundex");

-- CreateIndex
CREATE INDEX "idx_persons_metaphone" ON "persons"("name_metaphone");

-- CreateIndex
CREATE INDEX "idx_persons_birth_year" ON "persons"("birth_year_approximate");

-- CreateIndex
CREATE INDEX "idx_persons_village" ON "persons"("village_origin");

-- CreateIndex
CREATE INDEX "idx_persons_claimed" ON "persons"("claimed_by_account_id");

-- CreateIndex
CREATE INDEX "idx_persons_life_status" ON "persons"("life_status");

-- CreateIndex
CREATE INDEX "idx_persons_created_by" ON "persons"("created_by_account_id");

-- CreateIndex
CREATE INDEX "idx_person_names_person" ON "person_names"("person_id");

-- CreateIndex
CREATE INDEX "idx_union_partners_union" ON "union_partners"("union_id");

-- CreateIndex
CREATE INDEX "idx_union_partners_person" ON "union_partners"("person_id");

-- CreateIndex
CREATE UNIQUE INDEX "union_partners_union_id_person_id_key" ON "union_partners"("union_id", "person_id");

-- CreateIndex
CREATE UNIQUE INDEX "parent_child_parent_id_child_id_relationship_type_key" ON "parent_child"("parent_id", "child_id", "relationship_type");

-- CreateIndex
CREATE INDEX "idx_claims_account" ON "claims"("account_id");

-- CreateIndex
CREATE INDEX "idx_claims_person" ON "claims"("person_id");

-- CreateIndex
CREATE INDEX "idx_claims_status" ON "claims"("status");

-- CreateIndex
CREATE UNIQUE INDEX "claims_account_id_person_id_key" ON "claims"("account_id", "person_id");

-- CreateIndex
CREATE INDEX "idx_identity_docs_person" ON "identity_documents"("person_id");

-- CreateIndex
CREATE INDEX "idx_identity_docs_hash" ON "identity_documents"("document_number_hash");

-- CreateIndex
CREATE INDEX "idx_identity_docs_type" ON "identity_documents"("document_type");

-- CreateIndex
CREATE INDEX "idx_contributions_account" ON "contributions"("account_id");

-- CreateIndex
CREATE INDEX "idx_contributions_entity" ON "contributions"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "idx_contributions_created" ON "contributions"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_sources_person" ON "sources"("person_id");

-- CreateIndex
CREATE INDEX "idx_sources_union" ON "sources"("union_id");

-- CreateIndex
CREATE INDEX "idx_media_account" ON "media"("uploaded_by_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "invitation_tokens_token_key" ON "invitation_tokens"("token");

-- CreateIndex
CREATE INDEX "idx_invitation_token" ON "invitation_tokens"("token");

-- CreateIndex
CREATE INDEX "idx_invitation_inviter" ON "invitation_tokens"("inviter_account_id");

-- CreateIndex
CREATE INDEX "idx_invitation_phone" ON "invitation_tokens"("target_phone_number");

-- CreateIndex
CREATE INDEX "idx_verif_status_priority" ON "verification_requests"("status", "priority");

-- CreateIndex
CREATE INDEX "idx_verif_submitted_by" ON "verification_requests"("submitted_by_account_id");

-- CreateIndex
CREATE INDEX "idx_merge_status" ON "merge_proposals"("status");

-- CreateIndex
CREATE INDEX "idx_merge_persons" ON "merge_proposals"("person_a_id", "person_b_id");

-- CreateIndex
CREATE INDEX "idx_notifications_account" ON "notifications"("account_id", "is_read");

-- CreateIndex
CREATE INDEX "idx_notifications_created" ON "notifications"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_otp_phone" ON "otp_requests"("phone_number", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "persons" ADD CONSTRAINT "persons_created_by_account_id_fkey" FOREIGN KEY ("created_by_account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "persons" ADD CONSTRAINT "persons_updated_by_account_id_fkey" FOREIGN KEY ("updated_by_account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "persons" ADD CONSTRAINT "persons_claimed_by_account_id_fkey" FOREIGN KEY ("claimed_by_account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_names" ADD CONSTRAINT "person_names_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unions" ADD CONSTRAINT "unions_created_by_account_id_fkey" FOREIGN KEY ("created_by_account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "union_partners" ADD CONSTRAINT "union_partners_union_id_fkey" FOREIGN KEY ("union_id") REFERENCES "unions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "union_partners" ADD CONSTRAINT "union_partners_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parent_child" ADD CONSTRAINT "parent_child_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parent_child" ADD CONSTRAINT "parent_child_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parent_child" ADD CONSTRAINT "parent_child_union_id_fkey" FOREIGN KEY ("union_id") REFERENCES "unions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parent_child" ADD CONSTRAINT "parent_child_created_by_account_id_fkey" FOREIGN KEY ("created_by_account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_disputed_by_claim_id_fkey" FOREIGN KEY ("disputed_by_claim_id") REFERENCES "claims"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity_documents" ADD CONSTRAINT "identity_documents_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity_documents" ADD CONSTRAINT "identity_documents_added_by_account_id_fkey" FOREIGN KEY ("added_by_account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity_documents" ADD CONSTRAINT "identity_documents_verified_by_account_id_fkey" FOREIGN KEY ("verified_by_account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contributions" ADD CONSTRAINT "contributions_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sources" ADD CONSTRAINT "sources_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sources" ADD CONSTRAINT "sources_union_id_fkey" FOREIGN KEY ("union_id") REFERENCES "unions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sources" ADD CONSTRAINT "sources_added_by_account_id_fkey" FOREIGN KEY ("added_by_account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "media_uploaded_by_account_id_fkey" FOREIGN KEY ("uploaded_by_account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitation_tokens" ADD CONSTRAINT "invitation_tokens_inviter_account_id_fkey" FOREIGN KEY ("inviter_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitation_tokens" ADD CONSTRAINT "invitation_tokens_used_by_account_id_fkey" FOREIGN KEY ("used_by_account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitation_tokens" ADD CONSTRAINT "invitation_tokens_target_person_id_fkey" FOREIGN KEY ("target_person_id") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_requests" ADD CONSTRAINT "verification_requests_submitted_by_account_id_fkey" FOREIGN KEY ("submitted_by_account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_requests" ADD CONSTRAINT "verification_requests_assigned_moderator_id_fkey" FOREIGN KEY ("assigned_moderator_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merge_proposals" ADD CONSTRAINT "merge_proposals_person_a_id_fkey" FOREIGN KEY ("person_a_id") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merge_proposals" ADD CONSTRAINT "merge_proposals_person_b_id_fkey" FOREIGN KEY ("person_b_id") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merge_proposals" ADD CONSTRAINT "merge_proposals_resolved_into_person_id_fkey" FOREIGN KEY ("resolved_into_person_id") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merge_proposals" ADD CONSTRAINT "merge_proposals_proposed_by_account_id_fkey" FOREIGN KEY ("proposed_by_account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

