import { Injectable } from '@nestjs/common';

/**
 * A bilingual (FR/EN) human relationship label derived from a graph degree.
 */
export interface RelationshipLabel {
  fr: string;
  en: string;
}

/**
 * RelationshipLabelService
 *
 * Pure, dependency-free service that converts a *graph degree* (the bounded
 * BFS distance between two person nodes in the unified family graph, as
 * produced by GraphDegreeService) into a warm, respectful, non-clinical
 * bilingual relationship phrase.
 *
 * PRIVACY: this service NEVER receives or returns names, person ids, ancestors
 * or any path. It maps a single integer (or null) to a human label. That is the
 * only information ever exposed to either user about their kinship.
 *
 * NOTE (future enhancement): finer-grained labels — e.g. distinguishing a
 * maternal uncle (oncle maternel) from a paternal uncle (oncle paternel), or a
 * grandparent from a sibling at the same degree — require structural
 * information (lineage side, generational direction, union vs. blood link) that
 * a single scalar degree cannot carry. Those richer labels are intentionally
 * out of scope here and should be layered on later by passing structured path
 * metadata, WITHOUT ever exposing names or the path itself to the end user.
 */
@Injectable()
export class RelationshipLabelService {
  /**
   * Convert a graph degree into a bilingual relationship label.
   *
   * @param degree the BFS degree between the two nodes, or null when no link
   *   was found within the bounded search depth. A degree <= 0 is treated as
   *   "no distinct link" and yields the same "no link" label (a person is never
   *   their own relative for the purpose of this feature).
   */
  label(degree: number | null): RelationshipLabel {
    if (degree === null || !Number.isFinite(degree) || degree <= 0) {
      return {
        fr: 'Aucun lien de parenté trouvé',
        en: 'No family link found',
      };
    }

    const d = Math.floor(degree);

    switch (d) {
      case 1:
        return {
          fr: 'Proche parent (parent, enfant ou conjoint)',
          en: 'Close relative (parent, child or spouse)',
        };
      case 2:
        return {
          fr: 'Parent au 2e degré (frère/sœur, grand-parent, petit-enfant...)',
          en: 'Second-degree relative (sibling, grandparent, grandchild...)',
        };
      case 3:
        return {
          fr: 'Cousin ou parent au 3e degré (oncle/tante, neveu/nièce...)',
          en: 'Cousin or third-degree relative (uncle/aunt, nephew/niece...)',
        };
      case 4:
        return {
          fr: 'Cousin éloigné (parent au 4e degré)',
          en: 'Distant cousin (fourth-degree relative)',
        };
      default:
        return {
          fr: `Parent très éloigné (${d}e degré)`,
          en: `Very distant relative (${this.ordinalEn(d)} degree)`,
        };
    }
  }

  /**
   * English ordinal suffix for the degree number used in the ">= 5" label.
   * Kept private and tiny — purely cosmetic, no business logic.
   */
  private ordinalEn(n: number): string {
    const tens = n % 100;
    const units = n % 10;
    let suffix = 'th';
    if (tens < 11 || tens > 13) {
      if (units === 1) suffix = 'st';
      else if (units === 2) suffix = 'nd';
      else if (units === 3) suffix = 'rd';
    }
    return `${n}${suffix}`;
  }
}
