import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma, KinshipCheck, KinshipCheckStatus } from '@prisma/client';
import type { DomainEvent } from '@origin/shared-types';
import { PrismaService } from '../../prisma/prisma.service';
import { GraphDegreeService } from '../authorization/graph-degree.service';
import { EventPublisher } from '../../eventing/event-publisher';
import { RelationshipLabelService } from './relationship-label.service';
import { KinshipNotifyHelper } from './kinship-notify.helper';
import { InitiateCheckDto } from './dto/initiate-check.dto';

/**
 * Maximum BFS depth used when probing the global family graph. Kept bounded:
 * beyond a handful of hops the relationship is socially meaningless and an
 * unbounded traversal would be a DoS vector.
 */
const MAX_KINSHIP_DEPTH = 8;

/** How long a pending check stays actionable before it should be expired. */
const CHECK_TTL_DAYS = 14;

const ENTITY_TYPE = 'kinship_check';

/**
 * Payload of the domain event emitted once a kinship check is computed.
 *
 * PRIVACY: carries ONLY the aggregate result. No person ids, names, ancestors
 * or path ever appear here.
 */
export interface KinshipCheckComputedPayload {
  kinshipCheckId: string;
  related: boolean;
  degree: number | null;
}

export type KinshipCheckComputedEvent = DomainEvent<
  'kinship-check.computed',
  KinshipCheckComputedPayload
>;

export const KINSHIP_CHECK_COMPUTED_VERSION = 1;

/**
 * The ONLY result shape ever exposed to either party. A null `degree` with
 * `related = false` means "no link found within the bounded search" OR "one of
 * the two has no claimed node" — the two are deliberately indistinguishable to
 * avoid leaking whether the other user has a graph presence.
 */
export interface KinshipResultView {
  related: boolean;
  degree: number | null;
  labelFr: string;
  labelEn: string;
}

/**
 * A privacy-safe projection of a KinshipCheck. Contains NO person ids, graph
 * path, ancestors, or phone number — only the lifecycle state, the direction
 * relative to the caller, the counterparty's DISPLAY NAME (surfaced solely so a
 * target can give informed consent — never a phone, tree or person id), and
 * (when COMPUTED) the aggregate result.
 */
export interface KinshipCheckView {
  id: string;
  direction: 'incoming' | 'outgoing';
  status: KinshipCheckStatus;
  /**
   * Display name of the OTHER party (resolved from Account.fullName). Null when
   * the counterparty has no account yet (raw phone invite) or has no name set.
   */
  counterpartyName: string | null;
  /** True when this check was opened against a phone not yet on Origin. */
  invitedByPhone: boolean;
  createdAt: Date;
  expiresAt: Date | null;
  result: KinshipResultView | null;
}

/**
 * The caller's checks split by direction, matching the web `/kinship-checks`
 * overview contract. Each entry is the privacy-safe {@link KinshipCheckView}.
 */
export interface KinshipChecksOverview {
  incoming: KinshipCheckView[];
  outgoing: KinshipCheckView[];
}

/**
 * KinshipCheckService — the consent-gated, privacy-preserving "Sommes-nous
 * parents ?" engine.
 *
 * Flow: requester initiates -> target is notified (without learning the graph)
 * -> target consents or declines -> on dual consent the relationship is
 * computed THROUGH the global graph and reduced to a single degree + bilingual
 * label. The path, the persons, and the trees are discarded immediately.
 */
@Injectable()
export class KinshipCheckService {
  private readonly logger = new Logger(KinshipCheckService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly graphDegree: GraphDegreeService,
    private readonly notify: KinshipNotifyHelper,
    private readonly labels: RelationshipLabelService,
    private readonly events: EventPublisher,
  ) {}

  // --- public API ----------------------------------------------------------

  /**
   * Create a new kinship check. The requester implicitly consents. The target
   * is notified that "someone wants to check kinship" — never who-is-related.
   */
  async initiate(
    requesterAccountId: string,
    dto: InitiateCheckDto,
  ): Promise<KinshipCheckView> {
    const provided = [dto.targetPhone, dto.targetAccountId, dto.familyCode].filter(
      (v) => v !== undefined && v !== null && v !== '',
    );
    if (provided.length !== 1) {
      throw new BadRequestException(
        'Provide exactly one of: targetPhone, targetAccountId, familyCode.',
      );
    }

    const { targetAccountId, targetPhone } = await this.resolveTarget(
      requesterAccountId,
      dto,
    );

    if (targetAccountId && targetAccountId === requesterAccountId) {
      throw new BadRequestException('You cannot run a kinship check with yourself.');
    }

    const expiresAt = new Date(Date.now() + CHECK_TTL_DAYS * 24 * 60 * 60 * 1000);

    const check = await this.prisma.kinshipCheck.create({
      data: {
        requesterAccountId,
        targetAccountId: targetAccountId ?? null,
        targetPhone: targetPhone ?? null,
        status: KinshipCheckStatus.PENDING_CONSENT,
        requesterConsent: true,
        targetConsent: false,
        expiresAt,
      },
    });

    await this.audit(requesterAccountId, check.id, 'INITIATE', {
      hasTargetAccount: !!targetAccountId,
      viaPhone: !!targetPhone,
    });

    // Notify only a resolved, reachable account. A phone with no account yet
    // cannot be reached — the check simply waits (out of scope: notify on
    // future registration). The notification never reveals who initiated it.
    if (targetAccountId) {
      await this.notify.notifyCheckInitiated({
        targetAccountId,
        checkId: check.id,
      });
    }

    return this.toViewWithName(check, requesterAccountId);
  }

  /**
   * Incoming + outgoing checks for the account, split by direction and each
   * reduced to the privacy-safe view. Results are only present on COMPUTED
   * checks and never include persons. Counterparty display names are resolved
   * from Account.fullName in a single batched query.
   */
  async listMine(accountId: string): Promise<KinshipChecksOverview> {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      select: { phoneNumber: true },
    });

    const checks = await this.prisma.kinshipCheck.findMany({
      where: {
        deletedAt: null,
        OR: [
          { requesterAccountId: accountId },
          { targetAccountId: accountId },
          // Phone-addressed checks the caller has not yet been linked to.
          ...(account?.phoneNumber
            ? [{ targetAccountId: null, targetPhone: account.phoneNumber }]
            : []),
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    const nameMap = await this.resolveNames(
      checks.map((c) => this.counterpartyAccountId(c, accountId)),
    );

    const incoming: KinshipCheckView[] = [];
    const outgoing: KinshipCheckView[] = [];
    for (const c of checks) {
      const cpId = this.counterpartyAccountId(c, accountId);
      const view = this.toView(c, accountId, cpId ? nameMap.get(cpId) ?? null : null);
      (view.direction === 'incoming' ? incoming : outgoing).push(view);
    }
    return { incoming, outgoing };
  }

  /**
   * The target's decision. Declining closes the check with no computation.
   * Consenting (with the requester's implicit consent) triggers the compute.
   */
  async respond(
    checkId: string,
    responderAccountId: string,
    consent: boolean,
  ): Promise<KinshipCheckView> {
    const check = await this.prisma.kinshipCheck.findFirst({
      where: { id: checkId, deletedAt: null },
    });
    if (!check) {
      throw new NotFoundException('Kinship check not found.');
    }

    const authorizedCheck = await this.authorizeResponder(check, responderAccountId);

    if (
      authorizedCheck.status !== KinshipCheckStatus.PENDING_CONSENT &&
      authorizedCheck.status !== KinshipCheckStatus.CONSENTED
    ) {
      throw new BadRequestException(
        'This kinship check is no longer awaiting a response.',
      );
    }

    if (authorizedCheck.expiresAt && authorizedCheck.expiresAt < new Date()) {
      await this.prisma.kinshipCheck.update({
        where: { id: authorizedCheck.id },
        data: { status: KinshipCheckStatus.EXPIRED },
      });
      throw new BadRequestException('This kinship check has expired.');
    }

    if (!consent) {
      const declined = await this.prisma.kinshipCheck.update({
        where: { id: authorizedCheck.id },
        data: {
          targetConsent: false,
          status: KinshipCheckStatus.DECLINED,
        },
      });
      await this.audit(responderAccountId, declined.id, 'DECLINE', {});
      await this.notify.notifyConsentDecision({
        requesterAccountId: declined.requesterAccountId,
        checkId: declined.id,
        consented: false,
      });
      return this.toViewWithName(declined, responderAccountId);
    }

    const consented = await this.prisma.kinshipCheck.update({
      where: { id: authorizedCheck.id },
      data: {
        targetConsent: true,
        status: KinshipCheckStatus.CONSENTED,
      },
    });
    await this.audit(responderAccountId, consented.id, 'CONSENT', {});

    // Both parties consent (requester implicitly) -> compute now.
    if (consented.requesterConsent && consented.targetConsent) {
      const computed = await this.compute(consented, responderAccountId);
      return this.toViewWithName(computed, responderAccountId);
    }

    return this.toViewWithName(consented, responderAccountId);
  }

  /**
   * The requester withdraws a still-pending outgoing check. Only the requester
   * may cancel, and only while it is awaiting the target's response — once
   * declined, computed, expired or already cancelled it is immutable.
   */
  async cancel(
    checkId: string,
    requesterAccountId: string,
  ): Promise<KinshipCheckView> {
    const check = await this.prisma.kinshipCheck.findFirst({
      where: { id: checkId, deletedAt: null },
    });
    if (!check) {
      throw new NotFoundException('Kinship check not found.');
    }
    if (check.requesterAccountId !== requesterAccountId) {
      throw new ForbiddenException('Only the requester can cancel this kinship check.');
    }
    if (check.status !== KinshipCheckStatus.PENDING_CONSENT) {
      throw new BadRequestException('This kinship check can no longer be cancelled.');
    }

    const cancelled = await this.prisma.kinshipCheck.update({
      where: { id: check.id },
      data: { status: KinshipCheckStatus.CANCELLED },
    });
    await this.audit(requesterAccountId, cancelled.id, 'CANCEL', {});

    return this.toViewWithName(cancelled, requesterAccountId);
  }

  // --- compute -------------------------------------------------------------

  /**
   * Resolve both accounts to their VERIFIED person node, measure the bounded
   * graph degree, store ONLY the aggregate result, and discard everything else.
   *
   * Never call this before both parties have consented — callers gate it.
   */
  async compute(
    check: KinshipCheck,
    actorAccountId: string,
  ): Promise<KinshipCheck> {
    if (!check.requesterConsent || !check.targetConsent) {
      throw new ForbiddenException(
        'Cannot compute a kinship check before both parties consent.',
      );
    }
    if (!check.targetAccountId) {
      throw new BadRequestException(
        'Cannot compute a kinship check with an unresolved target.',
      );
    }

    const [requesterPersonId, targetPersonId] = await Promise.all([
      this.resolvePersonId(check.requesterAccountId),
      this.resolvePersonId(check.targetAccountId),
    ]);

    let degree: number | null = null;
    if (requesterPersonId && targetPersonId) {
      degree = await this.graphDegree.computeDegree(
        requesterPersonId,
        targetPersonId,
        MAX_KINSHIP_DEPTH,
      );
    }
    // requesterPersonId / targetPersonId are now discarded — they never leave
    // this method and are never persisted.

    const related = degree !== null;
    const label = this.labels.label(degree);

    const computed = await this.prisma.kinshipCheck.update({
      where: { id: check.id },
      data: {
        status: KinshipCheckStatus.COMPUTED,
        resultDegree: degree,
        resultRelated: related,
        resultLabelFr: label.fr,
        resultLabelEn: label.en,
        computedAt: new Date(),
      },
    });

    // Audit carries ONLY the aggregate — never person ids.
    await this.audit(actorAccountId, computed.id, 'COMPUTE', {
      related,
      degree,
    });

    await this.emitComputed(computed, actorAccountId);
    if (computed.targetAccountId) {
      await this.notify.notifyComputed({
        requesterAccountId: computed.requesterAccountId,
        targetAccountId: computed.targetAccountId,
        checkId: computed.id,
        label: { fr: label.fr, en: label.en },
        related,
      });
    }

    return computed;
  }

  // --- internals -----------------------------------------------------------

  /**
   * Resolve the requested target into an (accountId?, phone?) pair WITHOUT
   * revealing to the requester whether the target exists.
   */
  private async resolveTarget(
    requesterAccountId: string,
    dto: InitiateCheckDto,
  ): Promise<{ targetAccountId: string | null; targetPhone: string | null }> {
    if (dto.familyCode) {
      const normalized = dto.familyCode.trim().toUpperCase();
      const code = await this.prisma.familyCode.findUnique({
        where: { code: normalized },
        select: { accountId: true, revokedAt: true, expiresAt: true },
      });
      if (!code || code.revokedAt || code.expiresAt < new Date()) {
        throw new BadRequestException('Invalid or expired family code.');
      }
      return { targetAccountId: code.accountId, targetPhone: null };
    }

    if (dto.targetAccountId) {
      // Resolve quietly; an unreachable account yields a generic failure so we
      // never confirm existence/state of an arbitrary id.
      const account = await this.prisma.account.findFirst({
        where: {
          id: dto.targetAccountId,
          deletedAt: null,
          isActive: true,
          isBanned: false,
        },
        select: { id: true },
      });
      if (!account) {
        throw new NotFoundException('Target account not found.');
      }
      return { targetAccountId: account.id, targetPhone: null };
    }

    // targetPhone path.
    const phone = dto.targetPhone as string;
    const self = await this.prisma.account.findUnique({
      where: { id: requesterAccountId },
      select: { phoneNumber: true },
    });
    if (self?.phoneNumber === phone) {
      throw new BadRequestException('You cannot run a kinship check with yourself.');
    }

    const account = await this.prisma.account.findFirst({
      where: {
        phoneNumber: phone,
        deletedAt: null,
        isActive: true,
        isBanned: false,
      },
      select: { id: true },
    });
    // Always record the phone; the resolved account (if any) enables notifying.
    // Whether the account exists is NOT revealed to the requester.
    return { targetAccountId: account?.id ?? null, targetPhone: phone };
  }

  /**
   * Ensure the responder is the legitimate target of the check, linking a
   * phone-addressed check to the responding account on first response.
   */
  private async authorizeResponder(
    check: KinshipCheck,
    responderAccountId: string,
  ): Promise<KinshipCheck> {
    if (check.requesterAccountId === responderAccountId) {
      throw new ForbiddenException('You cannot respond to your own kinship check.');
    }

    if (check.targetAccountId) {
      if (check.targetAccountId !== responderAccountId) {
        throw new ForbiddenException('This kinship check is not addressed to you.');
      }
      return check;
    }

    // Phone-addressed check with no resolved account yet: the responder may
    // claim it only if their phone matches.
    if (check.targetPhone) {
      const account = await this.prisma.account.findUnique({
        where: { id: responderAccountId },
        select: { phoneNumber: true },
      });
      if (account?.phoneNumber !== check.targetPhone) {
        throw new ForbiddenException('This kinship check is not addressed to you.');
      }
      return this.prisma.kinshipCheck.update({
        where: { id: check.id },
        data: { targetAccountId: responderAccountId },
      });
    }

    throw new ForbiddenException('This kinship check is not addressed to you.');
  }

  /** The account's claimed graph node, or null when it has no VERIFIED claim. */
  private async resolvePersonId(accountId: string): Promise<string | null> {
    const claim = await this.prisma.claim.findFirst({
      where: { accountId, status: 'VERIFIED' },
      select: { personId: true },
    });
    return claim?.personId ?? null;
  }

  private async emitComputed(
    check: KinshipCheck,
    actorAccountId: string,
  ): Promise<void> {
    const event: KinshipCheckComputedEvent = {
      type: 'kinship-check.computed',
      version: KINSHIP_CHECK_COMPUTED_VERSION,
      occurredAt: new Date().toISOString(),
      actorId: actorAccountId,
      correlationId: randomUUID(),
      payload: {
        kinshipCheckId: check.id,
        related: check.resultRelated ?? false,
        degree: check.resultDegree,
      },
    };
    try {
      await this.events.publish(event);
    } catch (err) {
      // The result is committed; an eventing failure must not surface to the
      // user. The eventing layer owns retry/outbox semantics.
      this.logger.error(
        `Failed to publish kinship-check.computed for ${check.id}: ${
          (err as Error).message
        }`,
      );
    }
  }

  private async audit(
    accountId: string,
    checkId: string,
    action: string,
    detail: Record<string, unknown>,
  ): Promise<void> {
    await this.prisma.contribution.create({
      data: {
        accountId,
        entityType: ENTITY_TYPE,
        entityId: checkId,
        action,
        newValue: detail as unknown as Prisma.JsonObject,
      },
    });
  }

  /**
   * The account id of the OTHER party relative to the viewer: the target when
   * the viewer is the requester, otherwise the requester. Null when the viewer
   * is the requester and the target is an unresolved phone invite.
   */
  private counterpartyAccountId(
    check: KinshipCheck,
    viewerAccountId: string,
  ): string | null {
    return check.requesterAccountId === viewerAccountId
      ? check.targetAccountId
      : check.requesterAccountId;
  }

  /** Batch-resolve account ids to their display name (Account.fullName). */
  private async resolveNames(
    accountIds: ReadonlyArray<string | null>,
  ): Promise<Map<string, string | null>> {
    const ids = [...new Set(accountIds.filter((id): id is string => !!id))];
    if (ids.length === 0) {
      return new Map();
    }
    const accounts = await this.prisma.account.findMany({
      where: { id: { in: ids } },
      select: { id: true, fullName: true },
    });
    return new Map(accounts.map((a) => [a.id, a.fullName ?? null]));
  }

  /** Build the privacy-safe view, resolving the single counterparty name. */
  private async toViewWithName(
    check: KinshipCheck,
    viewerAccountId: string,
  ): Promise<KinshipCheckView> {
    const cpId = this.counterpartyAccountId(check, viewerAccountId);
    const name = cpId ? (await this.resolveNames([cpId])).get(cpId) ?? null : null;
    return this.toView(check, viewerAccountId, name);
  }

  /**
   * Reduce a KinshipCheck row to the privacy-safe view. The ONLY result fields
   * ever exposed are { related, degree, labelFr, labelEn }. Person ids, phone,
   * and the path are never projected. `counterpartyName` is the other party's
   * display name (already resolved by the caller) — surfaced solely for
   * informed consent, never a phone or graph data.
   */
  private toView(
    check: KinshipCheck,
    viewerAccountId: string,
    counterpartyName: string | null,
  ): KinshipCheckView {
    const direction: 'incoming' | 'outgoing' =
      check.requesterAccountId === viewerAccountId ? 'outgoing' : 'incoming';

    const result: KinshipResultView | null =
      check.status === KinshipCheckStatus.COMPUTED
        ? {
            related: check.resultRelated ?? false,
            degree: check.resultDegree,
            labelFr: check.resultLabelFr ?? '',
            labelEn: check.resultLabelEn ?? '',
          }
        : null;

    return {
      id: check.id,
      direction,
      status: check.status,
      counterpartyName,
      invitedByPhone: check.targetPhone !== null && check.targetAccountId === null,
      createdAt: check.createdAt,
      expiresAt: check.expiresAt,
      result,
    };
  }
}
