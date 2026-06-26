/**
 * Service-level integration spec for the Phase-5 LIVE world (LiveSession /
 * LiveParticipant): access control, LiveKit token gating, and systematic replay.
 *
 * It wires the REAL GraphDegreeService over a single in-memory Prisma double
 * (test/support/phase5-live-prisma-mock.ts) and drives the Phase-5 behavioural
 * contract (test/support/phase5-live-reference.ts) against it. So the
 * degree-bounded FAMILY access seam is validated on the actual production graph
 * traversal — not a re-implementation — while the live access / token / replay
 * rules are exercised exactly as the real LiveSessionService must implement
 * them. It is independent of any controller/HTTP wiring the integrator still has
 * to register, and of 'livekit-server-sdk' (an integration-time dep): token
 * signing is injected, env-gated, and falls back to a clear "not configured"
 * state — never a crash.
 *
 * Mirrors the philosophy of public-culture.e2e-spec.ts and
 * family-feed-visibility.e2e-spec.ts: real graph logic, faked database, no HTTP.
 *
 * Invariants under test:
 *   1. PRIVATE/FAMILY live join requires the requester within visible_max_degree
 *      of subject_person_id; out-of-degree (and unclaimed) callers are denied.
 *   2. PUBLIC live join is open to ANY authenticated account.
 *   3. Only a VERIFIED CulturalAuthority host may CREATE a PUBLIC
 *      LESSON/MASTERCLASS.
 *   4. Token minting returns "not configured" when LiveKit env is unset, and a
 *      token (+ url) when set.
 *   5. Replay publication flips replay_published and emits the feed surface
 *      (PUBLIC -> public discovery; FAMILY/PRIVATE -> family feed), writing the
 *      mandatory Contribution audit.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { GraphDegreeService } from '../src/modules/authorization/graph-degree.service';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  createLivePrismaMock,
  LivePrismaMock,
} from './support/phase5-live-prisma-mock';
import {
  CreateLiveInput,
  EventSink,
  LiveAccessPolicy,
  LiveEnv,
  LiveError,
  LiveEvent,
  LiveSessionService,
  LiveTokenGate,
  LIVE_NOT_CONFIGURED,
} from './support/phase5-live-reference';

const FULL_ENV: LiveEnv = {
  LIVEKIT_API_KEY: 'APIxxxxxxxx',
  LIVEKIT_API_SECRET: 'secret-shhhh',
  LIVEKIT_URL: 'wss://origin.livekit.cloud',
};

describe('Phase-5 LIVE (integration)', () => {
  let mock: LivePrismaMock;
  let graph: GraphDegreeService;
  let publishedEvents: LiveEvent[];
  let events: EventSink;

  beforeEach(async () => {
    mock = createLivePrismaMock();
    publishedEvents = [];
    events = {
      publish: jest.fn().mockImplementation((e: LiveEvent) => {
        publishedEvents.push(e);
        return Promise.resolve();
      }),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        GraphDegreeService,
        { provide: PrismaService, useValue: mock.prisma },
      ],
    }).compile();

    graph = moduleRef.get(GraphDegreeService);
  });

  /** Build the reference service stack for a given LiveKit env. */
  const buildService = (env: LiveEnv): LiveSessionService => {
    const policy = new LiveAccessPolicy(
      mock.prisma as unknown as ConstructorParameters<
        typeof LiveAccessPolicy
      >[0],
      graph,
    );
    const tokenGate = new LiveTokenGate(env);
    return new LiveSessionService(
      mock.prisma as unknown as ConstructorParameters<
        typeof LiveSessionService
      >[0],
      policy,
      tokenGate,
      events,
    );
  };

  const policyOnly = (): LiveAccessPolicy =>
    new LiveAccessPolicy(
      mock.prisma as unknown as ConstructorParameters<
        typeof LiveAccessPolicy
      >[0],
      graph,
    );

  const ceremonyInput = (
    overrides: Partial<CreateLiveInput> = {},
  ): CreateLiveInput => ({
    title: 'Funérailles de Grand-père',
    kind: 'CEREMONY',
    visibilityScope: 'FAMILY',
    visibleMaxDegree: 1,
    subjectPersonId: 'S',
    roomName: `room-${Math.random().toString(36).slice(2)}`,
    ...overrides,
  });

  // -------------------------------------------------------------------------
  // 1. PRIVATE / FAMILY join is degree-bounded around subject_person_id.
  // -------------------------------------------------------------------------
  describe('FAMILY visibility — degree-bounded join (real GraphDegreeService)', () => {
    /**
     * Graph:  S ──parent──▶ C1 ──parent──▶ C2     (degrees to S: C1=1, C2=2)
     *         OUT is isolated (unreachable).
     * Ceremony anchored on S with visible_max_degree = 1.
     */
    const seedFamily = () => {
      mock.seedParentChild('S', 'C1');
      mock.seedParentChild('C1', 'C2');

      const host = mock.seedAccount({ fullName: 'Host' });
      const childAcc = mock.seedAccount({ fullName: 'Child (deg 1)' });
      mock.seedClaim({ accountId: childAcc.id, personId: 'C1' });
      const grandchildAcc = mock.seedAccount({ fullName: 'Grandchild (deg 2)' });
      mock.seedClaim({ accountId: grandchildAcc.id, personId: 'C2' });
      const strangerAcc = mock.seedAccount({ fullName: 'Stranger' });
      mock.seedClaim({ accountId: strangerAcc.id, personId: 'OUT' });
      const unclaimedAcc = mock.seedAccount({ fullName: 'No claim' });

      const session = mock.seedSession({
        hostAccountId: host.id,
        title: 'Funeral',
        kind: 'CEREMONY',
        visibilityScope: 'FAMILY',
        visibleMaxDegree: 1,
        subjectPersonId: 'S',
        status: 'LIVE',
      });
      return {
        host,
        childAcc,
        grandchildAcc,
        strangerAcc,
        unclaimedAcc,
        session,
      };
    };

    it('admits a family member WITHIN the degree bound (degree 1 <= max 1)', async () => {
      const { childAcc, session } = seedFamily();
      const decision = await policyOnly().canJoin(session, childAcc.id);
      expect(decision.allowed).toBe(true);
      expect(decision.degree).toBe(1);
    });

    it('denies a relative BEYOND the degree bound (degree 2 > max 1)', async () => {
      const { grandchildAcc, session } = seedFamily();
      const decision = await policyOnly().canJoin(session, grandchildAcc.id);
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toBe('out_of_degree');
    });

    it('admits the grandchild once the bound is widened to 2', async () => {
      const { grandchildAcc, session } = seedFamily();
      session.visibleMaxDegree = 2;
      const decision = await policyOnly().canJoin(session, grandchildAcc.id);
      expect(decision.allowed).toBe(true);
      expect(decision.degree).toBe(2);
    });

    it('denies an unrelated (unreachable) account', async () => {
      const { strangerAcc, session } = seedFamily();
      const decision = await policyOnly().canJoin(session, strangerAcc.id);
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toBe('out_of_degree');
    });

    it('denies an account with NO verified person claim (no graph anchor)', async () => {
      const { unclaimedAcc, session } = seedFamily();
      const decision = await policyOnly().canJoin(session, unclaimedAcc.id);
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toBe('no_claimed_person');
    });

    it('always admits the host to their own FAMILY live', async () => {
      const { host, session } = seedFamily();
      const decision = await policyOnly().canJoin(session, host.id);
      expect(decision.allowed).toBe(true);
      expect(decision.degree).toBe(0);
    });

    it('join() throws a LiveError for an out-of-degree caller, end-to-end', async () => {
      const { grandchildAcc, session } = seedFamily();
      const service = buildService(FULL_ENV);
      await expect(
        service.join(session.id, grandchildAcc.id),
      ).rejects.toMatchObject({ code: 'out_of_degree' });
      // No participant row leaks in on a denied join.
      expect(mock.db.participants).toHaveLength(0);
    });

    it('PRIVATE_SELF admits only the subject person, not other family', async () => {
      mock.seedParentChild('S', 'C1');
      const host = mock.seedAccount();
      const subjectAcc = mock.seedAccount();
      mock.seedClaim({ accountId: subjectAcc.id, personId: 'S' });
      const childAcc = mock.seedAccount();
      mock.seedClaim({ accountId: childAcc.id, personId: 'C1' });

      const session = mock.seedSession({
        hostAccountId: host.id,
        visibilityScope: 'PRIVATE_SELF',
        subjectPersonId: 'S',
        status: 'LIVE',
      });
      const policy = policyOnly();
      await expect(policy.canJoin(session, subjectAcc.id)).resolves.toEqual({
        allowed: true,
        degree: 0,
      });
      await expect(policy.canJoin(session, childAcc.id)).resolves.toEqual({
        allowed: false,
        reason: 'private_self',
      });
    });
  });

  // -------------------------------------------------------------------------
  // 2. PUBLIC join is open to ANY authenticated account.
  // -------------------------------------------------------------------------
  describe('PUBLIC visibility — open join', () => {
    it('admits an account with no claim and no relation to anyone', async () => {
      const host = mock.seedAccount();
      const stranger = mock.seedAccount();
      const session = mock.seedSession({
        hostAccountId: host.id,
        kind: 'LESSON',
        visibilityScope: 'PUBLIC',
        subjectPersonId: null,
        status: 'LIVE',
      });
      const decision = await policyOnly().canJoin(session, stranger.id);
      expect(decision.allowed).toBe(true);
    });

    it('join() mints a token and records the participant for a public live', async () => {
      const host = mock.seedAccount();
      const viewer = mock.seedAccount();
      const session = mock.seedSession({
        hostAccountId: host.id,
        kind: 'STORYTELLING',
        visibilityScope: 'PUBLIC',
        status: 'LIVE',
      });
      const service = buildService(FULL_ENV);
      const result = await service.join(session.id, viewer.id);
      expect(result.access.allowed).toBe(true);
      expect(result.role).toBe('viewer');
      expect(result.token.configured).toBe(true);
      expect(mock.db.participants).toHaveLength(1);
      expect(mock.db.participants[0].accountId).toBe(viewer.id);
    });
  });

  // -------------------------------------------------------------------------
  // 3. Only a verified authority may host a PUBLIC LESSON / MASTERCLASS.
  // -------------------------------------------------------------------------
  describe('PUBLIC LESSON/MASTERCLASS — verified-authority host gate', () => {
    it('lets a VERIFIED authority create a public lesson (attributing the authority)', async () => {
      const expert = mock.seedAccount({ fullName: 'Pr. Kamga' });
      const authority = mock.seedAuthority({
        accountId: expert.id,
        kind: 'EXPERT',
        verified: true,
      });
      const service = buildService(FULL_ENV);
      const session = await service.create(
        ceremonyInput({
          title: 'Cours de Bassa',
          kind: 'LESSON',
          visibilityScope: 'PUBLIC',
          subjectPersonId: null,
          visibleMaxDegree: null,
        }),
        expert.id,
      );
      expect(session.visibilityScope).toBe('PUBLIC');
      expect(session.hostAuthorityId).toBe(authority.id);
      expect(session.status).toBe('SCHEDULED');
      // Mandatory audit row.
      const audit = mock.db.contributions.filter(
        (c) => c.entityId === session.id && c.action === 'CREATE',
      );
      expect(audit).toHaveLength(1);
      expect(audit[0].entityType).toBe('live_session');
    });

    it('forbids a NON-authority from creating a public masterclass', async () => {
      const plain = mock.seedAccount();
      const service = buildService(FULL_ENV);
      await expect(
        service.create(
          ceremonyInput({
            title: 'Fake masterclass',
            kind: 'MASTERCLASS',
            visibilityScope: 'PUBLIC',
            subjectPersonId: null,
          }),
          plain.id,
        ),
      ).rejects.toMatchObject({ code: 'authority_required' });
      expect(mock.db.sessions).toHaveLength(0);
    });

    it('forbids an UNVERIFIED authority from creating a public lesson', async () => {
      const claimant = mock.seedAccount();
      mock.seedAuthority({ accountId: claimant.id, verified: false });
      const service = buildService(FULL_ENV);
      await expect(
        service.create(
          ceremonyInput({
            kind: 'LESSON',
            visibilityScope: 'PUBLIC',
            subjectPersonId: null,
          }),
          claimant.id,
        ),
      ).rejects.toBeInstanceOf(LiveError);
    });

    it('allows a non-gated PUBLIC kind (STORYTELLING) for any account', async () => {
      const plain = mock.seedAccount();
      const service = buildService(FULL_ENV);
      const session = await service.create(
        ceremonyInput({
          title: 'Contes du soir',
          kind: 'STORYTELLING',
          visibilityScope: 'PUBLIC',
          subjectPersonId: null,
        }),
        plain.id,
      );
      expect(session.hostAuthorityId).toBeNull();
      expect(session.visibilityScope).toBe('PUBLIC');
    });
  });

  // -------------------------------------------------------------------------
  // 4. LiveKit token gating on env creds.
  // -------------------------------------------------------------------------
  describe('LiveKit token gating', () => {
    it('returns "not configured" (no throw) when env creds are unset', () => {
      const gate = new LiveTokenGate({});
      const result = gate.mint('account-1', 'room-1', 'viewer');
      expect(result.configured).toBe(false);
      expect(result.reason).toBe(LIVE_NOT_CONFIGURED);
      expect(result.token).toBeUndefined();
    });

    it('returns "not configured" when creds are partial (url missing)', () => {
      const gate = new LiveTokenGate({
        LIVEKIT_API_KEY: 'k',
        LIVEKIT_API_SECRET: 's',
      });
      expect(gate.mint('a', 'r', 'host').configured).toBe(false);
    });

    it('mints a token + url when all creds are present', () => {
      const gate = new LiveTokenGate(FULL_ENV);
      const result = gate.mint('account-1', 'room-42', 'host');
      expect(result.configured).toBe(true);
      expect(typeof result.token).toBe('string');
      expect(result.token).toBeTruthy();
      expect(result.url).toBe(FULL_ENV.LIVEKIT_URL);
    });

    it('grants publish rights to host/speaker, sub-only to viewers', () => {
      const gate = new LiveTokenGate(FULL_ENV);
      expect(gate.mint('a', 'r', 'host').canPublish).toBe(true);
      expect(gate.mint('a', 'r', 'speaker').canPublish).toBe(true);
      expect(gate.mint('a', 'r', 'viewer').canPublish).toBe(false);
    });

    it('a join into a LIVE with no LiveKit env still succeeds with a not-configured token', async () => {
      const host = mock.seedAccount();
      const viewer = mock.seedAccount();
      const session = mock.seedSession({
        hostAccountId: host.id,
        kind: 'LESSON',
        visibilityScope: 'PUBLIC',
        status: 'LIVE',
      });
      const service = buildService({}); // LiveKit unconfigured
      const result = await service.join(session.id, viewer.id);
      // Access is granted (public), but the realtime token is gated off.
      expect(result.access.allowed).toBe(true);
      expect(result.token.configured).toBe(false);
      expect(result.token.reason).toBe(LIVE_NOT_CONFIGURED);
      // Participant is still recorded — the app degrades, never crashes.
      expect(mock.db.participants).toHaveLength(1);
    });
  });

  // -------------------------------------------------------------------------
  // 5. Replay publication: flips replay_published + emits the feed surface.
  // -------------------------------------------------------------------------
  describe('Replay publication', () => {
    const endedSession = (scope: 'PUBLIC' | 'FAMILY', hostId: string) =>
      mock.seedSession({
        hostAccountId: hostId,
        kind: scope === 'PUBLIC' ? 'LESSON' : 'CEREMONY',
        visibilityScope: scope,
        subjectPersonId: scope === 'FAMILY' ? 'S' : null,
        status: 'ENDED',
        recordingMediaId: 'media-123',
        replayPublished: false,
      });

    it('publishes a PUBLIC replay to the public discovery feed', async () => {
      const host = mock.seedAccount();
      const session = endedSession('PUBLIC', host.id);
      const service = buildService(FULL_ENV);

      const result = await service.publishReplay(session.id, host.id);
      expect(result.surface).toBe('public-feed');
      expect(result.session.replayPublished).toBe(true);

      const event = publishedEvents.find(
        (e) => e.type === 'live.replay.published',
      );
      expect(event).toBeDefined();
      expect(event?.surface).toBe('public-feed');
      expect(event?.visibilityScope).toBe('PUBLIC');

      const audit = mock.db.contributions.find(
        (c) => c.entityId === session.id && c.action === 'PUBLISH_REPLAY',
      );
      expect(audit).toBeDefined();
    });

    it('publishes a FAMILY replay to the family feed (same visibility as the live)', async () => {
      const host = mock.seedAccount();
      const session = endedSession('FAMILY', host.id);
      const service = buildService(FULL_ENV);

      const result = await service.publishReplay(session.id, host.id);
      expect(result.surface).toBe('family-feed');
      const event = publishedEvents.find(
        (e) => e.type === 'live.replay.published',
      );
      expect(event?.surface).toBe('family-feed');
      expect(event?.visibilityScope).toBe('FAMILY');
    });

    it('refuses to publish a replay before the live has ENDED', async () => {
      const host = mock.seedAccount();
      const session = mock.seedSession({
        hostAccountId: host.id,
        visibilityScope: 'PUBLIC',
        status: 'LIVE',
        recordingMediaId: 'media-1',
      });
      const service = buildService(FULL_ENV);
      await expect(
        service.publishReplay(session.id, host.id),
      ).rejects.toMatchObject({ code: 'not_ended' });
    });

    it('refuses to publish a replay with no recording', async () => {
      const host = mock.seedAccount();
      const session = mock.seedSession({
        hostAccountId: host.id,
        visibilityScope: 'PUBLIC',
        status: 'ENDED',
        recordingMediaId: null,
      });
      const service = buildService(FULL_ENV);
      await expect(
        service.publishReplay(session.id, host.id),
      ).rejects.toMatchObject({ code: 'no_recording' });
    });

    it('forbids a non-host from publishing the replay', async () => {
      const host = mock.seedAccount();
      const other = mock.seedAccount();
      const session = endedSession('PUBLIC', host.id);
      const service = buildService(FULL_ENV);
      await expect(
        service.publishReplay(session.id, other.id),
      ).rejects.toMatchObject({ code: 'only_host_may_publish' });
    });

    it('is idempotent-guarded: a second publish is rejected', async () => {
      const host = mock.seedAccount();
      const session = endedSession('PUBLIC', host.id);
      const service = buildService(FULL_ENV);
      await service.publishReplay(session.id, host.id);
      await expect(
        service.publishReplay(session.id, host.id),
      ).rejects.toMatchObject({ code: 'already_published' });
      // Only one replay-published event was emitted.
      expect(
        publishedEvents.filter((e) => e.type === 'live.replay.published'),
      ).toHaveLength(1);
    });

    it('respects the live visibility for the replay: a public replay is open, a family replay degree-bounded', async () => {
      // The replay reuses canJoin: a public replay admits anyone; a family
      // replay denies an out-of-degree viewer just like the live did.
      mock.seedParentChild('S', 'C1');
      const host = mock.seedAccount();
      const stranger = mock.seedAccount();
      mock.seedClaim({ accountId: stranger.id, personId: 'C1' });

      const publicReplay = endedSession('PUBLIC', host.id);
      const familyReplay = mock.seedSession({
        hostAccountId: host.id,
        kind: 'CEREMONY',
        visibilityScope: 'FAMILY',
        visibleMaxDegree: 0,
        subjectPersonId: 'S',
        status: 'ENDED',
        recordingMediaId: 'media-9',
      });

      const policy = policyOnly();
      await expect(
        policy.canJoin(publicReplay, stranger.id),
      ).resolves.toMatchObject({ allowed: true });
      // max degree 0 => only the subject; C1 is degree 1 => denied.
      await expect(
        policy.canJoin(familyReplay, stranger.id),
      ).resolves.toMatchObject({ allowed: false, reason: 'out_of_degree' });
    });
  });

  // -------------------------------------------------------------------------
  // Lifecycle cross-checks (start gate + not-found).
  // -------------------------------------------------------------------------
  describe('Lifecycle guards', () => {
    it('only the host may START the live', async () => {
      const host = mock.seedAccount();
      const other = mock.seedAccount();
      const session = mock.seedSession({
        hostAccountId: host.id,
        visibilityScope: 'PUBLIC',
        status: 'SCHEDULED',
      });
      const service = buildService(FULL_ENV);
      await expect(
        service.start(session.id, other.id),
      ).rejects.toMatchObject({ code: 'only_host_may_start' });
      const started = await service.start(session.id, host.id);
      expect(started.status).toBe('LIVE');
      expect(started.startedAt).not.toBeNull();
    });

    it('rejects operations on a soft-deleted / missing session', async () => {
      const host = mock.seedAccount();
      const session = mock.seedSession({
        hostAccountId: host.id,
        status: 'LIVE',
        deletedAt: new Date(),
      });
      const service = buildService(FULL_ENV);
      await expect(
        service.join(session.id, host.id),
      ).rejects.toMatchObject({ code: 'not_found' });
      await expect(
        service.join('does-not-exist', host.id),
      ).rejects.toMatchObject({ code: 'not_found' });
    });
  });
});
