-- ============================================================================
-- PRÉREQUIS Découvrir — à exécuter AVANT docs/seed-discover-culture.sql
-- ----------------------------------------------------------------------------
-- Ajoute la colonne image_url (cartes postales) et la valeur d'enum PEOPLE
-- (profils de peuples). Idempotent. PostgreSQL interdit d'utiliser une nouvelle
-- valeur d'enum dans la MÊME transaction que son ajout — d'où ce fichier séparé
-- qui committe l'enum avant que le seed s'en serve.
-- À exécuter dans Supabase > SQL Editor (sans danger si re-exécuté).
-- ============================================================================

ALTER TABLE "cultural_content" ADD COLUMN IF NOT EXISTS "image_url" VARCHAR(500);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'cultural_content_type' AND e.enumlabel = 'PEOPLE'
  ) THEN
    ALTER TYPE "cultural_content_type" ADD VALUE 'PEOPLE';
  END IF;
END
$$;

-- Vérif : doit lister la valeur 'PEOPLE'
SELECT enumlabel FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
WHERE t.typname = 'cultural_content_type' ORDER BY e.enumsortorder;
