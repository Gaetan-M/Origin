-- ============================================================================
-- ORIGIN — Migration Supabase (Phase 1)  —  ADDITIVE & IDEMPOTENTE
-- ----------------------------------------------------------------------------
-- Sûr à exécuter sur une base qui CONTIENT DÉJÀ DES DONNÉES :
--   • aucune table/colonne n'est supprimée ou réécrite ;
--   • les lignes existantes sont conservées (les nouvelles colonnes reçoivent
--     une valeur par défaut sûre = PRIVATE_SELF) ;
--   • ré-exécutable sans erreur (tout est gardé par IF NOT EXISTS).
--
-- COMMENT L'UTILISER :
--   1) Dans le SQL Editor de Supabase, colle TOUT ce fichier.
--   2) ⚠️ À la PARTIE 3, remplace le numéro v_phone par TON vrai numéro
--      (format E.164, ex : +2376XXXXXXXX) pour pouvoir recevoir l'OTP.
--   3) Clique sur "Run".
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- PARTIE 1 — Modèle de visibilité (colonnes ajoutées aux tables existantes)
--            Les lignes existantes sont préservées -> défaut PRIVATE_SELF.
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'visibility_scope') THEN
    CREATE TYPE "visibility_scope" AS ENUM ('PRIVATE_SELF', 'FAMILY', 'PUBLIC');
  END IF;
END $$;

ALTER TABLE "sources"
  ADD COLUMN IF NOT EXISTS "visibility_scope" "visibility_scope" NOT NULL DEFAULT 'PRIVATE_SELF',
  ADD COLUMN IF NOT EXISTS "visible_max_degree" INTEGER;

ALTER TABLE "media"
  ADD COLUMN IF NOT EXISTS "visibility_scope" "visibility_scope" NOT NULL DEFAULT 'PRIVATE_SELF',
  ADD COLUMN IF NOT EXISTS "visible_max_degree" INTEGER;

-- ============================================================================
-- PARTIE 2 — Life Events & Fil familial (nouvelles tables)
-- ============================================================================

-- Enum life_event_kind (gardé)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'life_event_kind') THEN
    CREATE TYPE "life_event_kind" AS ENUM ('BIRTH', 'DEATH', 'UNION');
  END IF;
END $$;

-- Table: life_events
CREATE TABLE IF NOT EXISTS "life_events" (
  "id"                     UUID            NOT NULL DEFAULT uuid_generate_v4(),
  "kind"                   "life_event_kind" NOT NULL,
  "primary_person_id"      UUID            NOT NULL,
  "union_id"               UUID,
  "occurred_at"            TIMESTAMPTZ,
  "occurred_at_precision"  "date_precision" NOT NULL DEFAULT 'UNKNOWN',
  "created_by_account_id"  UUID            NOT NULL,
  "visibility_scope"       "visibility_scope" NOT NULL DEFAULT 'FAMILY',
  "visible_max_degree"     INTEGER,
  "created_at"             TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  "updated_at"             TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  "deleted_at"             TIMESTAMPTZ,
  CONSTRAINT "life_events_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'life_events_primary_person_id_fkey') THEN
    ALTER TABLE "life_events" ADD CONSTRAINT "life_events_primary_person_id_fkey"
      FOREIGN KEY ("primary_person_id") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'life_events_union_id_fkey') THEN
    ALTER TABLE "life_events" ADD CONSTRAINT "life_events_union_id_fkey"
      FOREIGN KEY ("union_id") REFERENCES "unions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'life_events_created_by_account_id_fkey') THEN
    ALTER TABLE "life_events" ADD CONSTRAINT "life_events_created_by_account_id_fkey"
      FOREIGN KEY ("created_by_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_life_events_primary_person" ON "life_events" ("primary_person_id");
CREATE INDEX IF NOT EXISTS "idx_life_events_union" ON "life_events" ("union_id");
CREATE INDEX IF NOT EXISTS "idx_life_events_created_by" ON "life_events" ("created_by_account_id");
CREATE INDEX IF NOT EXISTS "idx_life_events_kind" ON "life_events" ("kind");
CREATE INDEX IF NOT EXISTS "idx_life_events_created" ON "life_events" ("created_at" DESC);

-- Table: life_event_participants
CREATE TABLE IF NOT EXISTS "life_event_participants" (
  "id"             UUID        NOT NULL DEFAULT uuid_generate_v4(),
  "life_event_id"  UUID        NOT NULL,
  "person_id"      UUID        NOT NULL,
  "role"           VARCHAR(50) NOT NULL,
  "created_at"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "life_event_participants_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'life_event_participants_life_event_id_fkey') THEN
    ALTER TABLE "life_event_participants" ADD CONSTRAINT "life_event_participants_life_event_id_fkey"
      FOREIGN KEY ("life_event_id") REFERENCES "life_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'life_event_participants_person_id_fkey') THEN
    ALTER TABLE "life_event_participants" ADD CONSTRAINT "life_event_participants_person_id_fkey"
      FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "uq_life_event_participant" ON "life_event_participants" ("life_event_id", "person_id", "role");
CREATE INDEX IF NOT EXISTS "idx_life_event_participants_event" ON "life_event_participants" ("life_event_id");
CREATE INDEX IF NOT EXISTS "idx_life_event_participants_person" ON "life_event_participants" ("person_id");

-- Table: feed_posts
CREATE TABLE IF NOT EXISTS "feed_posts" (
  "id"                  UUID            NOT NULL DEFAULT uuid_generate_v4(),
  "life_event_id"       UUID,
  "author_account_id"   UUID            NOT NULL,
  "subject_person_id"   UUID,
  "post_type"           VARCHAR(50)     NOT NULL,
  "body"                TEXT,
  "visibility_scope"    "visibility_scope" NOT NULL DEFAULT 'FAMILY',
  "visible_max_degree"  INTEGER,
  "created_at"          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  "updated_at"          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  "deleted_at"          TIMESTAMPTZ,
  CONSTRAINT "feed_posts_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'feed_posts_life_event_id_fkey') THEN
    ALTER TABLE "feed_posts" ADD CONSTRAINT "feed_posts_life_event_id_fkey"
      FOREIGN KEY ("life_event_id") REFERENCES "life_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'feed_posts_author_account_id_fkey') THEN
    ALTER TABLE "feed_posts" ADD CONSTRAINT "feed_posts_author_account_id_fkey"
      FOREIGN KEY ("author_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'feed_posts_subject_person_id_fkey') THEN
    ALTER TABLE "feed_posts" ADD CONSTRAINT "feed_posts_subject_person_id_fkey"
      FOREIGN KEY ("subject_person_id") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_feed_posts_subject_person" ON "feed_posts" ("subject_person_id");
CREATE INDEX IF NOT EXISTS "idx_feed_posts_author" ON "feed_posts" ("author_account_id");
CREATE INDEX IF NOT EXISTS "idx_feed_posts_life_event" ON "feed_posts" ("life_event_id");
CREATE INDEX IF NOT EXISTS "idx_feed_posts_visibility_created" ON "feed_posts" ("visibility_scope", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_feed_posts_created" ON "feed_posts" ("created_at" DESC);

-- Table: feed_reactions
CREATE TABLE IF NOT EXISTS "feed_reactions" (
  "id"             UUID        NOT NULL DEFAULT uuid_generate_v4(),
  "feed_post_id"   UUID        NOT NULL,
  "account_id"     UUID        NOT NULL,
  "reaction_type"  VARCHAR(30) NOT NULL,
  "created_at"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "deleted_at"     TIMESTAMPTZ,
  CONSTRAINT "feed_reactions_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'feed_reactions_feed_post_id_fkey') THEN
    ALTER TABLE "feed_reactions" ADD CONSTRAINT "feed_reactions_feed_post_id_fkey"
      FOREIGN KEY ("feed_post_id") REFERENCES "feed_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'feed_reactions_account_id_fkey') THEN
    ALTER TABLE "feed_reactions" ADD CONSTRAINT "feed_reactions_account_id_fkey"
      FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "uq_feed_reaction" ON "feed_reactions" ("feed_post_id", "account_id", "reaction_type");
CREATE INDEX IF NOT EXISTS "idx_feed_reactions_post" ON "feed_reactions" ("feed_post_id");
CREATE INDEX IF NOT EXISTS "idx_feed_reactions_account" ON "feed_reactions" ("account_id");

-- Table: feed_comments
CREATE TABLE IF NOT EXISTS "feed_comments" (
  "id"             UUID        NOT NULL DEFAULT uuid_generate_v4(),
  "feed_post_id"   UUID        NOT NULL,
  "account_id"     UUID        NOT NULL,
  "body"           TEXT        NOT NULL,
  "created_at"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "deleted_at"     TIMESTAMPTZ,
  CONSTRAINT "feed_comments_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'feed_comments_feed_post_id_fkey') THEN
    ALTER TABLE "feed_comments" ADD CONSTRAINT "feed_comments_feed_post_id_fkey"
      FOREIGN KEY ("feed_post_id") REFERENCES "feed_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'feed_comments_account_id_fkey') THEN
    ALTER TABLE "feed_comments" ADD CONSTRAINT "feed_comments_account_id_fkey"
      FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_feed_comments_post" ON "feed_comments" ("feed_post_id");
CREATE INDEX IF NOT EXISTS "idx_feed_comments_account" ON "feed_comments" ("account_id");

-- ============================================================================
-- PARTIE 3 — Compte ADMIN (SUPER_ADMIN) pour explorer la plateforme
-- ----------------------------------------------------------------------------
-- Connexion = téléphone + OTP (pas de mot de passe). Mets TON vrai numéro pour
-- recevoir le code OTP par SMS/WhatsApp. Idempotent : ré-exécutable sans doublon
-- (si le compte existe déjà, il est simplement promu SUPER_ADMIN).
-- ============================================================================
DO $$
DECLARE
  v_phone   text := '+237655922472';   -- numéro admin (= numéro du bypass OTP 111111)
  v_name    text := 'Admin Origin';
  v_account uuid;
  v_person  uuid;
BEGIN
  -- 1) Compte admin (créé, ou promu s'il existe déjà)
  INSERT INTO "accounts"
    (phone_number, phone_country_code, role, role_assigned_at, full_name, language_preference, is_active)
  VALUES
    (v_phone, '+237', 'SUPER_ADMIN', NOW(), v_name, 'fr', TRUE)
  ON CONFLICT (phone_number) DO UPDATE
    SET role = 'SUPER_ADMIN', role_assigned_at = NOW(), is_active = TRUE, deleted_at = NULL
  RETURNING id INTO v_account;

  -- 2) (Option) Nœud Person + claim VÉRIFIÉ lié à l'admin, pour explorer le
  --    graphe et le fil familial en étant "quelqu'un" dans l'arbre.
  --    Idempotent : seulement si l'admin n'a pas déjà un claim vérifié.
  IF NOT EXISTS (SELECT 1 FROM "claims" WHERE account_id = v_account AND status = 'VERIFIED') THEN
    INSERT INTO "persons"
      (display_name, normalized_name, life_status, verification_level,
       created_by_account_id, claimed_by_account_id, claim_verified_at, is_public)
    VALUES
      (v_name, lower(v_name), 'ALIVE', 'ADMIN_VERIFIED',
       v_account, v_account, NOW(), FALSE)
    RETURNING id INTO v_person;

    INSERT INTO "claims" (account_id, person_id, status, verification_level)
    VALUES (v_account, v_person, 'VERIFIED', 'ADMIN_VERIFIED')
    ON CONFLICT (account_id, person_id) DO NOTHING;
  END IF;

  RAISE NOTICE 'Admin prêt : % | role=SUPER_ADMIN | phone=%', v_name, v_phone;
END $$;

COMMIT;

-- ============================================================================
-- VÉRIFICATION (lecture seule) — exécute ces lignes pour confirmer
-- ============================================================================
SELECT id, phone_number, role, full_name
FROM   "accounts"
WHERE  role = 'SUPER_ADMIN';

SELECT table_name
FROM   information_schema.tables
WHERE  table_schema = 'public'
  AND  table_name IN ('life_events','life_event_participants','feed_posts','feed_reactions','feed_comments')
ORDER  BY table_name;
