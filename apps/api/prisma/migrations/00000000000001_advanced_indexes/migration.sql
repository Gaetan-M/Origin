-- Advanced indexes, check constraints, functions and triggers
-- These cannot be expressed in Prisma schema natively

-- ============================================
-- 1. EXTENSIONS (ensure they exist)
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "fuzzystrmatch";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- ============================================
-- 2. GIN TRIGRAM INDEXES (fuzzy search)
-- ============================================
CREATE INDEX idx_persons_name_trgm ON persons USING gin (normalized_name gin_trgm_ops);
CREATE INDEX idx_person_names_normalized_trgm ON person_names USING gin (normalized_full_name gin_trgm_ops);

-- ============================================
-- 3. PARTIAL INDEXES
-- ============================================
CREATE INDEX idx_accounts_phone ON accounts(phone_number) WHERE deleted_at IS NULL;
CREATE INDEX idx_accounts_active ON accounts(is_active) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX idx_claims_one_verified_per_person ON claims(person_id) WHERE status = 'VERIFIED';
CREATE UNIQUE INDEX idx_identity_docs_unique_hash ON identity_documents(document_type, document_number_hash) WHERE deleted_at IS NULL;
CREATE INDEX idx_parent_child_parent ON parent_child(parent_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_parent_child_child ON parent_child(child_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_media_expires ON media(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_otp_expires ON otp_requests(expires_at) WHERE verified = FALSE;

-- ============================================
-- 4. CHECK CONSTRAINTS
-- ============================================
ALTER TABLE persons ADD CONSTRAINT chk_deceased_coherent CHECK (
  life_status != 'DECEASED' OR
  deceased_date IS NOT NULL OR
  deceased_year_approximate IS NOT NULL OR
  deceased_date_text IS NOT NULL OR
  deceased_assumed = TRUE
);

ALTER TABLE merge_proposals ADD CONSTRAINT chk_merge_person_order CHECK (
  person_a_id < person_b_id
);

ALTER TABLE persons ADD CONSTRAINT chk_gender_values CHECK (
  gender IS NULL OR gender IN ('M', 'F', 'O', 'U')
);

-- ============================================
-- 5. PL/pgSQL FUNCTIONS
-- ============================================

-- Function: normalize_name
CREATE OR REPLACE FUNCTION normalize_name(name TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN lower(unaccent(trim(name)));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function: update_updated_at_column (trigger function)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function: get_ancestors
CREATE OR REPLACE FUNCTION get_ancestors(person_uuid UUID, max_generations INTEGER DEFAULT 5)
RETURNS TABLE(ancestor_id UUID, generation INTEGER, path UUID[]) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE ancestors AS (
    -- Base case: direct parents
    SELECT
      pc.parent_id AS ancestor_id,
      1 AS generation,
      ARRAY[person_uuid, pc.parent_id] AS path
    FROM parent_child pc
    WHERE pc.child_id = person_uuid
      AND pc.deleted_at IS NULL

    UNION ALL

    -- Recursive case: parents of parents
    SELECT
      pc.parent_id AS ancestor_id,
      a.generation + 1 AS generation,
      a.path || pc.parent_id AS path
    FROM ancestors a
    JOIN parent_child pc ON pc.child_id = a.ancestor_id
    WHERE pc.deleted_at IS NULL
      AND a.generation < max_generations
      AND NOT pc.parent_id = ANY(a.path)  -- prevent cycles
  )
  SELECT DISTINCT ON (ancestors.ancestor_id)
    ancestors.ancestor_id,
    ancestors.generation,
    ancestors.path
  FROM ancestors
  ORDER BY ancestors.ancestor_id, ancestors.generation;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function: get_descendants
CREATE OR REPLACE FUNCTION get_descendants(person_uuid UUID, max_generations INTEGER DEFAULT 5)
RETURNS TABLE(descendant_id UUID, generation INTEGER, path UUID[]) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE descendants AS (
    -- Base case: direct children
    SELECT
      pc.child_id AS descendant_id,
      1 AS generation,
      ARRAY[person_uuid, pc.child_id] AS path
    FROM parent_child pc
    WHERE pc.parent_id = person_uuid
      AND pc.deleted_at IS NULL

    UNION ALL

    -- Recursive case: children of children
    SELECT
      pc.child_id AS descendant_id,
      d.generation + 1 AS generation,
      d.path || pc.child_id AS path
    FROM descendants d
    JOIN parent_child pc ON pc.parent_id = d.descendant_id
    WHERE pc.deleted_at IS NULL
      AND d.generation < max_generations
      AND NOT pc.child_id = ANY(d.path)  -- prevent cycles
  )
  SELECT DISTINCT ON (descendants.descendant_id)
    descendants.descendant_id,
    descendants.generation,
    descendants.path
  FROM descendants
  ORDER BY descendants.descendant_id, descendants.generation;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function: get_family_neighborhood
-- Uses a pre-computed edges CTE to avoid multiple recursive UNION ALL branches
-- (PostgreSQL treats all but the last UNION ALL as non-recursive terms)
CREATE OR REPLACE FUNCTION get_family_neighborhood(person_uuid UUID, max_degrees INTEGER DEFAULT 2)
RETURNS TABLE(person_id UUID, relationship_label TEXT, degree INTEGER, path UUID[]) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE
    edges AS (
      SELECT pc.child_id AS from_id, pc.parent_id AS to_id, 'UP'::TEXT AS direction
      FROM parent_child pc
      WHERE pc.deleted_at IS NULL

      UNION ALL

      SELECT pc.parent_id AS from_id, pc.child_id AS to_id, 'DOWN'::TEXT AS direction
      FROM parent_child pc
      WHERE pc.deleted_at IS NULL

      UNION ALL

      SELECT up1.person_id AS from_id, up2.person_id AS to_id, 'SPOUSE'::TEXT AS direction
      FROM union_partners up1
      JOIN union_partners up2 ON up2.union_id = up1.union_id AND up2.person_id != up1.person_id
      JOIN unions u ON u.id = up1.union_id
      WHERE u.deleted_at IS NULL
    ),
    neighborhood AS (
      SELECT
        person_uuid AS pid,
        'SELF'::TEXT AS rlabel,
        0 AS deg,
        ARRAY[person_uuid] AS pth

      UNION ALL

      SELECT
        e.to_id AS pid,
        CASE e.direction
          WHEN 'UP' THEN
            CASE n.deg + 1
              WHEN 1 THEN 'PARENT'
              WHEN 2 THEN 'GRANDPARENT'
              WHEN 3 THEN 'GREAT_GRANDPARENT'
              ELSE 'ANCESTOR_' || (n.deg + 1)
            END
          WHEN 'DOWN' THEN
            CASE n.deg + 1
              WHEN 1 THEN 'CHILD'
              WHEN 2 THEN 'GRANDCHILD'
              WHEN 3 THEN 'GREAT_GRANDCHILD'
              ELSE 'DESCENDANT_' || (n.deg + 1)
            END
          WHEN 'SPOUSE' THEN 'SPOUSE'
        END AS rlabel,
        n.deg + 1 AS deg,
        n.pth || e.to_id AS pth
      FROM neighborhood n
      JOIN edges e ON e.from_id = n.pid
      WHERE n.deg + 1 <= max_degrees
        AND NOT e.to_id = ANY(n.pth)
    )
  SELECT DISTINCT ON (neighborhood.pid)
    neighborhood.pid,
    neighborhood.rlabel,
    neighborhood.deg,
    neighborhood.pth
  FROM neighborhood
  WHERE neighborhood.pid != person_uuid
  ORDER BY neighborhood.pid, neighborhood.deg;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- 6. TRIGGERS (updated_at auto-update)
-- ============================================
CREATE TRIGGER trigger_accounts_updated_at
  BEFORE UPDATE ON accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_persons_updated_at
  BEFORE UPDATE ON persons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_unions_updated_at
  BEFORE UPDATE ON unions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_parent_child_updated_at
  BEFORE UPDATE ON parent_child
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_claims_updated_at
  BEFORE UPDATE ON claims
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_identity_docs_updated_at
  BEFORE UPDATE ON identity_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_person_names_updated_at
  BEFORE UPDATE ON person_names
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
