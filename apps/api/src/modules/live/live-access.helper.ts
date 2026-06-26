import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { VisibilityScope } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  DEFAULT_MAX_DEGREE,
  GraphDegreeService,
} from '../authorization/graph-degree.service';

/**
 * Minimal view of a LiveSession needed for host/join authorization.
 *
 * Intentionally decoupled from the generated `LiveSession` Prisma type: the
 * Phase-5 schema is owned by the data-modeler and may not yet be generated in
 * every working tree. The live service passes a row that structurally matches
 * this shape (`prisma.liveSession`), keeping these helpers buildable today and
 * trivially testable.
 */
export interface LiveSessionAccessView {
  id: string;
  hostAccountId: string;
  /** Owning verified CulturalAuthority, when the live is authority-hosted. */
  hostAuthorityId: string | null;
  visibilityScope: VisibilityScope;
  /** FAMILY degree bound; falls back to {@link DEFAULT_MAX_DEGREE} when null. */
  visibleMaxDegree: number | null;
  /** Anchor person for FAMILY/ceremony visibility; null = no graph anchor. */
  subjectPersonId: string | null;
}

/**
 * Pure-ish authorization helpers the LiveModule's service composes to gate who
 * may HOST a public live and who may JOIN a given live.
 *
 * Rules (mirrors the visibility model already used by the feeds):
 *  - PUBLIC lives: open to ANY authenticated account; only an account that owns
 *    a VERIFIED CulturalAuthority may *host* (start) one.
 *  - PRIVATE_SELF lives: only the host.
 *  - FAMILY lives: the host, plus any requester whose VERIFIED-claim person is
 *    within `visibleMaxDegree` family-graph hops of `subjectPersonId`
 *    (reusing {@link GraphDegreeService}). No anchor person => host only.
 *
 * These helpers never leak graph structure: they return/throw a boolean-grade
 * decision, never a degree, path, or relative identity.
 */
@Injectable()
export class LiveAccessHelper {
  private readonly logger = new Logger(LiveAccessHelper.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly graphDegree: GraphDegreeService,
  ) {}

  /**
   * @returns the owning verified authority id when `accountId` owns a VERIFIED,
   *          non-deleted CulturalAuthority; otherwise `null`.
   */
  async resolveHostAuthorityId(accountId: string): Promise<string | null> {
    const authority = await this.prisma.culturalAuthority.findFirst({
      where: { accountId, verified: true, deletedAt: null },
      select: { id: true },
    });
    return authority?.id ?? null;
  }

  /** Boolean form of {@link assertCanHostPublic}. */
  async canHostPublic(accountId: string): Promise<boolean> {
    return (await this.resolveHostAuthorityId(accountId)) !== null;
  }

  /**
   * Asserts that `accountId` may host a PUBLIC live (lesson, masterclass,
   * storytelling). Only accounts backed by a VERIFIED CulturalAuthority qualify.
   *
   * @returns the owning verified authority id (handy to stamp on the session).
   * @throws ForbiddenException when the account owns no verified authority.
   */
  async assertCanHostPublic(accountId: string): Promise<{ authorityId: string }> {
    const authorityId = await this.resolveHostAuthorityId(accountId);
    if (!authorityId) {
      throw new ForbiddenException(
        'Only a verified cultural authority can host a public live / ' +
          'Seule une autorité culturelle vérifiée peut animer un direct public',
      );
    }
    return { authorityId };
  }

  /** Boolean form of {@link assertCanJoin}. */
  async canJoin(
    session: LiveSessionAccessView,
    requesterAccountId: string,
  ): Promise<boolean> {
    // The host can always join their own room.
    if (session.hostAccountId === requesterAccountId) {
      return true;
    }

    switch (session.visibilityScope) {
      case VisibilityScope.PUBLIC:
        // Any authenticated user may watch a public live.
        return true;

      case VisibilityScope.PRIVATE_SELF:
        // Owner-only; the host check above already covered the only viewer.
        return false;

      case VisibilityScope.FAMILY:
        return this.isWithinFamily(session, requesterAccountId);

      default:
        return false;
    }
  }

  /**
   * Asserts that `requesterAccountId` may JOIN `session` under its visibility
   * scope. Replays MUST be gated through this same helper so a recording never
   * becomes more visible than the live it captured.
   *
   * @throws ForbiddenException when access is denied.
   */
  async assertCanJoin(
    session: LiveSessionAccessView,
    requesterAccountId: string,
  ): Promise<void> {
    const allowed = await this.canJoin(session, requesterAccountId);
    if (!allowed) {
      throw new ForbiddenException(
        'You are not allowed to join this live / ' +
          "Vous n'êtes pas autorisé à rejoindre ce direct",
      );
    }
  }

  /**
   * FAMILY-scope gate: resolve the requester's VERIFIED-claim person node and
   * check its shortest degree to the session's anchor person is within bound.
   */
  private async isWithinFamily(
    session: LiveSessionAccessView,
    requesterAccountId: string,
  ): Promise<boolean> {
    if (!session.subjectPersonId) {
      // No anchor => the family cannot be defined; only the host (handled
      // earlier) may join.
      return false;
    }

    const requesterPersonId =
      await this.resolveClaimedPersonId(requesterAccountId);
    if (!requesterPersonId) {
      // No graph position => cannot satisfy a degree-bounded family check.
      return false;
    }

    const maxDegree = session.visibleMaxDegree ?? DEFAULT_MAX_DEGREE;
    const degree = await this.graphDegree.computeDegree(
      requesterPersonId,
      session.subjectPersonId,
      maxDegree,
    );

    return degree !== null && degree <= maxDegree;
  }

  /**
   * Resolves the person an account is officially attached to via its VERIFIED
   * claim (the account's single position in the global graph), or null.
   */
  private async resolveClaimedPersonId(
    accountId: string,
  ): Promise<string | null> {
    const claim = await this.prisma.claim.findFirst({
      where: { accountId, status: 'VERIFIED' },
      select: { personId: true },
    });
    return claim?.personId ?? null;
  }
}
