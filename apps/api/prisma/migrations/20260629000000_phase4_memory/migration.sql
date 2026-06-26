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
