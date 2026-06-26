/**
 * Phase-5 LIVE — executable contract (reference implementation).
 *
 * WHY THIS EXISTS (parallel-safety):
 * The production LIVE services/controllers are authored in parallel by other
 * devs under apps/api/src/modules/live (not importable yet without risking a
 * broken e2e compile), and 'livekit-server-sdk' is an integration-time dep that
 * is not installed in this workspace. So this file is a *behavioural contract*:
 * a minimal, faithful reference of the rules the real LiveSessionService /
 * LiveTokenService MUST satisfy. phase5-live.e2e-spec.ts drives THIS against the
 * in-memory Prisma double AND the REAL GraphDegreeService, so the degree-bounded
 * access seam is exercised for real.
 *
 * Once the production services land, the integrator re-points the spec at them
 * (the mock + scenarios are reusable verbatim); every assertion here is a clause
 * the real implementation has to keep green. See docs/PHASE5-TESTPLAN.md.
 *
 * Contract clauses encoded:
 *  - LiveTokenGate: ALL LiveKit usage gated on env creds. Unset => a clear
 *    "not configured" result (never a throw / crash). Set => a token + url.
 *    The actual signing is injected (default: a deterministic fake), so the
 *    real code can swap in livekit-server-sdk's AccessToken unchanged.
 *  - LiveAccessPolicy: PUBLIC lives open to any authenticated account;
 *    PRIVATE_SELF/FAMILY lives require the requester within visible_max_degree
 *    of subject_person_id (via the REAL GraphDegreeService); only a verified
 *    CulturalAuthority host may CREATE a PUBLIC LESSON/MASTERCLASS.
 *  - LiveSessionService: create/join/end/publishReplay, each writing a
 *    Contribution audit row; replay publication flips replay_published and emits
 *    the feed surface (PUBLIC -> public discovery, otherwise -> family feed).
 *
 * No-`any` throughout. snake_case lives in the DB (the mock @maps it); this code
 * speaks the camelCase Prisma client surface.
 */
import {
  DEFAULT_MAX_DEGREE,
  GraphDegreeService,
} from '../../src/modules/authorization/graph-degree.service';
import type {
  MockLiveSession,
  MockLiveSessionKind,
  MockVisibilityScope,
} from './phase5-live-prisma-mock';

/** Stable error code surfaced when LiveKit env creds are absent. */
export const LIVE_NOT_CONFIGURED = 'live_not_configured';

export type LiveParticipantRole = 'host' | 'speaker' | 'viewer';

export interface LiveEnv {
  LIVEKIT_API_KEY?: string;
  LIVEKIT_API_SECRET?: string;
  LIVEKIT_URL?: string;
}

export interface MintArgs {
  apiKey: string;
  apiSecret: string;
  identity: string;
  roomName: string;
  canPublish: boolean;
}

/** Pluggable signer — the real code passes livekit-server-sdk's AccessToken. */
export type TokenSigner = (args: MintArgs) => string;

export interface LiveTokenResult {
  configured: boolean;
  reason?: string;
  token?: string;
  url?: string;
  identity?: string;
  roomName?: string;
  canPublish?: boolean;
}

/** Deterministic, dependency-free fake token (NEVER the real SDK). */
export const fakeSigner: TokenSigner = ({ identity, roomName, canPublish }) =>
  Buffer.from(`${roomName}:${identity}:${canPublish ? 'pub' : 'sub'}`).toString(
    'base64url',
  );

/**
 * Mirrors the env-gated token-minting seam. The real LiveTokenService follows
 * the exact same shape (the Sentry no-op pattern): no creds => graceful
 * "not configured"; never throws, so the app still builds and boots.
 */
export class LiveTokenGate {
  constructor(
    private readonly env: LiveEnv,
    private readonly sign: TokenSigner = fakeSigner,
  ) {}

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
    const token = this.sign({
      apiKey: LIVEKIT_API_KEY,
      apiSecret: LIVEKIT_API_SECRET,
      identity,
      roomName,
      canPublish,
    });
    return {
      configured: true,
      token,
      url: LIVEKIT_URL,
      identity,
      roomName,
      canPublish,
    };
  }
}

export interface AccessDecision {
  allowed: boolean;
  reason?: string;
  degree?: number | null;
}

export interface CreateDecision {
  allowed: boolean;
  reason?: string;
  hostAuthorityId?: string | null;
}

export interface CreateLiveInput {
  title: string;
  kind: MockLiveSessionKind;
  visibilityScope: MockVisibilityScope;
  visibleMaxDegree?: number | null;
  subjectPersonId?: string | null;
  roomName: string;
  description?: string | null;
  scheduledAt?: Date | null;
}

interface ClaimRow {
  personId: string;
}
interface AuthorityRow {
  id: string;
}

interface PolicyPrisma {
  claim: {
    findFirst(args: {
      where: { accountId: string; status: string };
    }): Promise<ClaimRow | null>;
  };
  culturalAuthority: {
    findFirst(args: {
      where: { accountId: string; verified: boolean; deletedAt: null };
    }): Promise<AuthorityRow | null>;
  };
}

/**
 * Access control for LIVE sessions, built on the SAME seams as the rest of the
 * platform: Claim (VERIFIED -> personId) + the real GraphDegreeService for
 * FAMILY degree-bounded reach, and CulturalAuthority for who may host a public
 * masterclass.
 */
export class LiveAccessPolicy {
  constructor(
    private readonly prisma: PolicyPrisma,
    private readonly graph: GraphDegreeService,
  ) {}

  /** The person an account has VERIFIED-claimed, or null if none. */
  async resolvePersonId(accountId: string): Promise<string | null> {
    const claim = await this.prisma.claim.findFirst({
      where: { accountId, status: 'VERIFIED' },
    });
    return claim?.personId ?? null;
  }

  /** Who may CREATE this session. */
  async canCreate(
    input: Pick<CreateLiveInput, 'kind' | 'visibilityScope'>,
    accountId: string,
  ): Promise<CreateDecision> {
    const isPublic = input.visibilityScope === 'PUBLIC';
    const gatedKind =
      input.kind === 'LESSON' || input.kind === 'MASTERCLASS';
    // Only a verified CulturalAuthority may host a PUBLIC lesson/masterclass.
    if (isPublic && gatedKind) {
      const authority = await this.prisma.culturalAuthority.findFirst({
        where: { accountId, verified: true, deletedAt: null },
      });
      if (!authority) {
        return { allowed: false, reason: 'authority_required' };
      }
      return { allowed: true, hostAuthorityId: authority.id };
    }
    return { allowed: true, hostAuthorityId: null };
  }

  /** Who may JOIN this session (and view its replay — same visibility). */
  async canJoin(
    session: Pick<
      MockLiveSession,
      | 'hostAccountId'
      | 'visibilityScope'
      | 'visibleMaxDegree'
      | 'subjectPersonId'
      | 'deletedAt'
    >,
    accountId: string,
  ): Promise<AccessDecision> {
    if (session.deletedAt) {
      return { allowed: false, reason: 'not_found' };
    }
    // PUBLIC lives are open to any authenticated account.
    if (session.visibilityScope === 'PUBLIC') {
      return { allowed: true };
    }
    // The host always reaches their own live.
    if (session.hostAccountId === accountId) {
      return { allowed: true, degree: 0 };
    }
    // PRIVATE_SELF / FAMILY require a graph anchor.
    if (!session.subjectPersonId) {
      return { allowed: false, reason: 'no_anchor' };
    }
    const personId = await this.resolvePersonId(accountId);
    if (!personId) {
      return { allowed: false, reason: 'no_claimed_person' };
    }
    // PRIVATE_SELF: only the subject person themselves.
    if (session.visibilityScope === 'PRIVATE_SELF') {
      return personId === session.subjectPersonId
        ? { allowed: true, degree: 0 }
        : { allowed: false, reason: 'private_self' };
    }
    // FAMILY: requester must be within visible_max_degree of the subject.
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

interface ServicePrisma extends PolicyPrisma {
  liveSession: {
    create(args: { data: Record<string, unknown> }): Promise<MockLiveSession>;
    findUnique(args: {
      where: { id: string };
    }): Promise<MockLiveSession | null>;
    update(args: {
      where: { id: string };
      data: Record<string, unknown>;
    }): Promise<MockLiveSession>;
  };
  liveParticipant: {
    findFirst(args: {
      where: { liveSessionId: string; accountId: string };
    }): Promise<{ id: string } | null>;
    create(args: { data: Record<string, unknown> }): Promise<{ id: string }>;
    update(args: {
      where: { id: string };
      data: Record<string, unknown>;
    }): Promise<{ id: string }>;
  };
  contribution: {
    create(args: { data: Record<string, unknown> }): Promise<unknown>;
  };
}

export interface JoinResult {
  session: MockLiveSession;
  access: AccessDecision;
  role: LiveParticipantRole;
  token: LiveTokenResult;
}

export interface ReplayResult {
  session: MockLiveSession;
  surface: 'public-feed' | 'family-feed';
}

/**
 * Reference LIVE session service. Every mutation writes a Contribution audit row
 * (project rule) and gates LiveKit on env creds via LiveTokenGate.
 */
export class LiveSessionService {
  constructor(
    private readonly prisma: ServicePrisma,
    private readonly policy: LiveAccessPolicy,
    private readonly tokenGate: LiveTokenGate,
    private readonly events: EventSink,
  ) {}

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

  async create(
    input: CreateLiveInput,
    accountId: string,
  ): Promise<MockLiveSession> {
    const decision = await this.policy.canCreate(input, accountId);
    if (!decision.allowed) {
      throw new LiveError(decision.reason ?? 'forbidden');
    }
    const session = await this.prisma.liveSession.create({
      data: {
        hostAccountId: accountId,
        hostAuthorityId: decision.hostAuthorityId ?? null,
        title: input.title,
        description: input.description ?? null,
        kind: input.kind,
        visibilityScope: input.visibilityScope,
        visibleMaxDegree: input.visibleMaxDegree ?? null,
        subjectPersonId: input.subjectPersonId ?? null,
        roomName: input.roomName,
        status: 'SCHEDULED',
        scheduledAt: input.scheduledAt ?? null,
      },
    });
    await this.audit(accountId, session.id, 'CREATE');
    return session;
  }

  /** Start a live (host only). Transitions SCHEDULED -> LIVE. */
  async start(sessionId: string, accountId: string): Promise<MockLiveSession> {
    const session = await this.requireSession(sessionId);
    if (session.hostAccountId !== accountId) {
      throw new LiveError('only_host_may_start');
    }
    const updated = await this.prisma.liveSession.update({
      where: { id: sessionId },
      data: { status: 'LIVE', startedAt: new Date() },
    });
    await this.audit(accountId, sessionId, 'START');
    return updated;
  }

  /**
   * Join a live: enforce visibility, mint a (possibly "not configured") token,
   * and upsert the participant row.
   */
  async join(sessionId: string, accountId: string): Promise<JoinResult> {
    const session = await this.requireSession(sessionId);
    const access = await this.policy.canJoin(session, accountId);
    if (!access.allowed) {
      throw new LiveError(access.reason ?? 'forbidden');
    }
    const role: LiveParticipantRole =
      session.hostAccountId === accountId ? 'host' : 'viewer';
    const token = this.tokenGate.mint(accountId, session.roomName, role);

    const existing = await this.prisma.liveParticipant.findFirst({
      where: { liveSessionId: sessionId, accountId },
    });
    if (existing) {
      await this.prisma.liveParticipant.update({
        where: { id: existing.id },
        data: { joinedAt: new Date(), leftAt: null },
      });
    } else {
      await this.prisma.liveParticipant.create({
        data: {
          liveSessionId: sessionId,
          accountId,
          role,
          joinedAt: new Date(),
        },
      });
    }
    return { session, access, role, token };
  }

  /** End a live (host only). Records the recording media id for replay. */
  async end(
    sessionId: string,
    accountId: string,
    recordingMediaId: string | null,
  ): Promise<MockLiveSession> {
    const session = await this.requireSession(sessionId);
    if (session.hostAccountId !== accountId) {
      throw new LiveError('only_host_may_end');
    }
    const updated = await this.prisma.liveSession.update({
      where: { id: sessionId },
      data: { status: 'ENDED', endedAt: new Date(), recordingMediaId },
    });
    await this.audit(accountId, sessionId, 'END');
    return updated;
  }

  /**
   * Publish the replay: flips replay_published and emits the feed surface.
   * PUBLIC live -> public discovery feed; otherwise -> family feed (the same
   * visibility the live itself had). Requires an ENDED session with a recording.
   */
  async publishReplay(
    sessionId: string,
    accountId: string,
  ): Promise<ReplayResult> {
    const session = await this.requireSession(sessionId);
    if (session.hostAccountId !== accountId) {
      throw new LiveError('only_host_may_publish');
    }
    if (session.status !== 'ENDED') {
      throw new LiveError('not_ended');
    }
    if (!session.recordingMediaId) {
      throw new LiveError('no_recording');
    }
    if (session.replayPublished) {
      throw new LiveError('already_published');
    }
    const updated = await this.prisma.liveSession.update({
      where: { id: sessionId },
      data: { replayPublished: true },
    });
    await this.audit(accountId, sessionId, 'PUBLISH_REPLAY');

    const surface =
      session.visibilityScope === 'PUBLIC' ? 'public-feed' : 'family-feed';
    await this.events.publish({
      type: 'live.replay.published',
      liveSessionId: sessionId,
      visibilityScope: session.visibilityScope,
      surface,
      recordingMediaId: session.recordingMediaId,
    });
    return { session: updated, surface };
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
}
