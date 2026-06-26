/**
 * Service-level integration spec for the ELEVATION WAVE 1 LIVE rebuild — the
 * invitation + presence-control surface layered on top of the phase-5 access /
 * token core: invite (with notification fan-out), respond-invite, join-by-code,
 * raise-hand toggling, host promote-to-speaker, and the family FeedPost auto-post
 * fired when a live starts.
 *
 * It wires the REAL GraphDegreeService over a single in-memory Prisma double
 * (test/support/live-rebuild-prisma-mock.ts) and drives the wave-1 behavioural
 * contract (test/support/live-rebuild-reference.ts) against it. So the
 * degree-bounded FAMILY join-by-code seam is validated on the actual production
 * graph traversal — not a re-implementation — while the new live UX rules are
 * exercised exactly as the real LiveService must implement them. It is
 * independent of any controller/HTTP wiring the integrator still has to register,
 * and of 'livekit-server-sdk' (an integration-time dep): token signing is
 * injected, env-gated, and degrades to a clear "not configured" state.
 *
 * Mirrors the philosophy of phase5-live.e2e-spec.ts: real graph logic, faked
 * database, no HTTP.
 *
 * Invariants under test:
 *   1. invite() is host-only, creates a PENDING LiveInvitation, and fans out an
 *      INVITATION_RECEIVED Notification to an on-platform invitee — but NOT to an
 *      off-platform phone invite. Writes the mandatory Contribution audit.
 *   2. respondToInvite() only honours the invitee, only once, flipping
 *      PENDING -> ACCEPTED/DECLINED and stamping responded_at.
 *   3. joinByCode() resolves the session behind an invite_code and still enforces
 *      visibility (and rejects an unknown code).
 *   4. raiseHand() toggles hand_raised on the caller's participant row.
 *   5. promoteToSpeaker() is host-only and sets is_speaker (+ role 'speaker',
 *      lowering the raised hand).
 *   6. start() auto-posts a FeedPost mirroring the live's visibility (a FAMILY
 *      live -> a FAMILY feed post) and emits a 'live.started' event.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { GraphDegreeService } from '../src/modules/authorization/graph-degree.service';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  createLiveRebuildPrismaMock,
  LiveRebuildPrismaMock,
} from './support/live-rebuild-prisma-mock';
import {
  EventSink,
  INVITATION_NOTIFICATION_TYPE,
  LiveEnv,
  LiveError,
  LiveEvent,
  LiveRebuildService,
  LiveTokenGate,
  LIVE_NOT_CONFIGURED,
} from './support/live-rebuild-reference';

const FULL_ENV: LiveEnv = {
  LIVEKIT_API_KEY: 'APIxxxxxxxx',
  LIVEKIT_API_SECRET: 'secret-shhhh',
  LIVEKIT_URL: 'wss://origin.livekit.cloud',
};

describe('ELEVATION WAVE 1 — LIVE rebuild (integration)', () => {
  let mock: LiveRebuildPrismaMock;
  let graph: GraphDegreeService;
  let publishedEvents: LiveEvent[];
  let events: EventSink;

  beforeEach(async () => {
    mock = createLiveRebuildPrismaMock();
    publishedEvents = [];
    events = {
      publish: jest.fn().mockImplementation((e: LiveEvent) => {
        publishedEvents.push(e);
        return Promise.resolve();
      }),
    };

    // Compile a real GraphDegreeService over the in-memory Prisma double so the
    // FAMILY join-by-code path exercises the actual production BFS.
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        GraphDegreeService,
        { provide: PrismaService, useValue: mock.prisma },
      ],
    }).compile();
    graph = moduleRef.get(GraphDegreeService);
  });

  const buildService = (env: LiveEnv = FULL_ENV): LiveRebuildService =>
    new LiveRebuildService(
      mock.prisma as unknown as ConstructorParameters<
        typeof LiveRebuildService
      >[0],
      graph,
      new LiveTokenGate(env),
      events,
    );

  // -------------------------------------------------------------------------
  // 1. invite() -> LiveInvitation (+ notification fan-out), host-only, audited.
  // -------------------------------------------------------------------------
  describe('invite()', () => {
    it('creates a PENDING invitation AND notifies an on-platform invitee', async () => {
      const host = mock.seedAccount({ fullName: 'Host' });
      const invitee = mock.seedAccount({ fullName: 'Cousin' });
      const session = mock.seedSession({
        hostAccountId: host.id,
        title: 'Conseil de famille',
        kind: 'FAMILY_COUNCIL',
        visibilityScope: 'FAMILY',
      });
      const service = buildService();

      const invitation = await service.invite(session.id, host.id, {
        invitedAccountId: invitee.id,
      });

      expect(invitation.status).toBe('PENDING');
      expect(invitation.invitedAccountId).toBe(invitee.id);
      expect(mock.db.invitations).toHaveLength(1);

      // Notification fan-out to the invited account.
      expect(mock.db.notifications).toHaveLength(1);
      const note = mock.db.notifications[0];
      expect(note.accountId).toBe(invitee.id);
      expect(note.notificationType).toBe(INVITATION_NOTIFICATION_TYPE);
      expect(note.relatedEntityType).toBe('live_session');
      expect(note.relatedEntityId).toBe(session.id);

      // Mandatory audit row.
      const audit = mock.db.contributions.find(
        (c) => c.entityId === session.id && c.action === 'INVITE',
      );
      expect(audit).toBeDefined();
      expect(audit?.entityType).toBe('live_session');
    });

    it('creates NO notification for an off-platform phone invite', async () => {
      const host = mock.seedAccount();
      const session = mock.seedSession({ hostAccountId: host.id });
      const service = buildService();

      const invitation = await service.invite(session.id, host.id, {
        invitedPhone: '+237699112233',
      });

      expect(invitation.invitedPhone).toBe('+237699112233');
      expect(invitation.invitedAccountId).toBeNull();
      expect(mock.db.invitations).toHaveLength(1);
      // No account behind the phone yet -> nothing to notify.
      expect(mock.db.notifications).toHaveLength(0);
    });

    it('forbids a non-host from inviting', async () => {
      const host = mock.seedAccount();
      const other = mock.seedAccount();
      const invitee = mock.seedAccount();
      const session = mock.seedSession({ hostAccountId: host.id });
      const service = buildService();

      await expect(
        service.invite(session.id, other.id, { invitedAccountId: invitee.id }),
      ).rejects.toMatchObject({ code: 'only_host_may_invite' });
      expect(mock.db.invitations).toHaveLength(0);
      expect(mock.db.notifications).toHaveLength(0);
    });

    it('rejects an invite with neither an account nor a phone', async () => {
      const host = mock.seedAccount();
      const session = mock.seedSession({ hostAccountId: host.id });
      const service = buildService();
      await expect(
        service.invite(session.id, host.id, {}),
      ).rejects.toBeInstanceOf(LiveError);
    });
  });

  // -------------------------------------------------------------------------
  // 2. respondToInvite() flips status, invitee-only, once.
  // -------------------------------------------------------------------------
  describe('respondToInvite()', () => {
    const seedInvite = async () => {
      const host = mock.seedAccount();
      const invitee = mock.seedAccount();
      const session = mock.seedSession({ hostAccountId: host.id });
      const service = buildService();
      const invitation = await service.invite(session.id, host.id, {
        invitedAccountId: invitee.id,
      });
      return { host, invitee, session, service, invitation };
    };

    it('ACCEPT flips PENDING -> ACCEPTED and stamps responded_at', async () => {
      const { invitee, service, invitation } = await seedInvite();
      const updated = await service.respondToInvite(
        invitation.id,
        invitee.id,
        true,
      );
      expect(updated.status).toBe('ACCEPTED');
      expect(updated.respondedAt).not.toBeNull();
    });

    it('DECLINE flips PENDING -> DECLINED', async () => {
      const { invitee, service, invitation } = await seedInvite();
      const updated = await service.respondToInvite(
        invitation.id,
        invitee.id,
        false,
      );
      expect(updated.status).toBe('DECLINED');
    });

    it('lets ONLY the invitee respond', async () => {
      const { service, invitation } = await seedInvite();
      const intruder = mock.seedAccount();
      await expect(
        service.respondToInvite(invitation.id, intruder.id, true),
      ).rejects.toMatchObject({ code: 'not_your_invitation' });
    });

    it('refuses a second response (no double-accept)', async () => {
      const { invitee, service, invitation } = await seedInvite();
      await service.respondToInvite(invitation.id, invitee.id, true);
      await expect(
        service.respondToInvite(invitation.id, invitee.id, false),
      ).rejects.toMatchObject({ code: 'already_responded' });
    });
  });

  // -------------------------------------------------------------------------
  // 3. joinByCode() resolves the session behind an invite_code.
  // -------------------------------------------------------------------------
  describe('joinByCode()', () => {
    it('resolves a PUBLIC session by its invite_code and joins as viewer', async () => {
      const host = mock.seedAccount();
      const viewer = mock.seedAccount();
      const session = mock.seedSession({
        hostAccountId: host.id,
        kind: 'STORYTELLING',
        visibilityScope: 'PUBLIC',
        inviteCode: 'CONTE7',
        status: 'LIVE',
      });
      const service = buildService();

      const result = await service.joinByCode('CONTE7', viewer.id);
      expect(result.session.id).toBe(session.id);
      expect(result.role).toBe('viewer');
      expect(result.token.configured).toBe(true);
      expect(mock.db.participants).toHaveLength(1);
      expect(mock.db.participants[0].accountId).toBe(viewer.id);
    });

    it('resolves a FAMILY session by code, admitting an in-degree relative (real graph)', async () => {
      // S --parent--> C1 : the host anchors the live on S; C1 is degree 1.
      mock.seedParentChild('S', 'C1');
      const host = mock.seedAccount();
      const cousin = mock.seedAccount();
      mock.seedClaim({ accountId: cousin.id, personId: 'C1' });
      const session = mock.seedSession({
        hostAccountId: host.id,
        kind: 'FAMILY_COUNCIL',
        visibilityScope: 'FAMILY',
        visibleMaxDegree: 1,
        subjectPersonId: 'S',
        inviteCode: 'FAM123',
        status: 'LIVE',
      });
      const service = buildService();

      const result = await service.joinByCode('FAM123', cousin.id);
      expect(result.session.id).toBe(session.id);
      expect(mock.db.participants).toHaveLength(1);
    });

    it('still enforces visibility: an out-of-degree caller is denied even with the code', async () => {
      mock.seedParentChild('S', 'C1');
      mock.seedParentChild('C1', 'C2');
      const host = mock.seedAccount();
      const distant = mock.seedAccount();
      mock.seedClaim({ accountId: distant.id, personId: 'C2' }); // degree 2
      mock.seedSession({
        hostAccountId: host.id,
        visibilityScope: 'FAMILY',
        visibleMaxDegree: 1,
        subjectPersonId: 'S',
        inviteCode: 'FAM999',
        status: 'LIVE',
      });
      const service = buildService();

      await expect(
        service.joinByCode('FAM999', distant.id),
      ).rejects.toMatchObject({ code: 'out_of_degree' });
      expect(mock.db.participants).toHaveLength(0);
    });

    it('rejects an unknown invite_code', async () => {
      const service = buildService();
      await expect(
        service.joinByCode('NOPE', mock.seedAccount().id),
      ).rejects.toMatchObject({ code: 'invalid_code' });
    });
  });

  // -------------------------------------------------------------------------
  // 4. raiseHand() toggles the caller's hand_raised flag.
  // -------------------------------------------------------------------------
  describe('raiseHand()', () => {
    it('toggles hand_raised true, then false on a second call', async () => {
      const host = mock.seedAccount();
      const viewer = mock.seedAccount();
      const session = mock.seedSession({
        hostAccountId: host.id,
        status: 'LIVE',
      });
      mock.seedParticipant({
        liveSessionId: session.id,
        accountId: viewer.id,
        role: 'viewer',
      });
      const service = buildService();

      const up = await service.raiseHand(session.id, viewer.id);
      expect(up.handRaised).toBe(true);

      const down = await service.raiseHand(session.id, viewer.id);
      expect(down.handRaised).toBe(false);
    });

    it('refuses to raise a hand for an account that never joined', async () => {
      const host = mock.seedAccount();
      const ghost = mock.seedAccount();
      const session = mock.seedSession({
        hostAccountId: host.id,
        status: 'LIVE',
      });
      const service = buildService();
      await expect(
        service.raiseHand(session.id, ghost.id),
      ).rejects.toMatchObject({ code: 'not_a_participant' });
    });
  });

  // -------------------------------------------------------------------------
  // 5. promoteToSpeaker() — host-only, sets is_speaker.
  // -------------------------------------------------------------------------
  describe('promoteToSpeaker()', () => {
    it('host promotes a viewer: is_speaker true, role speaker, hand lowered', async () => {
      const host = mock.seedAccount();
      const viewer = mock.seedAccount();
      const session = mock.seedSession({
        hostAccountId: host.id,
        status: 'LIVE',
      });
      mock.seedParticipant({
        liveSessionId: session.id,
        accountId: viewer.id,
        role: 'viewer',
        handRaised: true,
      });
      const service = buildService();

      const promoted = await service.promoteToSpeaker(
        session.id,
        host.id,
        viewer.id,
      );
      expect(promoted.isSpeaker).toBe(true);
      expect(promoted.role).toBe('speaker');
      expect(promoted.handRaised).toBe(false);

      const audit = mock.db.contributions.find(
        (c) => c.action === 'PROMOTE_SPEAKER',
      );
      expect(audit).toBeDefined();
    });

    it('forbids a non-host from promoting', async () => {
      const host = mock.seedAccount();
      const viewer = mock.seedAccount();
      const impostor = mock.seedAccount();
      const session = mock.seedSession({
        hostAccountId: host.id,
        status: 'LIVE',
      });
      mock.seedParticipant({
        liveSessionId: session.id,
        accountId: viewer.id,
        role: 'viewer',
      });
      const service = buildService();
      await expect(
        service.promoteToSpeaker(session.id, impostor.id, viewer.id),
      ).rejects.toMatchObject({ code: 'only_host_may_promote' });
    });

    it('rejects promoting an account that is not a participant', async () => {
      const host = mock.seedAccount();
      const nonParticipant = mock.seedAccount();
      const session = mock.seedSession({
        hostAccountId: host.id,
        status: 'LIVE',
      });
      const service = buildService();
      await expect(
        service.promoteToSpeaker(session.id, host.id, nonParticipant.id),
      ).rejects.toMatchObject({ code: 'not_a_participant' });
    });
  });

  // -------------------------------------------------------------------------
  // 6. start() auto-posts a FeedPost mirroring the live's visibility.
  // -------------------------------------------------------------------------
  describe('start() — family FeedPost auto-post', () => {
    it('a FAMILY live auto-posts a FAMILY FeedPost and emits live.started', async () => {
      const host = mock.seedAccount();
      const session = mock.seedSession({
        hostAccountId: host.id,
        title: 'Funérailles de Grand-père',
        kind: 'CEREMONY',
        visibilityScope: 'FAMILY',
        visibleMaxDegree: 2,
        subjectPersonId: 'S',
        status: 'SCHEDULED',
      });
      const service = buildService();

      const { session: started, feedPost } = await service.start(
        session.id,
        host.id,
      );
      expect(started.status).toBe('LIVE');
      expect(started.startedAt).not.toBeNull();

      // Auto-post mirrors the live's visibility + anchor.
      expect(mock.db.feedPosts).toHaveLength(1);
      expect(feedPost.postType).toBe('live_started');
      expect(feedPost.visibilityScope).toBe('FAMILY');
      expect(feedPost.visibleMaxDegree).toBe(2);
      expect(feedPost.subjectPersonId).toBe('S');
      expect(feedPost.authorAccountId).toBe(host.id);

      const event = publishedEvents.find((e) => e.type === 'live.started');
      expect(event).toBeDefined();
      expect(event?.visibilityScope).toBe('FAMILY');
      expect(event?.feedPostId).toBe(feedPost.id);
    });

    it('a PUBLIC live auto-posts a PUBLIC FeedPost', async () => {
      const host = mock.seedAccount();
      const session = mock.seedSession({
        hostAccountId: host.id,
        kind: 'LESSON',
        visibilityScope: 'PUBLIC',
        subjectPersonId: null,
        status: 'SCHEDULED',
      });
      const service = buildService();

      const { feedPost } = await service.start(session.id, host.id);
      expect(feedPost.visibilityScope).toBe('PUBLIC');
      expect(feedPost.subjectPersonId).toBeNull();
    });

    it('only the host may start (no auto-post on a forbidden start)', async () => {
      const host = mock.seedAccount();
      const other = mock.seedAccount();
      const session = mock.seedSession({
        hostAccountId: host.id,
        status: 'SCHEDULED',
      });
      const service = buildService();
      await expect(
        service.start(session.id, other.id),
      ).rejects.toMatchObject({ code: 'only_host_may_start' });
      expect(mock.db.feedPosts).toHaveLength(0);
    });

    it('refuses to start a session that is not SCHEDULED', async () => {
      const host = mock.seedAccount();
      const session = mock.seedSession({
        hostAccountId: host.id,
        status: 'LIVE',
      });
      const service = buildService();
      await expect(
        service.start(session.id, host.id),
      ).rejects.toMatchObject({ code: 'not_scheduled' });
    });
  });

  // -------------------------------------------------------------------------
  // Token gating cross-check: join-by-code degrades, never crashes.
  // -------------------------------------------------------------------------
  describe('LiveKit token gating on join-by-code', () => {
    it('joins by code with a "not configured" token when LiveKit env is unset', async () => {
      const host = mock.seedAccount();
      const viewer = mock.seedAccount();
      const session = mock.seedSession({
        hostAccountId: host.id,
        visibilityScope: 'PUBLIC',
        inviteCode: 'OPEN1',
        status: 'LIVE',
      });
      const service = buildService({}); // LiveKit unconfigured

      const result = await service.joinByCode('OPEN1', viewer.id);
      expect(result.token.configured).toBe(false);
      expect(result.token.reason).toBe(LIVE_NOT_CONFIGURED);
      // Participant is still recorded — the app degrades, never crashes.
      expect(mock.db.participants).toHaveLength(1);
      expect(session.id).toBe(result.session.id);
    });
  });
});
