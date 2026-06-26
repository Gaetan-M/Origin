import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type LiveSession } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { LiveRoomService } from './live-room.service';
import { LivePeopleHelper } from './live-people.helper';

/** A single row in the host's live participant roster panel. */
export interface RosterEntry {
  /** LiveKit identity == the account id baked into the join token. */
  identity: string;
  accountId: string;
  /** Non-leaking display label (claimed person name / account name / generic). */
  displayName: string;
  /** 'host' | 'speaker' | 'viewer'. */
  role: string;
  handRaised: boolean;
  isSpeaker: boolean;
  /** Present in the LiveKit room right now. */
  online: boolean;
  /** Actively publishing an un-muted audio track right now. */
  publishing: boolean;
  joinedAt: Date | null;
}

/** Result of a host control op: what changed + whether LiveKit applied it. */
export interface HostControlResult {
  identity: string;
  /** New persisted state of the participant after the op. */
  role: string;
  isSpeaker: boolean;
  handRaised: boolean;
  /** True when the effect reached the live LiveKit room (false in dev/no-creds). */
  liveKitApplied: boolean;
}

/** Result of the (self-service) raise-hand toggle. */
export interface RaiseHandResult {
  identity: string;
  handRaised: boolean;
}

/**
 * Host moderation controls for a live room, bridging our persisted
 * LiveParticipant rows with the real-time LiveKit room via {@link LiveRoomService}.
 *
 *  - mute / promote / remove are HOST-ONLY and update both the DB row
 *    (isSpeaker, presence) and the LiveKit room (publish permission, eject).
 *  - raise-hand is SELF-SERVICE: any joined participant toggles their own
 *    `handRaised`, broadcast to the room so the host panel updates instantly.
 *  - getRoster is HOST-ONLY and merges the persisted roster with live presence.
 *
 * LiveKit effects degrade gracefully when creds are absent: the DB side-effects
 * still apply and `liveKitApplied` reports false. Every mutation writes a
 * Contribution audit row.
 */
@Injectable()
export class LiveHostControlService {
  private readonly logger = new Logger(LiveHostControlService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly room: LiveRoomService,
    private readonly people: LivePeopleHelper,
  ) {}

  /** Host-only: force-mute a participant's audio in the room. */
  async muteParticipant(
    sessionId: string,
    hostAccountId: string,
    identity: string,
  ): Promise<HostControlResult> {
    const session = await this.loadOwnedSession(sessionId, hostAccountId);
    const participant = await this.requireParticipant(sessionId, identity);

    const applied = await this.room.muteAudio(session.roomName, identity);
    await this.writeContribution(hostAccountId, sessionId, 'MUTE_PARTICIPANT', {
      identity,
      liveKitApplied: applied,
    });
    await this.room.broadcastData(session.roomName, {
      type: 'participant_muted',
      identity,
    });

    return {
      identity,
      role: participant.role,
      isSpeaker: participant.isSpeaker,
      handRaised: participant.handRaised,
      liveKitApplied: applied,
    };
  }

  /** Host-only: promote a viewer to speaker (grant publish rights). */
  async promoteParticipant(
    sessionId: string,
    hostAccountId: string,
    identity: string,
  ): Promise<HostControlResult> {
    const session = await this.loadOwnedSession(sessionId, hostAccountId);
    await this.requireParticipant(sessionId, identity);

    const applied = await this.room.grantPublish(session.roomName, identity);

    const updated = await this.prisma.liveParticipant.update({
      where: {
        liveSessionId_accountId: { liveSessionId: sessionId, accountId: identity },
      },
      // Promoting also lowers a raised hand — the ask has been answered.
      data: { isSpeaker: true, role: 'speaker', handRaised: false },
    });
    await this.writeContribution(hostAccountId, sessionId, 'PROMOTE_PARTICIPANT', {
      identity,
      liveKitApplied: applied,
    });
    await this.room.broadcastData(session.roomName, {
      type: 'participant_promoted',
      identity,
    });

    return {
      identity,
      role: updated.role,
      isSpeaker: updated.isSpeaker,
      handRaised: updated.handRaised,
      liveKitApplied: applied,
    };
  }

  /** Host-only: eject a participant and revoke their publish rights. */
  async removeParticipant(
    sessionId: string,
    hostAccountId: string,
    identity: string,
  ): Promise<HostControlResult> {
    const session = await this.loadOwnedSession(sessionId, hostAccountId);
    if (identity === hostAccountId) {
      throw new ForbiddenException(
        'The host cannot remove themselves / L’hôte ne peut pas se retirer',
      );
    }
    await this.requireParticipant(sessionId, identity);

    await this.room.revokePublish(session.roomName, identity);
    const applied = await this.room.removeParticipant(session.roomName, identity);

    const updated = await this.prisma.liveParticipant.update({
      where: {
        liveSessionId_accountId: { liveSessionId: sessionId, accountId: identity },
      },
      data: {
        isSpeaker: false,
        role: 'viewer',
        handRaised: false,
        leftAt: new Date(),
      },
    });
    await this.writeContribution(hostAccountId, sessionId, 'REMOVE_PARTICIPANT', {
      identity,
      liveKitApplied: applied,
    });
    await this.room.broadcastData(session.roomName, {
      type: 'participant_removed',
      identity,
    });

    return {
      identity,
      role: updated.role,
      isSpeaker: updated.isSpeaker,
      handRaised: updated.handRaised,
      liveKitApplied: applied,
    };
  }

  /**
   * Self-service: the caller toggles their own raised hand. Must already be a
   * participant of the session. Broadcasts the new state to the room.
   */
  async toggleHand(
    sessionId: string,
    accountId: string,
  ): Promise<RaiseHandResult> {
    const session = await this.prisma.liveSession.findFirst({
      where: { id: sessionId, deletedAt: null },
      select: { id: true, roomName: true },
    });
    if (!session) {
      throw new NotFoundException(
        'Live session not found / Session en direct introuvable',
      );
    }
    const participant = await this.requireParticipant(sessionId, accountId);

    const next = !participant.handRaised;
    const updated = await this.prisma.liveParticipant.update({
      where: {
        liveSessionId_accountId: { liveSessionId: sessionId, accountId },
      },
      data: { handRaised: next },
    });
    await this.writeContribution(accountId, sessionId, 'RAISE_HAND', {
      handRaised: next,
    });
    await this.room.broadcastData(session.roomName, {
      type: 'hand_raised',
      identity: accountId,
      handRaised: next,
    });

    return { identity: accountId, handRaised: updated.handRaised };
  }

  /**
   * Host-only roster for the moderation panel: persisted participants merged
   * with live LiveKit presence (online / publishing). Raised hands first, then
   * speakers, so the host sees who needs attention at the top.
   */
  async getRoster(
    sessionId: string,
    hostAccountId: string,
  ): Promise<RosterEntry[]> {
    const session = await this.loadOwnedSession(sessionId, hostAccountId);

    const participants = await this.prisma.liveParticipant.findMany({
      where: { liveSessionId: sessionId },
      orderBy: { joinedAt: 'asc' },
    });

    const labels = await this.people.resolveAccountLabels(
      participants.map((p) => p.accountId),
    );
    const presence = await this.room.listPresence(session.roomName);

    const roster: RosterEntry[] = participants.map((p) => {
      const live = presence.get(p.accountId);
      return {
        identity: p.accountId,
        accountId: p.accountId,
        displayName: labels.get(p.accountId) ?? 'Un proche / A relative',
        role: p.role,
        handRaised: p.handRaised,
        isSpeaker: p.isSpeaker,
        online: live !== undefined,
        publishing: live?.publishing ?? false,
        joinedAt: p.joinedAt,
      };
    });

    // Surface the people who need host attention first.
    roster.sort((a, b) => {
      if (a.handRaised !== b.handRaised) {
        return a.handRaised ? -1 : 1;
      }
      if (a.isSpeaker !== b.isSpeaker) {
        return a.isSpeaker ? -1 : 1;
      }
      return 0;
    });
    return roster;
  }

  // --- internals -----------------------------------------------------------

  private async requireParticipant(
    sessionId: string,
    accountId: string,
  ): Promise<{ role: string; isSpeaker: boolean; handRaised: boolean }> {
    const participant = await this.prisma.liveParticipant.findUnique({
      where: {
        liveSessionId_accountId: { liveSessionId: sessionId, accountId },
      },
      select: { role: true, isSpeaker: true, handRaised: true },
    });
    if (!participant) {
      throw new NotFoundException(
        'This person is not in the live / Cette personne n’est pas dans le direct',
      );
    }
    return participant;
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
        'Only the host can control this live / Seul l’hôte peut contrôler ce direct',
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
