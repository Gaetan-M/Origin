import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  LiveInvitationStatus,
  NotificationType,
  Prisma,
  type LiveSession,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MessagingService } from '../messaging/messaging.service';
import { LiveNotifyHelper } from './live-notify.helper';
import { LivePeopleHelper } from './live-people.helper';
import { InviteLiveDto } from './dto/invite-live.dto';

/** Sanitised invitation row for the host panel — never leaks raw phones. */
export interface InvitationView {
  id: string;
  /** Resolved, non-leaking label of the invitee. */
  displayName: string;
  /** Present only for on-platform invitees. */
  invitedAccountId: string | null;
  /** Masked phone for off-platform invitees (e.g. "+237••••67"); else null. */
  maskedPhone: string | null;
  status: LiveInvitationStatus;
  respondedAt: Date | null;
  createdAt: Date;
}

/** Outcome of an invite call, shaped for an encouraging host-side toast. */
export interface InviteResult {
  invited: number;
  /** Already-invited (deduped) targets that were skipped. */
  skipped: number;
  invitations: InvitationView[];
}

/**
 * Live invitations: a host hand-picks relatives (accounts from the family graph
 * and/or off-platform phones) to invite to a live. On-platform invitees get an
 * in-app Notification ("X t'invite à un direct"); off-platform phones get a
 * WhatsApp/SMS push carrying the shareable join-by-code link. Invitees later
 * accept/decline, and the host sees the live RSVP roster.
 *
 * Host-only for invite/list; invitee-only for respond. Every mutation writes a
 * Contribution audit row. Privacy: the in-app payload carries only the live's
 * own title + deep link — never any family-graph data.
 */
@Injectable()
export class LiveInvitationService {
  private readonly logger = new Logger(LiveInvitationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly messaging: MessagingService,
    private readonly notifyHelper: LiveNotifyHelper,
    private readonly people: LivePeopleHelper,
  ) {}

  /**
   * Create/refresh invitations for a session (host only) and fan out
   * notifications. Re-inviting an already-invited target is idempotent (counted
   * as skipped, not duplicated). A phone that resolves to an existing account is
   * collapsed onto that account so the relative gets an in-app notification too.
   */
  async invite(
    sessionId: string,
    hostAccountId: string,
    dto: InviteLiveDto,
  ): Promise<InviteResult> {
    const session = await this.loadOwnedSession(sessionId, hostAccountId);

    const accountIds = dto.accountIds ?? [];
    const phones = dto.phones ?? [];
    if (accountIds.length === 0 && phones.length === 0) {
      throw new BadRequestException(
        'Pick at least one relative or phone to invite / Choisissez au moins un proche ou un numéro à inviter',
      );
    }

    const hostLabel = await this.notifyHelper.resolveHostLabel(session);

    // Normalise targets: collapse known phones onto accounts; dedupe the host
    // out and account-targets against each other.
    const targetAccountIds = new Set<string>(accountIds);
    const phoneTargets: string[] = [];
    for (const phone of phones) {
      const existing = await this.people.resolveAccountIdByPhone(phone);
      if (existing) {
        targetAccountIds.add(existing);
      } else {
        phoneTargets.push(phone);
      }
    }
    targetAccountIds.delete(hostAccountId);

    let invited = 0;
    let skipped = 0;

    // --- account invitees ---------------------------------------------------
    for (const accountId of targetAccountIds) {
      const created = await this.upsertAccountInvite(session.id, hostAccountId, accountId);
      if (!created) {
        skipped += 1;
        continue;
      }
      invited += 1;
      await this.notifyInvitedAccount(session, accountId, hostLabel);
    }

    // --- off-platform phone invitees ---------------------------------------
    for (const phone of [...new Set(phoneTargets)]) {
      const created = await this.upsertPhoneInvite(session.id, hostAccountId, phone);
      if (!created) {
        skipped += 1;
        continue;
      }
      invited += 1;
      await this.notifyInvitedPhone(session, phone, hostLabel);
    }

    if (invited > 0) {
      await this.writeContribution(hostAccountId, session.id, 'INVITE', {
        invitedAccounts: targetAccountIds.size,
        invitedPhones: phoneTargets.length,
      });
    }

    return {
      invited,
      skipped,
      invitations: await this.listInvitations(sessionId, hostAccountId),
    };
  }

  /** Host-only RSVP roster for a session, newest first. */
  async listInvitations(
    sessionId: string,
    hostAccountId: string,
  ): Promise<InvitationView[]> {
    await this.loadOwnedSession(sessionId, hostAccountId);

    const rows = await this.prisma.liveInvitation.findMany({
      where: { liveSessionId: sessionId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    const accountIds = rows
      .map((r) => r.invitedAccountId)
      .filter((id): id is string => id !== null);
    const labels = await this.people.resolveAccountLabels(accountIds);

    return rows.map((r) => ({
      id: r.id,
      displayName: r.invitedAccountId
        ? labels.get(r.invitedAccountId) ?? 'Un proche / A relative'
        : 'Invité par numéro / Invited by phone',
      invitedAccountId: r.invitedAccountId,
      maskedPhone: r.invitedPhone ? this.people.maskPhone(r.invitedPhone) : null,
      status: r.status,
      respondedAt: r.respondedAt,
      createdAt: r.createdAt,
    }));
  }

  /**
   * An invitee accepts/declines their invitation. Stamps `responded_at`, and on
   * acceptance notifies the host ("X a accepté ton invitation"). Idempotent: a
   * repeat response just updates the row.
   */
  async respond(
    sessionId: string,
    accountId: string,
    accept: boolean,
  ): Promise<InvitationView> {
    const session = await this.prisma.liveSession.findFirst({
      where: { id: sessionId, deletedAt: null },
    });
    if (!session) {
      throw new NotFoundException(
        'Live session not found / Session en direct introuvable',
      );
    }

    const invitation = await this.prisma.liveInvitation.findFirst({
      where: {
        liveSessionId: sessionId,
        invitedAccountId: accountId,
        deletedAt: null,
      },
    });
    if (!invitation) {
      throw new NotFoundException(
        'No invitation found for you on this live / Aucune invitation à votre nom pour ce direct',
      );
    }

    const status = accept
      ? LiveInvitationStatus.ACCEPTED
      : LiveInvitationStatus.DECLINED;

    const updated = await this.prisma.liveInvitation.update({
      where: { id: invitation.id },
      data: { status, respondedAt: new Date() },
    });

    await this.writeContribution(accountId, sessionId, 'RESPOND_INVITE', {
      status,
    });

    if (accept) {
      const label = (await this.people.resolveAccountLabels([accountId])).get(
        accountId,
      );
      await this.safeNotify(session.hostAccountId, {
        notificationType: NotificationType.OTHER,
        title: `${label ?? 'Un proche'} a accepté / ${label ?? 'A relative'} accepted`,
        body:
          `« ${session.title} » — votre invité sera là / ` +
          `"${session.title}" — your guest will attend`,
        relatedEntityId: sessionId,
      });
    }

    return {
      id: updated.id,
      displayName: 'Vous / You',
      invitedAccountId: updated.invitedAccountId,
      maskedPhone: updated.invitedPhone
        ? this.people.maskPhone(updated.invitedPhone)
        : null,
      status: updated.status,
      respondedAt: updated.respondedAt,
      createdAt: updated.createdAt,
    };
  }

  /**
   * Notify every PENDING/ACCEPTED invitee that the live just started. Called by
   * the live lifecycle when a session transitions to LIVE. Best-effort.
   * @returns the number of in-app notifications created.
   */
  async notifyInviteesLive(session: LiveSession): Promise<number> {
    const rows = await this.prisma.liveInvitation.findMany({
      where: {
        liveSessionId: session.id,
        deletedAt: null,
        invitedAccountId: { not: null },
        status: { in: [LiveInvitationStatus.PENDING, LiveInvitationStatus.ACCEPTED] },
      },
      select: { invitedAccountId: true },
    });

    const hostLabel = await this.notifyHelper.resolveHostLabel(session);
    let created = 0;
    for (const row of rows) {
      if (!row.invitedAccountId || row.invitedAccountId === session.hostAccountId) {
        continue;
      }
      const ok = await this.safeNotify(row.invitedAccountId, {
        notificationType: NotificationType.OTHER,
        title: `${hostLabel} est en direct / ${hostLabel} is live now`,
        body:
          `« ${session.title} » — vous étiez invité, rejoignez / ` +
          `"${session.title}" — you were invited, join now`,
        relatedEntityId: session.id,
      });
      if (ok) {
        created += 1;
      }
    }
    return created;
  }

  // --- internals -----------------------------------------------------------

  /**
   * Idempotently create an invitation for an on-platform account.
   * @returns true when a NEW invitation row was created, false when one already
   *          existed (deduped).
   */
  private async upsertAccountInvite(
    liveSessionId: string,
    hostAccountId: string,
    invitedAccountId: string,
  ): Promise<boolean> {
    const existing = await this.prisma.liveInvitation.findFirst({
      where: { liveSessionId, invitedAccountId, deletedAt: null },
      select: { id: true },
    });
    if (existing) {
      return false;
    }
    try {
      await this.prisma.liveInvitation.create({
        data: {
          liveSessionId,
          inviterAccountId: hostAccountId,
          invitedAccountId,
          status: LiveInvitationStatus.PENDING,
        },
      });
      return true;
    } catch (err) {
      // Lost a create race against a concurrent invite — treat as deduped.
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        return false;
      }
      throw err;
    }
  }

  /** Idempotently create an invitation for an off-platform phone. */
  private async upsertPhoneInvite(
    liveSessionId: string,
    hostAccountId: string,
    invitedPhone: string,
  ): Promise<boolean> {
    const existing = await this.prisma.liveInvitation.findFirst({
      where: { liveSessionId, invitedPhone, deletedAt: null },
      select: { id: true },
    });
    if (existing) {
      return false;
    }
    await this.prisma.liveInvitation.create({
      data: {
        liveSessionId,
        inviterAccountId: hostAccountId,
        invitedPhone,
        status: LiveInvitationStatus.PENDING,
      },
    });
    return true;
  }

  private async notifyInvitedAccount(
    session: LiveSession,
    accountId: string,
    hostLabel: string,
  ): Promise<void> {
    await this.safeNotify(accountId, {
      notificationType: NotificationType.INVITATION_RECEIVED,
      title: `${hostLabel} t'invite à un direct / ${hostLabel} invites you to a live`,
      body: `« ${session.title} »`,
      relatedEntityId: session.id,
      pushExternal: true,
    });
  }

  private async notifyInvitedPhone(
    session: LiveSession,
    phone: string,
    hostLabel: string,
  ): Promise<void> {
    // Off-platform: the WhatsApp/SMS push carries the join-by-code deep link so
    // a tap on a shared link resolves straight to the live (access still
    // enforced on join). Falls back to the session deep link if no code.
    const path = session.inviteCode
      ? `/live/join/${session.inviteCode}`
      : `/live/${session.id}`;
    const base = (process.env.WEB_APP_URL || 'http://localhost:3001').replace(
      /\/$/,
      '',
    );
    const body =
      `${hostLabel} t'invite à un direct / ${hostLabel} invites you to a live — ` +
      `« ${session.title} » — ${base}${path}`;
    try {
      await this.messaging.sendWithFallback(phone, body);
    } catch (err) {
      this.logger.warn(
        `Failed to push phone invite for live=${session.id}: ${(err as Error).message}`,
      );
    }
  }

  /** Best-effort in-app notification; never throws into the request path. */
  private async safeNotify(
    accountId: string,
    params: {
      notificationType: NotificationType;
      title: string;
      body: string;
      relatedEntityId: string;
      pushExternal?: boolean;
    },
  ): Promise<boolean> {
    try {
      await this.notifications.createNotification({
        accountId,
        notificationType: params.notificationType,
        title: params.title,
        body: params.body,
        relatedEntityType: 'live_session',
        relatedEntityId: params.relatedEntityId,
        actionUrl: `/live/${params.relatedEntityId}`,
        pushExternal: params.pushExternal,
      });
      return true;
    } catch (err) {
      this.logger.warn(
        `Failed to notify account=${accountId} about live=${params.relatedEntityId}: ${(err as Error).message}`,
      );
      return false;
    }
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
        'Only the host can manage invitations / Seul l’hôte peut gérer les invitations',
      );
    }
    return session;
  }

  private async writeContribution(
    accountId: string,
    entityId: string,
    action: string,
    newValue: Prisma.InputJsonValue,
  ): Promise<void> {
    await this.prisma.contribution.create({
      data: {
        accountId,
        entityType: 'live_session',
        entityId,
        action,
        newValue,
      },
    });
  }
}
