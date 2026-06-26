/**
 * Service-level integration spec for the Phase-6 TOURISM + LEARNING world.
 *
 * It drives the executable contract (`support/phase6-reference.ts`) over a
 * single in-memory Prisma double (`support/phase6-prisma-mock.ts`), so it
 * validates the agreed Phase-6 business rules end-to-end with only the database
 * layer faked — and is independent of any controller/HTTP wiring the integrator
 * still has to register. Mirrors the philosophy of public-culture.e2e-spec.ts
 * and phase5-live.e2e-spec.ts: real (reference) logic, faked database, no HTTP.
 *
 * Every assertion here is a clause the production TourismService /
 * LearningService MUST keep green once they land. See docs/PHASE6-TESTPLAN.md.
 *
 * Invariants under test:
 *   1. A tourism place carries its provenance (source + source_ref) and the
 *      public listing ranks VERIFIED sources first.
 *   2. Only a moderator+ may verify a place; an ordinary account is forbidden,
 *      and the place's verified flag never flips. (Independence: no government
 *      self-certification, no coupling to the family graph.)
 *   3. A verified-authority lesson auto-APPROVES and appears in the public
 *      listing; a normal author's lesson is PENDING and hidden until approved.
 *   4. Enrollment is an idempotent UPSERT, and marking progress to 100 stamps
 *      completed_at exactly once.
 */
import {
  createPhase6PrismaMock,
  Phase6PrismaMock,
} from './support/phase6-prisma-mock';
import {
  Actor,
  CreateLessonInput,
  CreatePlaceInput,
  LearningReferenceService,
  Phase6Error,
  TourismReferenceService,
} from './support/phase6-reference';

/**
 * Fields that must NEVER appear on a tourism place — independence forbids any
 * coupling between the (PUBLIC, official/NGO-sourced) tourism layer and the
 * private family graph or person data.
 */
const FORBIDDEN_PLACE_KEYS = [
  'personId',
  'subjectPersonId',
  'relationships',
  'parentChild',
  'degree',
  'phoneNumber',
  'phone',
  'cni',
];

describe('Phase-6 tourism + learning (integration)', () => {
  let mock: Phase6PrismaMock;
  let tourism: TourismReferenceService;
  let learning: LearningReferenceService;

  const moderator = (accountId: string): Actor => ({
    accountId,
    role: 'MODERATOR',
  });
  const user = (accountId: string): Actor => ({ accountId, role: 'USER' });

  const placeInput = (
    overrides: Partial<CreatePlaceInput> = {},
  ): CreatePlaceInput => ({
    name: 'Chefferie de Bandjoun',
    description: 'A historic palace and museum in the West region.',
    region: 'Ouest',
    category: 'CHEFFERIE',
    source: 'MINISTRY',
    sourceRef: 'https://mintour.gov.cm/sites/bandjoun',
    latitude: 5.3686,
    longitude: 10.4,
    ...overrides,
  });

  const lessonInput = (
    overrides: Partial<CreateLessonInput> = {},
  ): CreateLessonInput => ({
    title: 'Les salutations en Ghomala',
    description: 'Greetings in Ghomala for beginners.',
    content: 'Lesson body...',
    languageCode: 'bbj',
    level: 'BEGINNER',
    ethnicGroup: 'Bamiléké',
    ...overrides,
  });

  beforeEach(() => {
    mock = createPhase6PrismaMock();
    const prisma = mock.prisma as never;
    tourism = new TourismReferenceService(prisma);
    learning = new LearningReferenceService(prisma);
  });

  // -------------------------------------------------------------------------
  // 1. Provenance + verified-first ordering.
  // -------------------------------------------------------------------------
  describe('tourism provenance + discovery ordering', () => {
    it('persists the cited provenance (source + source_ref) verbatim and starts UNVERIFIED + PUBLIC', async () => {
      const submitter = mock.seedAccount();

      const place = await tourism.createPlace(placeInput(), submitter.id);

      // Provenance is carried strictly as a cited source.
      expect(place.source).toBe('MINISTRY');
      expect(place.sourceRef).toBe('https://mintour.gov.cm/sites/bandjoun');
      // Sources are never self-certified on submit.
      expect(place.verified).toBe(false);
      expect(place.verifiedByAccountId).toBeNull();
      // Surfaced PUBLIC, attributed to the submitter.
      expect(place.visibilityScope).toBe('PUBLIC');
      expect(place.submittedByAccountId).toBe(submitter.id);

      // A Contribution audit row captures the provenance.
      const audit = mock.db.contributions.find(
        (c) => c.entityType === 'tourism_place' && c.entityId === place.id,
      );
      expect(audit?.action).toBe('CREATE');
      expect(audit?.accountId).toBe(submitter.id);
      expect(audit?.newValue).toMatchObject({
        source: 'MINISTRY',
        sourceRef: 'https://mintour.gov.cm/sites/bandjoun',
      });
    });

    it('never couples a place to private person / family-graph data', async () => {
      const submitter = mock.seedAccount({ phoneNumber: '+237699112233' });
      const place = await tourism.createPlace(placeInput(), submitter.id);

      for (const forbidden of FORBIDDEN_PLACE_KEYS) {
        expect(place).not.toHaveProperty(forbidden);
      }
      // The submitter's phone number must never ride along on the place row.
      expect(JSON.stringify(place)).not.toContain('+237699112233');
    });

    it('ranks VERIFIED sources first in the public discovery listing', async () => {
      const submitter = mock.seedAccount();
      const mod = mock.seedAccount({ role: 'MODERATOR' });

      // Verified ministry source created FIRST.
      const verifiedPlace = await tourism.createPlace(
        placeInput({ name: 'Musée National', source: 'MINISTRY' }),
        submitter.id,
      );
      await tourism.verifyPlace(verifiedPlace.id, true, moderator(mod.id));

      // Unverified community source created LATER.
      const unverifiedPlace = await tourism.createPlace(
        placeInput({ name: 'Cascade communautaire', source: 'COMMUNITY' }),
        submitter.id,
      );

      const listing = await tourism.listPublic();
      const ids = listing.map((p) => p.id);
      // Verified leads despite being older.
      expect(ids).toEqual([verifiedPlace.id, unverifiedPlace.id]);
      expect(listing[0].verified).toBe(true);
      expect(listing[1].verified).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // 2. Verification is moderator-gated (independence).
  // -------------------------------------------------------------------------
  describe('tourism verification gate', () => {
    it('lets a moderator verify a place and writes both audit trails', async () => {
      const submitter = mock.seedAccount();
      const mod = mock.seedAccount({ role: 'MODERATOR' });
      const place = await tourism.createPlace(placeInput(), submitter.id);

      const verified = await tourism.verifyPlace(
        place.id,
        true,
        moderator(mod.id),
        'Cross-checked with the ministry registry.',
      );

      expect(verified.verified).toBe(true);
      expect(verified.verifiedByAccountId).toBe(mod.id);

      // Privileged-action audit (admin audit log).
      const adminLog = mock.db.adminAuditLogs.find(
        (l) => l.targetEntityId === place.id,
      );
      expect(adminLog?.action).toBe('tourism_place.verify');
      expect(adminLog?.actorAccountId).toBe(mod.id);

      // Entity audit (Contribution).
      const contribution = mock.db.contributions.find(
        (c) =>
          c.entityType === 'tourism_place' &&
          c.entityId === place.id &&
          c.action === 'VERIFY',
      );
      expect(contribution?.fieldName).toBe('verified');
    });

    it('FORBIDS an ordinary account from verifying a place — flag never flips', async () => {
      const submitter = mock.seedAccount();
      const place = await tourism.createPlace(placeInput(), submitter.id);

      await expect(
        tourism.verifyPlace(place.id, true, user(submitter.id)),
      ).rejects.toBeInstanceOf(Phase6Error);

      // The persisted place is untouched, and no audit rows were written.
      const stored = mock.db.places.find((p) => p.id === place.id);
      expect(stored?.verified).toBe(false);
      expect(stored?.verifiedByAccountId).toBeNull();
      expect(mock.db.adminAuditLogs).toHaveLength(0);
      expect(
        mock.db.contributions.filter((c) => c.action === 'VERIFY'),
      ).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // 3. Lesson approval — verified authority auto-APPROVES, else PENDING/hidden.
  // -------------------------------------------------------------------------
  describe('learning lesson approval', () => {
    it('auto-APPROVES a verified-authority lesson and surfaces it in the public listing', async () => {
      const expert = mock.seedAccount({ fullName: 'Pr. Kamga' });
      const authority = mock.seedAuthority({
        accountId: expert.id,
        verified: true,
      });

      const lesson = await learning.createLesson(lessonInput(), expert.id);

      expect(lesson.moderationStatus).toBe('APPROVED');
      expect(lesson.authorityId).toBe(authority.id);
      expect(lesson.visibilityScope).toBe('PUBLIC');

      const listing = await learning.listPublic();
      expect(listing.map((l) => l.id)).toContain(lesson.id);

      // A Contribution audit row is written on create.
      const audit = mock.db.contributions.find(
        (c) => c.entityType === 'learning_lesson' && c.entityId === lesson.id,
      );
      expect(audit?.action).toBe('CREATE');
      expect(audit?.accountId).toBe(expert.id);
    });

    it("keeps a normal author's lesson PENDING and HIDDEN from the public listing", async () => {
      const author = mock.seedAccount({ fullName: 'Awa N.' });

      const lesson = await learning.createLesson(lessonInput(), author.id);

      expect(lesson.moderationStatus).toBe('PENDING');
      expect(lesson.authorityId).toBeNull();

      const listing = await learning.listPublic();
      expect(listing.map((l) => l.id)).not.toContain(lesson.id);
    });

    it('hides an unverified-authority lesson but APPROVES once the authority is verified', async () => {
      const author = mock.seedAccount();
      // Authority exists but is NOT verified yet.
      mock.seedAuthority({ accountId: author.id, verified: false });

      const pending = await learning.createLesson(
        lessonInput({ title: 'Avant vérification' }),
        author.id,
      );
      expect(pending.moderationStatus).toBe('PENDING');

      // Authority becomes verified (seeded directly — moderation owns this seam).
      mock.seedAuthority({ accountId: author.id, verified: true });

      const approved = await learning.createLesson(
        lessonInput({ title: 'Après vérification' }),
        author.id,
      );
      expect(approved.moderationStatus).toBe('APPROVED');

      const listing = await learning.listPublic();
      const ids = listing.map((l) => l.id);
      expect(ids).toContain(approved.id);
      expect(ids).not.toContain(pending.id);
    });

    it('forbids authoring a ticketed lesson under an authority the account does not own', async () => {
      const author = mock.seedAccount();
      const other = mock.seedAccount();
      const foreignAuthority = mock.seedAuthority({
        accountId: other.id,
        verified: true,
      });

      await expect(
        learning.createLesson(
          lessonInput({ authorityId: foreignAuthority.id, isTicketed: true }),
          author.id,
        ),
      ).rejects.toBeInstanceOf(Phase6Error);

      // Nothing was persisted.
      expect(mock.db.lessons).toHaveLength(0);
    });

    it('orders the public listing by position then creation', async () => {
      const expert = mock.seedAccount();
      mock.seedAuthority({ accountId: expert.id, verified: true });

      const second = await learning.createLesson(
        lessonInput({ title: 'Leçon 2', position: 2 }),
        expert.id,
      );
      const first = await learning.createLesson(
        lessonInput({ title: 'Leçon 1', position: 1 }),
        expert.id,
      );

      const listing = await learning.listPublic();
      expect(listing.map((l) => l.id)).toEqual([first.id, second.id]);
    });
  });

  // -------------------------------------------------------------------------
  // 4. Enrollment upsert + completion stamping.
  // -------------------------------------------------------------------------
  describe('lesson enrollment + progress', () => {
    it('enrolls idempotently (UPSERT) — re-enrolling never duplicates or resets', async () => {
      const expert = mock.seedAccount();
      mock.seedAuthority({ accountId: expert.id, verified: true });
      const learner = mock.seedAccount();
      const lesson = await learning.createLesson(lessonInput(), expert.id);

      const first = await learning.enroll(lesson.id, learner.id);
      expect(first.progressPercent).toBe(0);
      expect(first.completedAt).toBeNull();

      // Advance progress, then re-enroll: must return the SAME row, unchanged.
      await learning.markProgress(lesson.id, learner.id, 40);
      const second = await learning.enroll(lesson.id, learner.id);

      expect(second.id).toBe(first.id);
      expect(second.progressPercent).toBe(40);
      expect(
        mock.db.enrollments.filter(
          (e) => e.lessonId === lesson.id && e.accountId === learner.id,
        ),
      ).toHaveLength(1);
    });

    it('stamps completed_at exactly once when progress reaches 100', async () => {
      const expert = mock.seedAccount();
      mock.seedAuthority({ accountId: expert.id, verified: true });
      const learner = mock.seedAccount();
      const lesson = await learning.createLesson(lessonInput(), expert.id);

      await learning.enroll(lesson.id, learner.id);

      const midway = await learning.markProgress(lesson.id, learner.id, 50);
      expect(midway.progressPercent).toBe(50);
      expect(midway.completedAt).toBeNull();

      const done = await learning.markProgress(lesson.id, learner.id, 100);
      expect(done.progressPercent).toBe(100);
      expect(done.completedAt).toBeInstanceOf(Date);

      // Re-hitting 100 must NOT move the completion timestamp.
      const completedAtFirst = done.completedAt;
      const again = await learning.markProgress(lesson.id, learner.id, 100);
      expect(again.completedAt).toEqual(completedAtFirst);
    });

    it('clears completed_at if progress drops back below 100', async () => {
      const expert = mock.seedAccount();
      mock.seedAuthority({ accountId: expert.id, verified: true });
      const learner = mock.seedAccount();
      const lesson = await learning.createLesson(lessonInput(), expert.id);

      await learning.markProgress(lesson.id, learner.id, 100);
      const reopened = await learning.markProgress(lesson.id, learner.id, 80);

      expect(reopened.progressPercent).toBe(80);
      expect(reopened.completedAt).toBeNull();
    });

    it('rejects out-of-range progress values', async () => {
      const expert = mock.seedAccount();
      mock.seedAuthority({ accountId: expert.id, verified: true });
      const learner = mock.seedAccount();
      const lesson = await learning.createLesson(lessonInput(), expert.id);

      await expect(
        learning.markProgress(lesson.id, learner.id, 101),
      ).rejects.toBeInstanceOf(Phase6Error);
      await expect(
        learning.markProgress(lesson.id, learner.id, -1),
      ).rejects.toBeInstanceOf(Phase6Error);
    });
  });
});
