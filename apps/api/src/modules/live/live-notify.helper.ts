import { Injectable, Logger } from '@nestjs/common';
import { NotificationType, VisibilityScope } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DEFAULT_MAX_DEGREE } from '../authorization/graph-degree.service';
import { NotificationsService } from '../notifications/notifications.service';

/**
 * Hard cap on the family audience fanned out per live notification. A live in a
 * very dense part of the global graph could otherwise notify thousands; this
 * keeps a single SCHEDULED/LIVE transition bounded (DoS / spam guard). The cap
 * is applied to the collected account set, newest-discovered dropped first.
 */
const MAX_FAMILY_AUDIENCE = 500;

/** DoS guard on the audience BFS frontier, mirroring the degree service. */
const MAX_FRONTIER = 2_000;

/**
 * Minimal view of a LiveSession needed to fan out notifications. Decoupled from
 * the generated Prisma type for the same reason as in {@link LiveAccessHelper}:
 * the Phase-5 schema is owned by the data-modeler. The live service passes a
 * structurally-matching `prisma.liveSession` row.
 */
export interface LiveSessionNotifyView {
  id: string;
  hostAccountId: string;
  hostAuthorityId: string | null;
  title: string;
  visibilityScope: VisibilityScope;
  visibleMaxDegree: number | null;
  subjectPersonId: string | null;
}

/**
 * Fans out "a live is scheduled" / "a live is now on air" notifications to the
 * relevant audience, via {@link NotificationsService}.
 *
 * Privacy is the central constraint: a FAMILY/PRIVATE live MUST only reach
 * accounts already inside the subject's degree-bounded family, and the
 * notification payload carries NO graph data (no degree, path, phone, or
 * relative identities) — only the session's own title + a deep link.
 *
 * Fan-out is best-effort: a per-recipient delivery failure is logged and
 * skipped, never thrown, so a partial outage can't break the live lifecycle.
 */
@Injectable()
export class LiveNotifyHelper {
  private readonly logger = new Logger(LiveNotifyHelper.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Notify the audience that a live has been SCHEDULED (announce / save-the-date).
   * @returns the number of in-app notifications created.
   */
  async notifyScheduled(session: LiveSessionNotifyView): Promise<number> {
    const audience = await this.resolveAudience(session);
    if (audience.length === 0) {
      return 0;
    }

    const hostLabel = await this.resolveHostLabel(session);
    return this.fanOut(session, audience, {
      notificationType: NotificationType.OTHER,
      title: `${hostLabel} : direct prévu / ${hostLabel}: upcoming live`,
      body: `« ${session.title} » — un direct est programmé / ` +
        `"${session.title}" — a live is scheduled`,
    });
  }

  /**
   * Notify the audience that a live just went LIVE ("X est en direct / X is live now").
   * @returns the number of in-app notifications created.
   */
  async notifyLive(session: LiveSessionNotifyView): Promise<number> {
    const audience = await this.resolveAudience(session);
    if (audience.length === 0) {
      return 0;
    }

    const hostLabel = await this.resolveHostLabel(session);
    return this.fanOut(session, audience, {
      notificationType: NotificationType.OTHER,
      title: `${hostLabel} est en direct / ${hostLabel} is live now`,
      body: `« ${session.title} » — rejoignez maintenant / ` +
        `"${session.title}" — join now`,
    });
  }

  // --- internals -----------------------------------------------------------

  /**
   * Resolves the set of account ids to notify, excluding the host.
   *
   *  - PUBLIC: there is no follow/subscription model yet, so public lives have
   *    no targeted fan-out audience (they surface via the public discovery feed
   *    instead). Returns empty until a follow model exists. See INTEGRATION.
   *  - FAMILY: accounts whose VERIFIED-claim person sits within the session's
   *    `visibleMaxDegree` of the anchor person.
   *  - PRIVATE_SELF: no one but the host => empty.
   */
  private async resolveAudience(
    session: LiveSessionNotifyView,
  ): Promise<string[]> {
    if (session.visibilityScope === VisibilityScope.PUBLIC) {
      return [];
    }
    if (session.visibilityScope === VisibilityScope.PRIVATE_SELF) {
      return [];
    }
    // FAMILY
    if (!session.subjectPersonId) {
      return [];
    }
    const maxDegree = session.visibleMaxDegree ?? DEFAULT_MAX_DEGREE;
    const accountIds = await this.collectFamilyAccountIds(
      session.subjectPersonId,
      maxDegree,
    );
    return accountIds.filter((id) => id !== session.hostAccountId);
  }

  /**
   * Bounded BFS from `subjectPersonId` collecting accounts officially attached
   * (VERIFIED claim => `claimedByAccountId`) to any person within `maxDegree`
   * family-graph hops. Mirrors the edge model of GraphDegreeService
   * (parent/child + union partners, soft-deleted edges ignored).
   *
   * Only account ids leave this method — never the persons or the structure.
   */
  private async collectFamilyAccountIds(
    subjectPersonId: string,
    maxDegree: number,
  ): Promise<string[]> {
    const visitedPersons = new Set<string>([subjectPersonId]);
    let frontier: string[] = [subjectPersonId];

    for (let depth = 1; depth <= maxDegree; depth += 1) {
      const neighbours = await this.getNeighbours(frontier);
      const next: string[] = [];
      for (const personId of neighbours) {
        if (!visitedPersons.has(personId)) {
          visitedPersons.add(personId);
          next.push(personId);
        }
      }
      if (next.length === 0 || visitedPersons.size >= MAX_FRONTIER) {
        break;
      }
      frontier = next;
    }

    const owners = await this.prisma.person.findMany({
      where: {
        id: { in: Array.from(visitedPersons) },
        claimedByAccountId: { not: null },
        deletedAt: null,
      },
      select: { claimedByAccountId: true },
      take: MAX_FAMILY_AUDIENCE,
    });

    const accountIds = new Set<string>();
    for (const owner of owners) {
      if (owner.claimedByAccountId) {
        accountIds.add(owner.claimedByAccountId);
      }
    }
    return Array.from(accountIds);
  }

  /**
   * Persons adjacent to ANY person in `personIds` via a non-deleted
   * parent/child or union-partner edge. Batched (constant query count per
   * frontier), matching GraphDegreeService's traversal.
   */
  private async getNeighbours(personIds: string[]): Promise<Set<string>> {
    const [childrenEdges, parentEdges, partnerships] = await Promise.all([
      this.prisma.parentChild.findMany({
        where: { parentId: { in: personIds }, deletedAt: null },
        select: { childId: true },
      }),
      this.prisma.parentChild.findMany({
        where: { childId: { in: personIds }, deletedAt: null },
        select: { parentId: true },
      }),
      this.prisma.unionPartner.findMany({
        where: { personId: { in: personIds }, union: { deletedAt: null } },
        select: { unionId: true },
      }),
    ]);

    const neighbours = new Set<string>();
    for (const edge of childrenEdges) {
      neighbours.add(edge.childId);
    }
    for (const edge of parentEdges) {
      neighbours.add(edge.parentId);
    }

    const unionIds = [...new Set(partnerships.map((p) => p.unionId))];
    if (unionIds.length > 0) {
      const coPartners = await this.prisma.unionPartner.findMany({
        where: { unionId: { in: unionIds } },
        select: { personId: true },
      });
      for (const partner of coPartners) {
        neighbours.add(partner.personId);
      }
    }

    return neighbours;
  }

  /**
   * A safe, non-leaking display label for the host: the verified authority's
   * public display name when authority-hosted, else the host's own claimed
   * person display name (visible within the family anyway), else a generic
   * bilingual fallback. NEVER the phone number.
   */
  private async resolveHostLabel(
    session: LiveSessionNotifyView,
  ): Promise<string> {
    if (session.hostAuthorityId) {
      const authority = await this.prisma.culturalAuthority.findFirst({
        where: { id: session.hostAuthorityId, deletedAt: null },
        select: { displayName: true },
      });
      if (authority?.displayName) {
        return authority.displayName;
      }
    }

    const hostPerson = await this.prisma.person.findFirst({
      where: { claimedByAccountId: session.hostAccountId, deletedAt: null },
      select: { displayName: true },
    });
    if (hostPerson?.displayName) {
      return hostPerson.displayName;
    }

    return 'Un proche / A relative';
  }

  /** Best-effort per-recipient fan-out; failures are logged, never thrown. */
  private async fanOut(
    session: LiveSessionNotifyView,
    accountIds: string[],
    content: { notificationType: NotificationType; title: string; body: string },
  ): Promise<number> {
    let created = 0;
    for (const accountId of accountIds) {
      try {
        await this.notifications.createNotification({
          accountId,
          notificationType: content.notificationType,
          title: content.title,
          body: content.body,
          relatedEntityType: 'live_session',
          relatedEntityId: session.id,
          actionUrl: `/live/${session.id}`,
        });
        created += 1;
      } catch (err) {
        this.logger.warn(
          `Failed to notify account=${accountId} about live=${session.id}: ` +
            `${(err as Error).message}`,
        );
      }
    }
    return created;
  }
}
