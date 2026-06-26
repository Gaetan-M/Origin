/**
 * Service-level integration spec for the Phase-2 PUBLIC cultural-heritage world.
 *
 * It wires the REAL CulturalContentService + PublicFeedService + ModerationService
 * together over a single in-memory Prisma double (see
 * test/support/cultural-prisma-mock.ts), so it validates the actual production
 * moderation + visibility logic end-to-end — not a re-implementation — and is
 * independent of any controller/HTTP wiring the integrator still has to register.
 *
 * The invariants under test (the crux QA scenarios for the public world):
 *   1. A VERIFIED authority's content is auto-APPROVED and shows in the public feed.
 *   2. A normal author's content is PENDING and is INVISIBLE until a moderator
 *      APPROVES it — then it appears.
 *   3. The public feed payload leaks ZERO family-graph / phone / private fields.
 *   4. A report can be filed by any account and resolved by a moderator (with a
 *      full audit trail).
 *   5. Authority verification GATES auto-approval: the same author goes from
 *      PENDING to auto-APPROVED only after their authority is verified.
 *
 * Mirrors the philosophy of family-feed-visibility.e2e-spec.ts: real services,
 * faked database, no HTTP.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { AccountRole } from '@prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';
import { EventPublisher } from '../src/eventing/event-publisher';
import { AdminAuditService } from '../src/modules/admin/admin-audit.service';
import { CulturalContentService } from '../src/modules/cultural-content/cultural-content.service';
import { PublicFeedService } from '../src/modules/public-feed/public-feed.service';
import { ModerationService } from '../src/modules/moderation/moderation.service';
import { AdminActor } from '../src/common/decorators/admin-actor.decorator';
import { CreateCulturalContentDto } from '../src/modules/cultural-content/dto/create-cultural-content.dto';
import { RegisterAuthorityDto } from '../src/modules/cultural-content/dto/register-authority.dto';
import {
  createCulturalPrismaMock,
  CulturalPrismaMock,
} from './support/cultural-prisma-mock';

/**
 * The exact public projection surface. Anything OUTSIDE this set leaking into a
 * feed item is a privacy regression for the public world.
 */
const ALLOWED_PUBLIC_ITEM_KEYS = new Set<string>([
  'id',
  'contentType',
  'title',
  'body',
  'languageCode',
  'region',
  'ethnicGroup',
  'mediaId',
  'authorDisplayName',
  'authorityVerified',
  'createdAt',
]);

/** Fields that must NEVER appear in a public payload (graph / private data). */
const FORBIDDEN_PUBLIC_KEYS = [
  'authorAccountId',
  'phoneNumber',
  'phone',
  'cni',
  'relationships',
  'parentChild',
  'degree',
  'visibleMaxDegree',
  'subjectPersonId',
  'accountId',
];

describe('Public cultural world (integration)', () => {
  let mock: CulturalPrismaMock;
  let cultural: CulturalContentService;
  let publicFeed: PublicFeedService;
  let moderation: ModerationService;
  let publishedEvents: Array<{ type: string }>;

  /** Build an AdminActor for a moderator-privileged caller. */
  const moderatorActor = (accountId: string): AdminActor => ({
    accountId,
    role: AccountRole.MODERATOR,
    ipAddress: null,
    userAgent: null,
    requestId: null,
  });

  const recipeDto = (
    overrides: Partial<CreateCulturalContentDto> = {},
  ): CreateCulturalContentDto =>
    ({
      contentType: 'RECIPE',
      title: 'Ndolè',
      body: 'A bitterleaf and groundnut dish.',
      languageCode: 'fr',
      ethnicGroup: 'Douala',
      ...overrides,
    }) as CreateCulturalContentDto;

  const authorityDto = (
    overrides: Partial<RegisterAuthorityDto> = {},
  ): RegisterAuthorityDto =>
    ({
      kind: 'CHEFFERIE',
      displayName: 'Chefferie de Bandjoun',
      region: 'Ouest',
      ethnicGroup: 'Bamiléké',
      ...overrides,
    }) as RegisterAuthorityDto;

  beforeEach(async () => {
    mock = createCulturalPrismaMock();
    publishedEvents = [];

    const eventPublisher: Pick<EventPublisher, 'publish' | 'subscribe'> = {
      publish: jest.fn().mockImplementation((event: { type: string }) => {
        publishedEvents.push(event);
        return Promise.resolve();
      }),
      subscribe: jest.fn(),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        CulturalContentService,
        PublicFeedService,
        ModerationService,
        AdminAuditService,
        { provide: PrismaService, useValue: mock.prisma },
        { provide: EventPublisher, useValue: eventPublisher },
      ],
    }).compile();

    cultural = moduleRef.get(CulturalContentService);
    publicFeed = moduleRef.get(PublicFeedService);
    moderation = moduleRef.get(ModerationService);
  });

  // -------------------------------------------------------------------------
  // 1. Verified-authority content is auto-approved and discoverable.
  // -------------------------------------------------------------------------
  it('auto-APPROVES a verified authority’s content and surfaces it in the public feed', async () => {
    const expert = mock.seedAccount({ fullName: 'Pr. Kamga' });
    const authority = mock.seedAuthority({
      accountId: expert.id,
      kind: 'EXPERT',
      displayName: 'Pr. Kamga (linguiste)',
      verified: true,
      verifiedAt: new Date(),
    });

    const content = await cultural.createContent(
      recipeDto({ contentType: 'LANGUAGE', title: 'Le ton en bassa' }),
      expert.id,
    );

    expect(content.moderationStatus).toBe('APPROVED');
    expect(content.isFromVerifiedAuthority).toBe(true);
    expect(content.authorityId).toBe(authority.id);
    expect(content.visibilityScope).toBe('PUBLIC');

    const page = await publicFeed.getPublicFeed();
    const ids = page.items.map((i) => i.id);
    expect(ids).toContain(content.id);

    const item = page.items.find((i) => i.id === content.id);
    expect(item?.authorityVerified).toBe(true);
    // Verified authorities are attributed by their public display name.
    expect(item?.authorDisplayName).toBe('Pr. Kamga (linguiste)');
  });

  // -------------------------------------------------------------------------
  // 2. Normal author's content is PENDING and hidden until approved.
  // -------------------------------------------------------------------------
  it('keeps a normal author’s content PENDING and OUT of the public feed until a moderator approves it', async () => {
    const author = mock.seedAccount({ fullName: 'Awa N.' });
    const mod = mock.seedAccount({ role: 'MODERATOR' });

    const content = await cultural.createContent(recipeDto(), author.id);
    expect(content.moderationStatus).toBe('PENDING');
    expect(content.isFromVerifiedAuthority).toBe(false);

    // Not yet visible to the public world.
    let page = await publicFeed.getPublicFeed();
    expect(page.items.map((i) => i.id)).not.toContain(content.id);

    // Moderator approves it.
    const verdict = await moderation.moderateCulturalContent(
      content.id,
      'APPROVED',
      moderatorActor(mod.id),
    );
    expect(verdict.moderationStatus).toBe('APPROVED');

    // Now it surfaces, attributed by the author's full name (no authority).
    page = await publicFeed.getPublicFeed();
    const item = page.items.find((i) => i.id === content.id);
    expect(item).toBeDefined();
    expect(item?.authorityVerified).toBe(false);
    expect(item?.authorDisplayName).toBe('Awa N.');
  });

  it('keeps REJECTED content out of the public feed', async () => {
    const author = mock.seedAccount();
    const mod = mock.seedAccount({ role: 'MODERATOR' });

    const content = await cultural.createContent(recipeDto(), author.id);
    await moderation.moderateCulturalContent(
      content.id,
      'REJECTED',
      moderatorActor(mod.id),
    );

    const page = await publicFeed.getPublicFeed();
    expect(page.items.map((i) => i.id)).not.toContain(content.id);
  });

  // -------------------------------------------------------------------------
  // 3. Public feed payload leaks no family-graph / phone / private fields.
  // -------------------------------------------------------------------------
  it('exposes ONLY public cultural fields in the feed payload — no graph edges, account id, or phone', async () => {
    const expert = mock.seedAccount({
      fullName: 'Ngono',
      phoneNumber: '+237699112233',
    });
    mock.seedAuthority({
      accountId: expert.id,
      verified: true,
      verifiedAt: new Date(),
    });

    await cultural.createContent(
      recipeDto({ contentType: 'PROVERB', title: 'Proverbe ekang' }),
      expert.id,
    );

    const page = await publicFeed.getPublicFeed();
    expect(page.items).toHaveLength(1);

    for (const item of page.items) {
      const keys = Object.keys(item);
      // Every key is part of the sanctioned public surface.
      for (const key of keys) {
        expect(ALLOWED_PUBLIC_ITEM_KEYS.has(key)).toBe(true);
      }
      // And none of the explicitly-forbidden private/graph fields leak.
      for (const forbidden of FORBIDDEN_PUBLIC_KEYS) {
        expect(item).not.toHaveProperty(forbidden);
      }
      // The author's phone number must never appear anywhere in the payload.
      expect(JSON.stringify(item)).not.toContain('+237699112233');
    }
  });

  // -------------------------------------------------------------------------
  // 4. Reports can be filed and resolved (with audit trail).
  // -------------------------------------------------------------------------
  it('lets any account file a report and a moderator resolve it, writing both audit trails', async () => {
    const reporter = mock.seedAccount();
    const author = mock.seedAccount();
    const mod = mock.seedAccount({ role: 'MODERATOR' });
    const content = await cultural.createContent(recipeDto(), author.id);

    const report = await moderation.report({
      reporterAccountId: reporter.id,
      targetType: 'CULTURAL_CONTENT',
      targetId: content.id,
      reason: 'SPAM',
      details: 'Looks like an ad.',
    });
    expect(report.status).toBe('OPEN');

    // It shows up in the moderator queue (OPEN/REVIEWING, FIFO).
    const queue = await moderation.queue(moderatorActor(mod.id));
    expect(queue.map((r) => r.id)).toContain(report.id);

    const resolved = await moderation.resolveReport(
      report.id,
      'RESOLVED',
      'Removed offending content.',
      moderatorActor(mod.id),
    );
    expect(resolved.status).toBe('RESOLVED');

    // Resolved reports drop out of the open queue.
    const queueAfter = await moderation.queue(moderatorActor(mod.id));
    expect(queueAfter.map((r) => r.id)).not.toContain(report.id);

    // Privileged-action audit (AdminAuditLog) + entity audit (Contribution).
    const auditLog = mock.db.adminAuditLogs.find(
      (l) => l.targetEntityId === report.id,
    );
    expect(auditLog?.action).toBe('moderation_report.resolve');
    expect(auditLog?.actorAccountId).toBe(mod.id);

    const contribution = mock.db.contributions.find(
      (c) => c.entityType === 'moderation_report' && c.entityId === report.id,
    );
    expect(contribution?.action).toBe('RESOLVE');
  });

  it('de-duplicates an identical open report from the same reporter', async () => {
    const reporter = mock.seedAccount();
    const author = mock.seedAccount();
    const content = await cultural.createContent(recipeDto(), author.id);

    const first = await moderation.report({
      reporterAccountId: reporter.id,
      targetType: 'CULTURAL_CONTENT',
      targetId: content.id,
      reason: 'HATE',
    });
    const second = await moderation.report({
      reporterAccountId: reporter.id,
      targetType: 'CULTURAL_CONTENT',
      targetId: content.id,
      reason: 'HATE',
    });

    expect(second.id).toBe(first.id);
    expect(mock.db.reports).toHaveLength(1);
  });

  it('forbids a non-moderator from resolving a report', async () => {
    const reporter = mock.seedAccount();
    const author = mock.seedAccount();
    const content = await cultural.createContent(recipeDto(), author.id);
    const report = await moderation.report({
      reporterAccountId: reporter.id,
      targetType: 'CULTURAL_CONTENT',
      targetId: content.id,
      reason: 'SPAM',
    });

    const plainActor: AdminActor = {
      accountId: reporter.id,
      role: AccountRole.USER,
      ipAddress: null,
      userAgent: null,
      requestId: null,
    };

    await expect(
      moderation.resolveReport(report.id, 'DISMISSED', null, plainActor),
    ).rejects.toThrow();
  });

  // -------------------------------------------------------------------------
  // 5. Authority verification gates auto-approval.
  // -------------------------------------------------------------------------
  it('GATES auto-approval on authority verification: PENDING before verify, APPROVED after', async () => {
    const account = mock.seedAccount({ fullName: 'Tribal Council' });
    const mod = mock.seedAccount({ role: 'MODERATOR' });

    // Self-register: authorities are always created UNVERIFIED.
    const authority = await cultural.registerAsAuthority(
      authorityDto(),
      account.id,
    );
    expect(authority.verified).toBe(false);

    // While unverified, content is PENDING (no auto-approval).
    const before = await cultural.createContent(
      recipeDto({ contentType: 'RITE', title: 'Rite avant' }),
      account.id,
    );
    expect(before.moderationStatus).toBe('PENDING');
    expect(before.isFromVerifiedAuthority).toBe(false);

    // Moderator verifies the authority.
    const verified = await moderation.verifyAuthority(
      authority.id,
      true,
      moderatorActor(mod.id),
      'Credentials checked.',
    );
    expect(verified.verified).toBe(true);

    // Now the SAME author's new content is auto-APPROVED.
    const after = await cultural.createContent(
      recipeDto({ contentType: 'RITE', title: 'Rite après' }),
      account.id,
    );
    expect(after.moderationStatus).toBe('APPROVED');
    expect(after.isFromVerifiedAuthority).toBe(true);

    // Only the post-verification item is discoverable in the public feed.
    const page = await publicFeed.getPublicFeed();
    const ids = page.items.map((i) => i.id);
    expect(ids).toContain(after.id);
    expect(ids).not.toContain(before.id);

    // Verification wrote both audit trails.
    const auditLog = mock.db.adminAuditLogs.find(
      (l) => l.targetEntityId === authority.id,
    );
    expect(auditLog?.action).toBe('cultural_authority.verify');
    const contribution = mock.db.contributions.find(
      (c) => c.entityType === 'cultural_authority' && c.entityId === authority.id,
    );
    expect(contribution?.action).toBe('VERIFY');
  });

  // -------------------------------------------------------------------------
  // Ranking + audit-on-create cross-checks.
  // -------------------------------------------------------------------------
  it('ranks verified-authority content ahead of unverified in the public feed', async () => {
    const expertAcc = mock.seedAccount({ fullName: 'Expert' });
    mock.seedAuthority({
      accountId: expertAcc.id,
      verified: true,
      verifiedAt: new Date(),
    });
    const plainAcc = mock.seedAccount({ fullName: 'Plain' });
    const mod = mock.seedAccount({ role: 'MODERATOR' });

    // Plain author content created first, then approved.
    const plain = await cultural.createContent(
      recipeDto({ title: 'Plain dish' }),
      plainAcc.id,
    );
    await moderation.moderateCulturalContent(
      plain.id,
      'APPROVED',
      moderatorActor(mod.id),
    );

    // Verified content created later — must still rank first.
    const verified = await cultural.createContent(
      recipeDto({ title: 'Verified dish' }),
      expertAcc.id,
    );

    const page = await publicFeed.getPublicFeed();
    const ids = page.items.map((i) => i.id);
    expect(ids).toEqual([verified.id, plain.id]);
  });

  it('writes a mandatory Contribution audit row and publishes an event when content is authored', async () => {
    const author = mock.seedAccount();
    const content = await cultural.createContent(recipeDto(), author.id);

    const audit = mock.db.contributions.filter(
      (c) => c.entityType === 'cultural_content' && c.entityId === content.id,
    );
    expect(audit).toHaveLength(1);
    expect(audit[0].action).toBe('CREATE');
    expect(audit[0].accountId).toBe(author.id);

    expect(
      publishedEvents.some((e) => e.type === 'cultural-content.published'),
    ).toBe(true);
  });
});
