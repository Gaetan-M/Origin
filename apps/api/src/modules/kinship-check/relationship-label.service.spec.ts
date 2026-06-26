import { RelationshipLabelService } from './relationship-label.service';

describe('RelationshipLabelService', () => {
  let service: RelationshipLabelService;

  beforeEach(() => {
    service = new RelationshipLabelService();
  });

  describe('no link', () => {
    it('returns the "no link" label for null', () => {
      expect(service.label(null)).toEqual({
        fr: 'Aucun lien de parenté trouvé',
        en: 'No family link found',
      });
    });

    it('treats degree 0 as no distinct link', () => {
      expect(service.label(0)).toEqual({
        fr: 'Aucun lien de parenté trouvé',
        en: 'No family link found',
      });
    });

    it('treats negative degrees as no link (defensive)', () => {
      expect(service.label(-3)).toEqual({
        fr: 'Aucun lien de parenté trouvé',
        en: 'No family link found',
      });
    });

    it('treats non-finite degrees as no link (defensive)', () => {
      expect(service.label(Number.NaN)).toEqual({
        fr: 'Aucun lien de parenté trouvé',
        en: 'No family link found',
      });
      expect(service.label(Number.POSITIVE_INFINITY)).toEqual({
        fr: 'Aucun lien de parenté trouvé',
        en: 'No family link found',
      });
    });
  });

  describe('close degrees', () => {
    it('labels degree 1 as a close relative', () => {
      const label = service.label(1);
      expect(label.fr).toBe('Proche parent (parent, enfant ou conjoint)');
      expect(label.en).toBe('Close relative (parent, child or spouse)');
    });

    it('labels degree 2 as second-degree', () => {
      const label = service.label(2);
      expect(label.fr).toContain('2e degré');
      expect(label.en).toContain('Second-degree');
    });

    it('labels degree 3 as cousin / third-degree', () => {
      const label = service.label(3);
      expect(label.fr).toContain('3e degré');
      expect(label.fr.toLowerCase()).toContain('cousin');
      expect(label.en).toContain('third-degree');
    });

    it('labels degree 4 as a distant cousin', () => {
      const label = service.label(4);
      expect(label.fr).toContain('4e degré');
      expect(label.en).toContain('fourth-degree');
    });
  });

  describe('far degrees (>= 5)', () => {
    it('labels degree 5 as a very distant relative with ordinal', () => {
      const label = service.label(5);
      expect(label.fr).toBe('Parent très éloigné (5e degré)');
      expect(label.en).toBe('Very distant relative (5th degree)');
    });

    it('uses correct English ordinals for larger degrees', () => {
      expect(service.label(6).en).toBe('Very distant relative (6th degree)');
      expect(service.label(11).en).toBe('Very distant relative (11th degree)');
      expect(service.label(21).en).toBe('Very distant relative (21st degree)');
      expect(service.label(22).en).toBe('Very distant relative (22nd degree)');
      expect(service.label(23).en).toBe('Very distant relative (23rd degree)');
    });

    it('always carries the degree in the French phrase', () => {
      expect(service.label(7).fr).toBe('Parent très éloigné (7e degré)');
    });
  });

  describe('robustness', () => {
    it('floors fractional degrees before labelling', () => {
      expect(service.label(2.9)).toEqual(service.label(2));
    });

    it('PRIVACY: never leaks anything beyond the bilingual phrase', () => {
      const label = service.label(3);
      expect(Object.keys(label).sort()).toEqual(['en', 'fr']);
    });
  });
});
