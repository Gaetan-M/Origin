import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes, randomUUID } from 'node:crypto';
import {
  LiveSessionKind,
  LiveSessionStatus,
  Prisma,
  VisibilityScope,
  type LiveSession,
} from '@prisma/client';
import type { DomainEvent } from '@origin/shared-types';
import { PrismaService } from '../../prisma/prisma.service';
import { EventPublisher } from '../../eventing/event-publisher';
import {
  DEFAULT_MAX_DEGREE,
  GraphDegreeService,
} from '../authorization/graph-degree.service';
import {
  LivekitTokenService,
  type MintedLivekitToken,
} from './livekit-token.service';
import { LiveNotifyHelper } from './live-notify.helper';
import { LiveInvitationService } from './live-invitation.service';
import { FamilyFeedService } from '../family-feed/family-feed.service';
import { CreateLiveDto } from './dto/create-live.dto';
import { JoinLiveDto } from './dto/join-live.dto';

const LIVE_SESSION_EVENT_VERSION = 1;

/** URL-safe, unambiguous alphabet for share codes (no 0/O/1/I/l). */
const INVITE_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
/** Length of a generated invite code — 8 chars ≈ 30^8 keyspace. */
const INVITE_CODE_LENGTH = 8;
/** Attempts to find a collision-free invite code before giving up. */
const INVITE_CODE_MAX_TRIES = 6;

/** Roles a participant can hold; mirrors LiveParticipant.role (free-form short string). */
export type LiveParticipantRole = 'host' | 'speaker' | 'viewer';

/** Kinds that, when PUBLIC, may only be hosted by a VERIFIED cultural authority. */
const AUTHORITY_GATED_PUBLIC_KINDS: ReadonlySet<LiveSessionKind> = new Set([
  LiveSessionKind.LESSON,
  LiveSessionKind.MASTERCLASS,
]);

/** Hard cap on sessions scanned per list call — DoS guard on the degree BFS. */
const MAX_SESSIONS_SCANNED = 200;

export interface ListSessionsFilter {
  scope?: VisibilityScope;
  status?: LiveSessionStatus;
}

/** Result of a successful join: the minted LiveKit token plus the granted role. */
export interface JoinTokenResult extends MintedLivekitToken {
  liveSessionId: string;
  role: LiveParticipantRole;
}

/**
 * Graceful token response for the web client. `configured` reflects whether
 * LiveKit creds are set; when false the room renders "coming soon" instead of
 * attempting a connection — it never 503s the client.
 */
export interface LiveTokenResponse {
  configured: boolean;
  token: string | null;
  serverUrl: string | null;
  roomName: string | null;
  identity: string | null;
}

/** Replay playback descriptor: media kind (audio-first) + a URL when published. */
export interface LiveReplayResponse {
  mediaKind: 'AUDIO' | 'VIDEO';
  url: string | null;
}

/**
 * Internal lifecycle event payload. Carries only the session's own identity and
 * coarse state — never a computed degree, relationship path, or any private
 * person data beyond the subject anchor that downstream replay/feed handlers
 * legitimately need.
 */
export interface LiveSessionLifecyclePayload {
  liveSessionId: string;
  kind: LiveSessionKind;
  visibilityScope: VisibilityScope;
  status: LiveSessionStatus;
  hostAccountId: string;
  subjectPersonId: string | null;
}

type LiveSessionLifecycleEvent = DomainEvent<
  | 'live-session.created'
  | 'live-session.started'
  | 'live-session.ended',
  LiveSessionLifecyclePayload
>;

/**
 * Live session lifecycle + LiveKit join-token minting.
 *
 * Owns the SCHEDULED -> LIVE -> ENDED transitions (host-only), creates the
 * unique LiveKit room, and enforces the visibility model on both listing and
 * joining: PUBLIC sessions are open to any authenticated account; PRIVATE/
 * FAMILY sessions require the requester to be within the session's
 * `visibleMaxDegree` of `subjectPersonId` (via {@link GraphDegreeService}).
 * Token minting is fully GATED on LiveKit credentials by
 * {@link LivekitTokenService}, so the module builds and boots even when LiveKit
 * is not provisioned. Every mutation writes a Contribution audit row.
 */
@Injectable()
export class LiveService {
  private readonly logger = new Logger(LiveService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly graphDegree: GraphDegreeService,
    private readonly config: ConfigService,
    private readonly eventPublisher: EventPublisher,
    private readonly tokenService: LivekitTokenService,
    private readonly notifyHelper: LiveNotifyHelper,
    private readonly invitations: LiveInvitationService,
    private readonly familyFeed: FamilyFeedService,
  ) {}

  /**
   * Schedule a new live session (status SCHEDULED). The server assigns a unique
   * LiveKit room name. For PUBLIC LESSON/MASTERCLASS the host MUST be a verified
   * cultural authority, otherwise Forbidden.
   */
  async createSession(
    hostAccountId: string,
    dto: CreateLiveDto,
  ): Promise<LiveSession> {
    const visibilityScope = dto.visibilityScope ?? VisibilityScope.FAMILY;
    let hostAuthorityId: string | null = dto.hostAuthorityId ?? null;

    if (
      visibilityScope === VisibilityScope.PUBLIC &&
      AUTHORITY_GATED_PUBLIC_KINDS.has(dto.kind)
    ) {
      hostAuthorityId = await this.resolveVerifiedAuthorityId(
        hostAccountId,
        dto.hostAuthorityId ?? null,
      );
    } else if (hostAuthorityId) {
      // If an authority is pinned for any other kind, it must belong to the host.
      const owned = await this.prisma.culturalAuthority.findFirst({
        where: { id: hostAuthorityId, accountId: hostAccountId, deletedAt: null },
        select: { id: true },
      });
      if (!owned) {
        throw new ForbiddenException(
          'You cannot host under an authority you do not own / Vous ne pouvez pas animer sous une autorité qui ne vous appartient pas',
        );
      }
    }

    const roomName = `live-${randomUUID()}`;
    const inviteCode = await this.generateUniqueInviteCode();

    const session = await this.prisma.$transaction(async (tx) => {
      const created = await tx.liveSession.create({
        data: {
          hostAccountId,
          hostAuthorityId,
          title: dto.title,
          description: dto.description ?? null,
          kind: dto.kind,
          visibilityScope,
          visibleMaxDegree: dto.visibleMaxDegree ?? null,
          subjectPersonId: dto.subjectPersonId ?? null,
          roomName,
          inviteCode,
          status: LiveSessionStatus.SCHEDULED,
          scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        },
      });

      await this.writeContribution(tx, hostAccountId, created.id, 'CREATE', {
        kind: created.kind,
        visibilityScope: created.visibilityScope,
        status: created.status,
      });

      return created;
    });

    await this.publishLifecycle(session, 'live-session.created');
    return session;
  }

  /**
   * Transition a SCHEDULED session to LIVE (host-only), stamping started_at.
   */
  async startSession(
    sessionId: string,
    hostAccountId: string,
  ): Promise<LiveSession> {
    const session = await this.loadOwnedSession(sessionId, hostAccountId);
    if (session.status !== LiveSessionStatus.SCHEDULED) {
      throw new BadRequestException(
        'Only a scheduled session can be started / Seule une session planifiée peut démarrer',
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const next = await tx.liveSession.update({
        where: { id: sessionId },
        data: { status: LiveSessionStatus.LIVE, startedAt: new Date() },
      });
      await this.writeContribution(tx, hostAccountId, sessionId, 'UPDATE', {
        status: next.status,
      });
      return next;
    });

    await this.publishLifecycle(updated, 'live-session.started');
    // Surface the live everywhere it belongs (feed + notifications). Best-effort:
    // a failure here must never undo the LIVE transition the host just made.
    await this.announceLive(updated);
    return updated;
  }

  /**
   * Resolve a session from its shareable invite code (POST /live/join-by-code/:code).
   * A shared link still respects visibility: PUBLIC resolves for anyone, but a
   * FAMILY/PRIVATE link only resolves for someone already inside the family —
   * the code is a convenience, NOT a bypass of the access model.
   */
  async getSessionByCode(
    code: string,
    accountId: string,
  ): Promise<LiveSession> {
    const session = await this.prisma.liveSession.findFirst({
      where: { inviteCode: code, deletedAt: null },
    });
    if (!session) {
      throw new NotFoundException(
        'This live link is invalid or expired / Ce lien de direct est invalide ou expiré',
      );
    }
    const requesterPersonId = await this.resolveRequesterPersonId(accountId);
    const allowed = await this.canView(
      session,
      accountId,
      requesterPersonId,
      new Map(),
    );
    if (!allowed) {
      throw new ForbiddenException(
        'You cannot access this live session / Vous ne pouvez pas accéder à cette session',
      );
    }
    return session;
  }

  /**
   * Transition a LIVE session to ENDED (host-only), stamping ended_at. The
   * recording/replay is attached later by the media seam.
   */
  async endSession(
    sessionId: string,
    hostAccountId: string,
  ): Promise<LiveSession> {
    const session = await this.loadOwnedSession(sessionId, hostAccountId);
    if (session.status !== LiveSessionStatus.LIVE) {
      throw new BadRequestException(
        'Only a live session can be ended / Seule une session en direct peut être terminée',
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const next = await tx.liveSession.update({
        where: { id: sessionId },
        data: { status: LiveSessionStatus.ENDED, endedAt: new Date() },
      });
      await this.writeContribution(tx, hostAccountId, sessionId, 'UPDATE', {
        status: next.status,
      });
      return next;
    });

    await this.publishLifecycle(updated, 'live-session.ended');
    return updated;
  }

  /**
   * List sessions visible to the requester. PUBLIC sessions are always
   * included; PRIVATE/FAMILY sessions pass the degree gate against the
   * requester's claimed person node. Newest-relevant first.
   */
  async listSessions(
    requesterAccountId: string,
    filter: ListSessionsFilter = {},
  ): Promise<LiveSession[]> {
    const where: Prisma.LiveSessionWhereInput = { deletedAt: null };
    if (filter.status) {
      where.status = filter.status;
    }
    if (filter.scope) {
      where.visibilityScope = filter.scope;
    }

    const candidates = await this.prisma.liveSession.findMany({
      where,
      orderBy: [{ scheduledAt: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
      take: MAX_SESSIONS_SCANNED,
    });

    const requesterPersonId =
      await this.resolveRequesterPersonId(requesterAccountId);
    const degreeCache = new Map<string, number | null>();

    const visible: LiveSession[] = [];
    for (const session of candidates) {
      const canSee = await this.canView(
        session,
        requesterAccountId,
        requesterPersonId,
        degreeCache,
      );
      if (canSee) {
        visible.push(session);
      }
    }
    return visible;
  }

  /**
   * Enforce access, then mint a short-lived LiveKit token and record/upsert a
   * LiveParticipant row. The host always publishes; non-hosts default to
   * viewer (subscribe-only) and may be promoted to speaker only on FAMILY-scope
   * sessions when they request it. Mint is gated: when LiveKit is not
   * configured this throws 503 and no participant row is written.
   */
  async getJoinToken(
    sessionId: string,
    accountId: string,
    dto: JoinLiveDto = {},
  ): Promise<JoinTokenResult> {
    const session = await this.prisma.liveSession.findFirst({
      where: { id: sessionId, deletedAt: null },
    });
    if (!session) {
      throw new NotFoundException(
        'Live session not found / Session en direct introuvable',
      );
    }

    const isHost = session.hostAccountId === accountId;

    if (
      session.status === LiveSessionStatus.ENDED ||
      session.status === LiveSessionStatus.CANCELLED
    ) {
      throw new BadRequestException(
        'This live session is no longer joinable / Cette session n’est plus accessible',
      );
    }
    // Non-hosts may only join once the host has started the session.
    if (!isHost && session.status !== LiveSessionStatus.LIVE) {
      throw new BadRequestException(
        'This live session has not started yet / Cette session n’a pas encore commencé',
      );
    }

    const requesterPersonId = await this.resolveRequesterPersonId(accountId);
    const allowed = await this.canView(
      session,
      accountId,
      requesterPersonId,
      new Map(),
    );
    if (!allowed) {
      throw new ForbiddenException(
        'You cannot access this live session / Vous ne pouvez pas accéder à cette session',
      );
    }

    // Honour a prior host promotion across token re-mints: a participant the
    // host explicitly promoted to speaker keeps publish rights when their
    // short-lived token is refreshed (on ANY scope — a host-granted promotion
    // overrides the self-request scope policy), instead of silently dropping
    // back to viewer.
    const existing = await this.prisma.liveParticipant.findUnique({
      where: {
        liveSessionId_accountId: { liveSessionId: session.id, accountId },
      },
      select: { isSpeaker: true },
    });
    const role: LiveParticipantRole = isHost
      ? 'host'
      : existing?.isSpeaker === true
        ? 'speaker'
        : this.resolveRole(session, false, dto.requestSpeaker === true);
    const canPublish = role === 'host' || role === 'speaker';

    // Mint FIRST: if LiveKit is not configured this throws 503 and we record
    // nothing. Identity is the stable account id.
    const minted = await this.tokenService.mint(session.roomName, accountId, {
      canPublish,
      canSubscribe: true,
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.liveParticipant.upsert({
        where: {
          liveSessionId_accountId: {
            liveSessionId: session.id,
            accountId,
          },
        },
        create: {
          liveSessionId: session.id,
          accountId,
          role,
          isSpeaker: canPublish,
          joinedAt: new Date(),
        },
        update: { role, isSpeaker: canPublish, joinedAt: new Date(), leftAt: null },
      });
      await this.writeContribution(tx, accountId, session.id, 'JOIN', { role });
    });

    return { ...minted, liveSessionId: session.id, role };
  }

  /**
   * Fetch a single live session the requester is allowed to view (GET /live/:id).
   */
  async getSession(
    sessionId: string,
    accountId: string,
  ): Promise<LiveSession> {
    const session = await this.prisma.liveSession.findFirst({
      where: { id: sessionId, deletedAt: null },
    });
    if (!session) {
      throw new NotFoundException(
        'Live session not found / Session en direct introuvable',
      );
    }
    const requesterPersonId = await this.resolveRequesterPersonId(accountId);
    const allowed = await this.canView(
      session,
      accountId,
      requesterPersonId,
      new Map(),
    );
    if (!allowed) {
      throw new ForbiddenException(
        'You cannot access this live session / Vous ne pouvez pas accéder à cette session',
      );
    }
    return session;
  }

  /**
   * Graceful token endpoint (GET /live/:id/token): returns
   * `{ configured: false }` when LiveKit is not provisioned instead of a 503,
   * so the web room degrades to "coming soon". When configured, mints a token.
   */
  async getJoinTokenResponse(
    sessionId: string,
    accountId: string,
    dto: JoinLiveDto = {},
  ): Promise<LiveTokenResponse> {
    if (!this.tokenService.isConfigured()) {
      return {
        configured: false,
        token: null,
        serverUrl: null,
        roomName: null,
        identity: null,
      };
    }
    const r = await this.getJoinToken(sessionId, accountId, dto);
    return {
      configured: true,
      token: r.token,
      serverUrl: r.url,
      roomName: r.roomName,
      identity: r.identity,
    };
  }

  /**
   * Replay descriptor (GET /live/:id/replay): visibility-enforced; returns a
   * playback URL only once the recording is published. Audio-first by default.
   */
  async getReplay(
    sessionId: string,
    accountId: string,
  ): Promise<LiveReplayResponse> {
    const session = await this.getSession(sessionId, accountId);
    if (!session.replayPublished || !session.recordingMediaId) {
      return { mediaKind: 'AUDIO', url: null };
    }
    const media = await this.prisma.media.findFirst({
      where: { id: session.recordingMediaId, deletedAt: null },
      select: { fileType: true, cdnUrl: true },
    });
    if (!media) {
      return { mediaKind: 'AUDIO', url: null };
    }
    const mediaKind: 'AUDIO' | 'VIDEO' = media.fileType
      .toLowerCase()
      .includes('video')
      ? 'VIDEO'
      : 'AUDIO';
    return { mediaKind, url: media.cdnUrl ?? null };
  }

  // --- internals -----------------------------------------------------------

  /**
   * Resolve the verified-authority id to host a PUBLIC lesson/masterclass under.
   * When `pinnedAuthorityId` is given it must belong to the host AND be
   * verified; otherwise the host's own verified authority (if any) is used.
   * Throws Forbidden when the host has no qualifying verified authority.
   */
  private async resolveVerifiedAuthorityId(
    hostAccountId: string,
    pinnedAuthorityId: string | null,
  ): Promise<string> {
    if (pinnedAuthorityId) {
      const authority = await this.prisma.culturalAuthority.findFirst({
        where: {
          id: pinnedAuthorityId,
          accountId: hostAccountId,
          verified: true,
          deletedAt: null,
        },
        select: { id: true },
      });
      if (!authority) {
        throw new ForbiddenException(
          'A verified cultural authority is required to host this public session / Une autorité culturelle vérifiée est requise',
        );
      }
      return authority.id;
    }

    const verified = await this.prisma.culturalAuthority.findFirst({
      where: { accountId: hostAccountId, verified: true, deletedAt: null },
      select: { id: true },
    });
    if (!verified) {
      throw new ForbiddenException(
        'Only a verified cultural authority can host a public lesson or masterclass / Seule une autorité culturelle vérifiée peut animer',
      );
    }
    return verified.id;
  }

  private async loadOwnedSession(
    sessionId: string,
    hostAccountId: string,
  ): Promise<LiveSession> {
    const session = await this.prisma.liveSession.findFirst({
      where: { id: sessionId, deletedAt: null },
    });
    if (!session) {
      throw new NotFoundException(
        'Live session not found / Session en direct introuvable',
      );
    }
    if (session.hostAccountId !== hostAccountId) {
      throw new ForbiddenException(
        'Only the host can manage this live session / Seul l’hôte peut gérer cette session',
      );
    }
    return session;
  }

  /**
   * Visibility decision for a single session. PUBLIC is open to any
   * authenticated account; the host always sees their own session; otherwise
   * the FAMILY/PRIVATE rules apply against the requester's person node.
   */
  private async canView(
    session: LiveSession,
    requesterAccountId: string,
    requesterPersonId: string | null,
    degreeCache: Map<string, number | null>,
  ): Promise<boolean> {
    if (session.hostAccountId === requesterAccountId) {
      return true;
    }

    switch (session.visibilityScope) {
      case VisibilityScope.PUBLIC:
        return true;

      case VisibilityScope.PRIVATE_SELF:
        return (
          requesterPersonId !== null &&
          session.subjectPersonId !== null &&
          session.subjectPersonId === requesterPersonId
        );

      case VisibilityScope.FAMILY: {
        if (!session.subjectPersonId || !requesterPersonId) {
          // No anchor or no graph node -> cannot evaluate closeness -> fail closed.
          return false;
        }
        if (session.subjectPersonId === requesterPersonId) {
          return true;
        }
        const maxDegree = this.resolveMaxDegree(session.visibleMaxDegree);
        const cacheKey = `${session.subjectPersonId}:${maxDegree}`;
        let degree = degreeCache.get(cacheKey);
        if (degree === undefined) {
          degree = await this.graphDegree.computeDegree(
            requesterPersonId,
            session.subjectPersonId,
            maxDegree,
          );
          degreeCache.set(cacheKey, degree);
        }
        return degree !== null && degree <= maxDegree;
      }

      default:
        return false;
    }
  }

  private resolveRole(
    session: LiveSession,
    isHost: boolean,
    requestSpeaker: boolean,
  ): LiveParticipantRole {
    if (isHost) {
      return 'host';
    }
    // Speaker promotion is only honoured for private/family sessions (e.g. a
    // family council). PUBLIC lessons/masterclasses stay broadcast-only.
    if (
      requestSpeaker &&
      session.visibilityScope !== VisibilityScope.PUBLIC
    ) {
      return 'speaker';
    }
    return 'viewer';
  }

  private resolveMaxDegree(sessionMaxDegree: number | null): number {
    return (
      sessionMaxDegree ??
      this.config.get<number>(
        'authorization.familyMaxDegree',
        DEFAULT_MAX_DEGREE,
      )
    );
  }

  private async resolveRequesterPersonId(
    accountId: string,
  ): Promise<string | null> {
    const claim = await this.prisma.claim.findFirst({
      where: { accountId, status: 'VERIFIED' },
      select: { personId: true },
    });
    return claim?.personId ?? null;
  }

  /**
   * Side-effects fired when a session goes LIVE: auto-post to the Fil familial
   * (so the live surfaces in the feed — PUBLIC lives post PUBLIC for discovery),
   * fan out "X est en direct" to close family, and ping every invitee. Each step
   * is independently best-effort; one failing never blocks the others, and none
   * can fail the request (the LIVE transition already committed).
   */
  private async announceLive(session: LiveSession): Promise<void> {
    const hostLabel = await this.safe(
      () => this.notifyHelper.resolveHostLabel(session),
      'Un proche / A relative',
    );

    // 1. Auto-post to the family feed (discovery for PUBLIC).
    await this.runSafely('live auto feed-post', async () => {
      await this.familyFeed.createPost({
        authorAccountId: session.hostAccountId,
        subjectPersonId: session.subjectPersonId,
        postType: 'live_started',
        body:
          `${hostLabel} est en direct : « ${session.title} » / ` +
          `${hostLabel} is live: "${session.title}"`,
        visibilityScope: session.visibilityScope,
        visibleMaxDegree: session.visibleMaxDegree,
      });
    });

    // 2. Notify close family (FAMILY scope) that it started.
    await this.runSafely('live family notify', () =>
      this.notifyHelper.notifyLive(session),
    );

    // 3. Notify everyone the host explicitly invited.
    await this.runSafely('live invitee notify', () =>
      this.invitations.notifyInviteesLive(session),
    );
  }

  /** Generate an invite code not currently used by any session. */
  private async generateUniqueInviteCode(): Promise<string> {
    for (let attempt = 0; attempt < INVITE_CODE_MAX_TRIES; attempt += 1) {
      const candidate = this.randomInviteCode();
      const clash = await this.prisma.liveSession.findFirst({
        where: { inviteCode: candidate },
        select: { id: true },
      });
      if (!clash) {
        return candidate;
      }
    }
    // Astronomically unlikely; fall back to a longer code rather than throw.
    return `${this.randomInviteCode()}${this.randomInviteCode()}`;
  }

  private randomInviteCode(): string {
    const bytes = randomBytes(INVITE_CODE_LENGTH);
    let code = '';
    for (let i = 0; i < INVITE_CODE_LENGTH; i += 1) {
      code += INVITE_CODE_ALPHABET[bytes[i] % INVITE_CODE_ALPHABET.length];
    }
    return code;
  }

  /** Run a best-effort side-effect, logging (never throwing) on failure. */
  private async runSafely(
    label: string,
    fn: () => Promise<unknown>,
  ): Promise<void> {
    try {
      await fn();
    } catch (err) {
      this.logger.warn(`${label} failed: ${(err as Error).message}`);
    }
  }

  /** Resolve a value, falling back on any error. */
  private async safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
    try {
      return await fn();
    } catch {
      return fallback;
    }
  }

  private async writeContribution(
    tx: Prisma.TransactionClient,
    accountId: string,
    entityId: string,
    action: string,
    newValue: Prisma.InputJsonValue,
  ): Promise<void> {
    await tx.contribution.create({
      data: {
        accountId,
        entityType: 'live_session',
        entityId,
        action,
        newValue,
      },
    });
  }

  private async publishLifecycle(
    session: LiveSession,
    type: LiveSessionLifecycleEvent['type'],
  ): Promise<void> {
    const event: LiveSessionLifecycleEvent = {
      type,
      version: LIVE_SESSION_EVENT_VERSION,
      occurredAt: new Date().toISOString(),
      actorId: session.hostAccountId,
      correlationId: randomUUID(),
      payload: {
        liveSessionId: session.id,
        kind: session.kind,
        visibilityScope: session.visibilityScope,
        status: session.status,
        hostAccountId: session.hostAccountId,
        subjectPersonId: session.subjectPersonId,
      },
    };

    try {
      await this.eventPublisher.publish(event);
    } catch (err) {
      // The state change already committed; a publish failure must not surface
      // as a request error. The eventing layer owns retry/outbox semantics.
      this.logger.error(
        `Failed to publish ${type} for ${session.id}: ${
          (err as Error).message
        }`,
      );
    }
  }
}
