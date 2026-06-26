/**
 * ELEVATION WAVE 1 — LIVE rebuild executable contract (reference implementation).
 *
 * WHY THIS EXISTS (parallel-safety):
 * The production LIVE rebuild (apps/api/src/modules/live) — invitations, presence
 * controls (raise-hand / promote-to-speaker), the invite_code join shortcut, the
 * invite Notification fan-out, and the family FeedPost auto-posted when a live
 * starts — is authored in parallel by other devs, and 'livekit-server-sdk' is an
 * integration-time dep not installed in this workspace. So this file is a
 * *behavioural contract*: a minimal, faithful reference of the rules the real
 * LiveService MUST satisfy. live-rebuild.e2e-spec.ts drives THIS against the
 * in-memory Prisma double (live-rebuild-prisma-mock.ts) AND the REAL
 * GraphDegreeService, so the degree-bounded FAMILY join-by-code seam is exercised
 * for real, not re-implemented.
 *
 * When the production service lands, the integrator re-points the spec at it (the
 * mock + scenarios are reusable verbatim); every assertion here is a clause the
 * real implementation has to keep green. See docs/ELEVATION-WAVE1-TESTPLAN.md.
 *
 * Contract clauses encoded:
 *  - invite(): host-only; creates a PENDING LiveInvitation; fans out an
 *    INVITATION_RECEIVED Notification to an on-platform invitee (an off-platform
 *    phone invite creates NO notification — there is no account to notify);
 *    writes a Contribution audit row.
 *  - respondToInvite(): only the invitee may respond, and only once; flips
 *    PENDING -> ACCEPTED/DECLINED and stamps responded_at.
 *  - joinByCode(): resolves a session by its invite_code, enforces visibility
 *    (PUBLIC open; FAMILY degree-bounded via the REAL GraphDegreeService; host
 *    always reaches their own), mints an (env-gated) token and upserts the
 *    participant.
 *  - raiseHand(): toggles hand_raised on the caller's participant row (requires
 *    the caller to have joined).
 *  - promoteToSpeaker(): host-only; flips a participant's is_speaker true, sets
 *    role 'speaker', and lowers any raised hand.
 *  - start(): host-only; SCHEDULED -> LIVE; AUTO-POSTS a FeedPost mirroring the
 *    live's visibility (a FAMILY live -> a FAMILY feed post), then emits a
 *    'live.started' event. Every mutation writes a Contribution audit row.
 *
 * No-`any` throughout. snake_case lives in the DB (the mock @maps it); this code
 * speaks the camelCase Prisma client surface.
 */
import {
  DEFAULT_MAX_DEGREE,
  GraphDegreeService,
} from '../../src/modules/authorization/graph-degree.service';
import type {
  MockFeedPost,
  MockLiveInvitation,
  MockLiveParticipant,
  MockLiveSession,
} from './live-rebuild-prisma-mock';

/** Stable error code surfaced when LiveKit env creds are absent. */
export const LIVE_NOT_CONFIGURED = 'live_not_configured';

export type LiveParticipantRole = 'host' | 'speaker' | 'viewer';

/** Notification type fired to an on-platform invitee (mirrors the schema enum). */
export const INVITATION_NOTIFICATION_TYPE = 'INVITATION_RECEIVED';

export interface LiveEnv {
  LIVEKIT_API_KEY?: string;
  LIVEKIT_API_SECRET?: string;
  LIVEKIT_URL?: string;
}

export interface LiveTokenResult {
  configured: boolean;
  reason?: string;
  token?: string;
  url?: string;
  canPublish?: boolean;
}

/** Deterministic, dependency-free fake token (NEVER the real SDK). */
const fakeSign = (
  identity: string,
  roomName: string,
  canPublish: boolean,
): string =>
  Buffer.from(`${roomName}:${identity}:${canPublish ? 'pub' : 'sub'}`).toString(
    'base64url',
  );

/**
 * Env-gated token minting seam. No creds => graceful "not configured" (never a
 * throw), so the app still builds, boots, and degrades to "coming soon".
 */
export class LiveTokenGate {
  constructor(private readonly env: LiveEnv) {}

  mint(
    identity: string,
    roomName: string,
    role: LiveParticipantRole,
  ): LiveTokenResult {
    const { LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_URL } = this.env;
    if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET || !LIVEKIT_URL) {
      return { configured: false, reason: LIVE_NOT_CONFIGURED };
    }
    const canPublish = role === 'host' || role === 'speaker';
    return {
      configured: true,
      token: fakeSign(identity, roomName, canPublish),
      url: LIVEKIT_URL,
      canPublish,
    };
  }
}

/** Raised for contract violations; carries a stable machine-readable code. */
export class LiveError extends Error {
  constructor(
    readonly code: string,
    message?: string,
  ) {
    super(message ?? code);
    this.name = 'LiveError';
  }
}

export interface LiveEvent {
  type: string;
  [key: string]: unknown;
}

export interface EventSink {
  publish(event: LiveEvent): Promise<void>;
}

export interface AccessDecision {
  allowed: boolean;
  reason?: string;
  degree?: number | null;
}

export interface InviteInput {
  invitedAccountId?: string | null;
  invitedPhone?: string | null;
}

export interface JoinResult {
  session: MockLiveSession;
  role: LiveParticipantRole;
  token: LiveTokenResult;
  participant: MockLiveParticipant;
}

export interface StartResult {
  session: MockLiveSession;
  feedPost: MockFeedPost;
}

// --- the slim Prisma surface the reference actually touches ----------------

interface ClaimRow {
  personId: string;
}

interface ServicePrisma {
  claim: {
    findFirst(args: {
      where: { accountId: string; status: string };
    }): Promise<ClaimRow | null>;
  };
  liveSession: {
    findUnique(args: {
      where: { id: string };
    }): Promise<MockLiveSession | null>;
    findFirst(args: { where: Record<string, unknown> }): Promise<
      MockLiveSession | null
    >;
    update(args: {
      where: { id: string };
      data: Record<string, unknown>;
    }): Promise<MockLiveSession>;
  };
  liveParticipant: {
    findFirst(args: {
      where: { liveSessionId: string; accountId: string };
    }): Promise<MockLiveParticipant | null>;
    create(args: {
      data: Record<string, unknown>;
    }): Promise<MockLiveParticipant>;
    update(args: {
      where: { id: string };
      data: Record<string, unknown>;
    }): Promise<MockLiveParticipant>;
  };
  liveInvitation: {
    create(args: {
      data: Record<string, unknown>;
    }): Promise<MockLiveInvitation>;
    findUnique(args: {
      where: { id: string };
    }): Promise<MockLiveInvitation | null>;
    update(args: {
      where: { id: string };
      data: Record<string, unknown>;
    }): Promise<MockLiveInvitation>;
  };
  notification: {
    create(args: { data: Record<string, unknown> }): Promise<unknown>;
  };
  feedPost: {
    create(args: { data: Record<string, unknown> }): Promise<MockFeedPost>;
  };
  contribution: {
    create(args: { data: Record<string, unknown> }): Promise<unknown>;
  };
}

/**
 * Reference LIVE-rebuild service. Every mutation writes a Contribution audit row
 * (project rule) and gates LiveKit on env creds via {@link LiveTokenGate}.
 */
export class LiveRebuildService {
  constructor(
    private readonly prisma: ServicePrisma,
    private readonly graph: GraphDegreeService,
    private readonly tokenGate: LiveTokenGate,
    private readonly events: EventSink,
  ) {}

  // ---- invitations -------------------------------------------------------

  /**
   * Invite an account (or an off-platform phone) to a live. Host-only. Creates a
   * PENDING invitation and, for an on-platform invitee, an INVITATION_RECEIVED
   * notification. An off-platform phone invite creates NO notification.
   */
  async invite(
    sessionId: string,
    inviterAccountId: string,
    input: InviteInput,
  ): Promise<MockLiveInvitation> {
    const session = await this.requireSession(sessionId);
    if (session.hostAccountId !== inviterAccountId) {
      throw new LiveError('only_host_may_invite');
    }
    const invitedAccountId = input.invitedAccountId ?? null;
    const invitedPhone = input.invitedPhone ?? null;
    if (!invitedAccountId && !invitedPhone) {
      throw new LiveError('invitee_required');
    }

    const invitation = await this.prisma.liveInvitation.create({
      data: {
        liveSessionId: sessionId,
        inviterAccountId,
        invitedAccountId,
        invitedPhone,
        status: 'PENDING',
      },
    });

    if (invitedAccountId) {
      await this.prisma.notification.create({
        data: {
          accountId: invitedAccountId,
          notificationType: INVITATION_NOTIFICATION_TYPE,
          title: `Invitation: ${session.title}`,
          body: 'Vous êtes invité(e) à une session en direct / You are invited to a live session',
          relatedEntityType: 'live_session',
          relatedEntityId: sessionId,
          actionUrl: `/live/${sessionId}`,
        },
      });
    }

    await this.audit(inviterAccountId, sessionId, 'INVITE');
    return invitation;
  }

  /**
   * Respond to an invitation. Only the invited account may respond, and only
   * while it is still PENDING. Flips status and stamps responded_at.
   */
  async respondToInvite(
    invitationId: string,
    accountId: string,
    accept: boolean,
  ): Promise<MockLiveInvitation> {
    const invitation = await this.prisma.liveInvitation.findUnique({
      where: { id: invitationId },
    });
    if (!invitation || invitation.deletedAt) {
      throw new LiveError('not_found');
    }
    if (invitation.invitedAccountId !== accountId) {
      throw new LiveError('not_your_invitation');
    }
    if (invitation.status !== 'PENDING') {
      throw new LiveError('already_responded');
    }
    const updated = await this.prisma.liveInvitation.update({
      where: { id: invitationId },
      data: {
        status: accept ? 'ACCEPTED' : 'DECLINED',
        respondedAt: new Date(),
      },
    });
    await this.audit(accountId, invitation.liveSessionId, 'RESPOND_INVITE');
    return updated;
  }

  // ---- joining -----------------------------------------------------------

  /**
   * Resolve a session by its invite_code, then join it. The code is a join
   * shortcut, NOT an access bypass: visibility is still enforced.
   */
  async joinByCode(inviteCode: string, accountId: string): Promise<JoinResult> {
    const session = await this.prisma.liveSession.findFirst({
      where: { inviteCode, deletedAt: null },
    });
    if (!session) {
      throw new LiveError('invalid_code');
    }
    return this.join(session, accountId);
  }

  private async join(
    session: MockLiveSession,
    accountId: string,
  ): Promise<JoinResult> {
    const access = await this.canJoin(session, accountId);
    if (!access.allowed) {
      throw new LiveError(access.reason ?? 'forbidden');
    }
    const role: LiveParticipantRole =
      session.hostAccountId === accountId ? 'host' : 'viewer';
    const token = this.tokenGate.mint(accountId, session.roomName, role);

    const existing = await this.prisma.liveParticipant.findFirst({
      where: { liveSessionId: session.id, accountId },
    });
    const participant = existing
      ? await this.prisma.liveParticipant.update({
          where: { id: existing.id },
          data: { joinedAt: new Date(), leftAt: null },
        })
      : await this.prisma.liveParticipant.create({
          data: {
            liveSessionId: session.id,
            accountId,
            role,
            isSpeaker: role === 'host',
            joinedAt: new Date(),
          },
        });
    await this.audit(accountId, session.id, 'JOIN');
    return { session, role, token, participant };
  }

  // ---- presence controls -------------------------------------------------

  /** Toggle the caller's raised-hand flag. Requires an existing participant. */
  async raiseHand(
    sessionId: string,
    accountId: string,
  ): Promise<MockLiveParticipant> {
    const participant = await this.prisma.liveParticipant.findFirst({
      where: { liveSessionId: sessionId, accountId },
    });
    if (!participant) {
      throw new LiveError('not_a_participant');
    }
    const updated = await this.prisma.liveParticipant.update({
      where: { id: participant.id },
      data: { handRaised: !participant.handRaised },
    });
    await this.audit(accountId, sessionId, 'RAISE_HAND');
    return updated;
  }

  /**
   * Host promotes a participant to speaker: flips is_speaker, sets role
   * 'speaker', and lowers any raised hand (promotion answers the request).
   */
  async promoteToSpeaker(
    sessionId: string,
    hostAccountId: string,
    targetAccountId: string,
  ): Promise<MockLiveParticipant> {
    const session = await this.requireSession(sessionId);
    if (session.hostAccountId !== hostAccountId) {
      throw new LiveError('only_host_may_promote');
    }
    const participant = await this.prisma.liveParticipant.findFirst({
      where: { liveSessionId: sessionId, accountId: targetAccountId },
    });
    if (!participant) {
      throw new LiveError('not_a_participant');
    }
    const updated = await this.prisma.liveParticipant.update({
      where: { id: participant.id },
      data: { isSpeaker: true, role: 'speaker', handRaised: false },
    });
    await this.audit(hostAccountId, sessionId, 'PROMOTE_SPEAKER');
    return updated;
  }

  // ---- lifecycle (with auto-post) ---------------------------------------

  /**
   * Start a live (host only): SCHEDULED -> LIVE, then AUTO-POST a FeedPost that
   * mirrors the live's visibility so relatives discover it in their feed, and
   * emit a 'live.started' event.
   */
  async start(sessionId: string, accountId: string): Promise<StartResult> {
    const session = await this.requireSession(sessionId);
    if (session.hostAccountId !== accountId) {
      throw new LiveError('only_host_may_start');
    }
    if (session.status !== 'SCHEDULED') {
      throw new LiveError('not_scheduled');
    }
    const updated = await this.prisma.liveSession.update({
      where: { id: sessionId },
      data: { status: 'LIVE', startedAt: new Date() },
    });
    await this.audit(accountId, sessionId, 'START');

    const feedPost = await this.prisma.feedPost.create({
      data: {
        authorAccountId: accountId,
        subjectPersonId: session.subjectPersonId,
        postType: 'live_started',
        body: `🔴 En direct: ${session.title}`,
        visibilityScope: session.visibilityScope,
        visibleMaxDegree: session.visibleMaxDegree,
      },
    });

    await this.events.publish({
      type: 'live.started',
      liveSessionId: sessionId,
      visibilityScope: session.visibilityScope,
      feedPostId: feedPost.id,
    });
    return { session: updated, feedPost };
  }

  // ---- internals ---------------------------------------------------------

  /** Visibility: PUBLIC open; host=0; FAMILY degree-bounded; PRIVATE_SELF subject. */
  async canJoin(
    session: MockLiveSession,
    accountId: string,
  ): Promise<AccessDecision> {
    if (session.deletedAt) {
      return { allowed: false, reason: 'not_found' };
    }
    if (session.visibilityScope === 'PUBLIC') {
      return { allowed: true };
    }
    if (session.hostAccountId === accountId) {
      return { allowed: true, degree: 0 };
    }
    if (!session.subjectPersonId) {
      return { allowed: false, reason: 'no_anchor' };
    }
    const personId = await this.resolvePersonId(accountId);
    if (!personId) {
      return { allowed: false, reason: 'no_claimed_person' };
    }
    if (session.visibilityScope === 'PRIVATE_SELF') {
      return personId === session.subjectPersonId
        ? { allowed: true, degree: 0 }
        : { allowed: false, reason: 'private_self' };
    }
    const maxDegree = session.visibleMaxDegree ?? DEFAULT_MAX_DEGREE;
    const degree = await this.graph.computeDegree(
      personId,
      session.subjectPersonId,
      maxDegree,
    );
    if (degree === null) {
      return { allowed: false, reason: 'out_of_degree', degree: null };
    }
    return { allowed: true, degree };
  }

  private async resolvePersonId(accountId: string): Promise<string | null> {
    const claim = await this.prisma.claim.findFirst({
      where: { accountId, status: 'VERIFIED' },
    });
    return claim?.personId ?? null;
  }

  private async requireSession(sessionId: string): Promise<MockLiveSession> {
    const session = await this.prisma.liveSession.findUnique({
      where: { id: sessionId },
    });
    if (!session || session.deletedAt) {
      throw new LiveError('not_found');
    }
    return session;
  }

  private async audit(
    accountId: string,
    entityId: string,
    action: string,
  ): Promise<void> {
    await this.prisma.contribution.create({
      data: {
        accountId,
        entityType: 'live_session',
        entityId,
        action,
      },
    });
  }
}
