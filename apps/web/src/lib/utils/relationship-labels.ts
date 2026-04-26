/**
 * Converts a structural relationship label + gender into a human-readable French label.
 * The relationship label comes from the backend (get_family_neighborhood function)
 * and represents the relationship relative to the center person of the tree.
 *
 * Examples:
 *   getRelationshipLabel('PARENT', 'M')  → 'Papa'
 *   getRelationshipLabel('PARENT', 'F')  → 'Mama'
 *   getRelationshipLabel('GRANDPARENT', 'M') → 'Grand-pere'
 *   getRelationshipLabel('CHILD', 'F')   → 'Fille'
 */

const LABELS: Record<string, { M: string; F: string; default: string }> = {
  PARENT: { M: 'Papa', F: 'Mama', default: 'Parent' },
  CHILD: { M: 'Fils', F: 'Fille', default: 'Enfant' },
  GRANDPARENT: { M: 'Grand-pere', F: 'Grand-mere', default: 'Grand-parent' },
  GRANDCHILD: { M: 'Petit-fils', F: 'Petite-fille', default: 'Petit-enfant' },
  GREAT_GRANDPARENT: { M: 'Arriere-grand-pere', F: 'Arriere-grand-mere', default: 'Arriere-grand-parent' },
  GREAT_GRANDCHILD: { M: 'Arriere-petit-fils', F: 'Arriere-petite-fille', default: 'Arriere-petit-enfant' },
  SPOUSE: { M: 'Epoux', F: 'Epouse', default: 'Conjoint(e)' },
  SIBLING: { M: 'Frere', F: 'Soeur', default: 'Frere/Soeur' },
  UNCLE_AUNT: { M: 'Oncle', F: 'Tante', default: 'Oncle/Tante' },
  NEPHEW_NIECE: { M: 'Neveu', F: 'Niece', default: 'Neveu/Niece' },
  COUSIN: { M: 'Cousin', F: 'Cousine', default: 'Cousin(e)' },
  RELATIVE: { M: 'Parent', F: 'Parente', default: 'Parente' },
  SELF: { M: 'Moi', F: 'Moi', default: 'Moi' },
};

export function getRelationshipLabel(relationshipLabel: string, gender?: string | null): string {
  // Handle ANCESTOR_N / DESCENDANT_N patterns
  if (relationshipLabel.startsWith('ANCESTOR_')) {
    const gen = relationshipLabel.replace('ANCESTOR_', '');
    const prefix = gender === 'M' ? 'Ancetre' : gender === 'F' ? 'Ancetre' : 'Ancetre';
    return `${prefix} (gen. ${gen})`;
  }
  if (relationshipLabel.startsWith('DESCENDANT_')) {
    const gen = relationshipLabel.replace('DESCENDANT_', '');
    const prefix = gender === 'M' ? 'Descendant' : gender === 'F' ? 'Descendante' : 'Descendant(e)';
    return `${prefix} (gen. ${gen})`;
  }

  const entry = LABELS[relationshipLabel];
  if (!entry) return relationshipLabel;

  if (gender === 'M') return entry.M;
  if (gender === 'F') return entry.F;
  return entry.default;
}

/**
 * Direct relationship choices for adding relationships from a person's profile.
 * These are the only relationship types users can create directly.
 * More distant relationships (grandparent, etc.) are derived from the graph.
 */
export const ADD_RELATIONSHIP_CHOICES = [
  { key: 'father', label: 'Papa', direction: 'parent' as const, gender: 'M' },
  { key: 'mother', label: 'Mama', direction: 'parent' as const, gender: 'F' },
  { key: 'son', label: 'Fils', direction: 'child' as const, gender: 'M' },
  { key: 'daughter', label: 'Fille', direction: 'child' as const, gender: 'F' },
  { key: 'spouse', label: 'Conjoint(e)', direction: 'spouse' as const, gender: null },
];
