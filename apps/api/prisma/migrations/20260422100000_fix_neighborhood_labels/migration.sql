-- Fix get_family_neighborhood: track up/down/spouse counts
-- to correctly label mixed paths (siblings, uncle/aunt, cousins, etc.)
-- Previously, the label was based only on the last edge direction + total degree,
-- which incorrectly labeled e.g. siblings (UP then DOWN) as GRANDCHILD.

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
        ARRAY[person_uuid] AS pth,
        0 AS up_count,
        0 AS down_count,
        0 AS spouse_count

      UNION ALL

      SELECT
        e.to_id AS pid,
        CASE
          -- Direct spouse (degree 1)
          WHEN e.direction = 'SPOUSE' AND n.deg = 0
            THEN 'SPOUSE'

          -- Pure UP path = ancestors
          WHEN e.direction = 'UP' AND n.down_count = 0 AND n.spouse_count = 0
            THEN CASE n.up_count + 1
              WHEN 1 THEN 'PARENT'
              WHEN 2 THEN 'GRANDPARENT'
              WHEN 3 THEN 'GREAT_GRANDPARENT'
              ELSE 'ANCESTOR_' || (n.up_count + 1)
            END

          -- Pure DOWN path = descendants
          WHEN e.direction = 'DOWN' AND n.up_count = 0 AND n.spouse_count = 0
            THEN CASE n.down_count + 1
              WHEN 1 THEN 'CHILD'
              WHEN 2 THEN 'GRANDCHILD'
              WHEN 3 THEN 'GREAT_GRANDCHILD'
              ELSE 'DESCENDANT_' || (n.down_count + 1)
            END

          -- UP then DOWN = lateral relatives (siblings, cousins, uncle/aunt, nephew/niece)
          WHEN e.direction = 'DOWN' AND n.up_count > 0 AND n.spouse_count = 0
            THEN CASE
              WHEN n.up_count = 1 AND n.down_count + 1 = 1 THEN 'SIBLING'
              WHEN n.up_count = 2 AND n.down_count + 1 = 1 THEN 'UNCLE_AUNT'
              WHEN n.up_count = 1 AND n.down_count + 1 = 2 THEN 'NEPHEW_NIECE'
              WHEN n.up_count = n.down_count + 1 THEN 'COUSIN'
              ELSE 'RELATIVE'
            END

          -- Any path involving a spouse edge (in-laws, step-relatives)
          WHEN e.direction = 'SPOUSE' OR n.spouse_count > 0
            THEN 'SPOUSE'

          ELSE 'RELATIVE'
        END AS rlabel,
        n.deg + 1 AS deg,
        n.pth || e.to_id AS pth,
        n.up_count + CASE WHEN e.direction = 'UP' THEN 1 ELSE 0 END AS up_count,
        n.down_count + CASE WHEN e.direction = 'DOWN' THEN 1 ELSE 0 END AS down_count,
        n.spouse_count + CASE WHEN e.direction = 'SPOUSE' THEN 1 ELSE 0 END AS spouse_count
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
