import { Injectable, Logger } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MatchingService } from './matching.service';

@Injectable()
export class MatchOnSignupService {
  private readonly logger = new Logger(MatchOnSignupService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly matching: MatchingService,
  ) {}

  /**
   * Trigger 1 — phone exact match.
   * Called after a new Account is created. Looks for unclaimed Person rows whose
   * stored phoneNumber matches the new account's phone, and notifies the new
   * user with a one-click claim path. Privacy-preserving: only an exact verified
   * phone match qualifies.
   */
  async runPhoneMatchAtSignup(accountId: string, phoneNumber: string): Promise<void> {
    try {
      const matches = await this.prisma.person.findMany({
        where: {
          phoneNumber,
          claimedByAccountId: null,
          deletedAt: null,
        },
        select: {
          id: true,
          displayName: true,
          createdByAccountId: true,
          createdByAccount: { select: { phoneNumber: true } },
        },
      });

      if (matches.length === 0) {
        this.logger.debug(`No phone-match found for account=${accountId}`);
        return;
      }

      this.logger.log(
        `Phone-match found: ${matches.length} unclaimed person(s) for new account=${accountId}`,
      );

      for (const person of matches) {
        const token = await this.ensureInvitationToken(
          person.id,
          person.createdByAccountId,
          phoneNumber,
        );

        const inviterPhone = person.createdByAccount?.phoneNumber;
        const inviterDisplay = inviterPhone
          ? this.maskPhone(inviterPhone)
          : 'Quelqu\'un';

        await this.notifications.createNotification({
          accountId,
          notificationType: 'MATCH_FOUND_FOR_USER',
          title: 'Tu as ete ajoute a un arbre familial',
          body: `${inviterDisplay} t'a ajoute en tant que "${person.displayName}". Veux-tu rejoindre cet arbre ?`,
          relatedEntityType: 'person',
          relatedEntityId: person.id,
          actionUrl: token ? `/join?invite=${token}` : `/persons/${person.id}`,
          pushExternal: true,
        });
      }
    } catch (err) {
      const error = err as Error;
      this.logger.error(`runPhoneMatchAtSignup failed: ${error.message}`, error.stack);
    }
  }

  /**
   * Trigger 2 — similarity match notifies inviters.
   * Called after a user creates their own Person record (isSelf=true). Runs
   * fuzzy match against unclaimed Persons; for any match >= 0.70 we notify the
   * inviter (creator) — never the new user, to preserve privacy. Inviter sees
   * only "a new user matches a fiche you created", not the new user's data.
   */
  async runSimilarityMatchForSelf(accountId: string, selfPersonId: string): Promise<void> {
    try {
      const selfPerson = await this.prisma.person.findUnique({
        where: { id: selfPersonId },
        select: {
          id: true,
          displayName: true,
          birthYearApproximate: true,
          villageOrigin: true,
        },
      });

      if (!selfPerson) {
        this.logger.warn(`runSimilarityMatchForSelf: person ${selfPersonId} not found`);
        return;
      }

      const candidates = await this.matching.findDuplicates(selfPersonId);

      const suggestable = candidates.filter((c) => c.score >= 0.7);
      if (suggestable.length === 0) {
        return;
      }

      const personIds = suggestable.map((s) => s.personId);
      const persons = await this.prisma.person.findMany({
        where: {
          id: { in: personIds },
          claimedByAccountId: null,
          deletedAt: null,
        },
        select: {
          id: true,
          displayName: true,
          createdByAccountId: true,
        },
      });

      this.logger.log(
        `Similarity-match: ${persons.length} unclaimed candidate(s) >= 0.70 for self person=${selfPersonId}`,
      );

      const notifiedInviters = new Set<string>();
      for (const ghost of persons) {
        if (!ghost.createdByAccountId) continue;
        if (ghost.createdByAccountId === accountId) continue;
        if (notifiedInviters.has(ghost.createdByAccountId)) continue;
        notifiedInviters.add(ghost.createdByAccountId);

        const score = suggestable.find((s) => s.personId === ghost.id)?.score ?? 0;
        const signals = suggestable.find((s) => s.personId === ghost.id)?.signals ?? {};

        // Persist the suggestion as a MergeProposal so the inviter can act on it
        // without ever seeing the candidate's UUID in a URL. The proposal ID
        // becomes the only thing exposed in the notification action URL —
        // anyone holding it must still pass server-side ownership checks.
        const proposal = await this.findOrCreateMergeProposal(
          ghost.id,
          selfPersonId,
          score,
          signals,
        );

        await this.notifications.createNotification({
          accountId: ghost.createdByAccountId,
          notificationType: 'POTENTIAL_MATCH_FOR_INVITER',
          title: 'Quelqu\'un pourrait correspondre a une fiche',
          body: `Une nouvelle inscription pourrait correspondre a "${ghost.displayName}" que tu as ajoute (score ${Math.round(score * 100)}%). Veux-tu confirmer ?`,
          relatedEntityType: 'merge_proposal',
          relatedEntityId: proposal.id,
          actionUrl: `/match-suggestions/${proposal.id}`,
          pushExternal: true,
        });
      }
    } catch (err) {
      const error = err as Error;
      this.logger.error(
        `runSimilarityMatchForSelf failed: ${error.message}`,
        error.stack,
      );
    }
  }

  private async findOrCreateMergeProposal(
    personAId: string,
    personBId: string,
    score: number,
    signals: Record<string, number>,
  ): Promise<{ id: string }> {
    // Reuse any pending proposal already linking these two persons (either order)
    // so we never create duplicates if the matcher fires twice on retries.
    const existing = await this.prisma.mergeProposal.findFirst({
      where: {
        status: 'PENDING',
        OR: [
          { personAId, personBId },
          { personAId: personBId, personBId: personAId },
        ],
      },
      select: { id: true },
    });
    if (existing) return existing;

    return this.prisma.mergeProposal.create({
      data: {
        personAId,
        personBId,
        matchScore: score,
        matchingSignals: signals as unknown as Prisma.JsonObject,
        status: 'PENDING',
        proposedBy: 'system',
      },
      select: { id: true },
    });
  }

  private async ensureInvitationToken(
    targetPersonId: string,
    inviterAccountId: string | null,
    phoneNumber: string,
  ): Promise<string | null> {
    if (!inviterAccountId) return null;

    const existing = await this.prisma.invitationToken.findFirst({
      where: {
        targetPersonId,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (existing) return existing.token;

    const token = randomBytes(48).toString('base64url').substring(0, 64);

    await this.prisma.invitationToken.create({
      data: {
        token,
        inviterAccountId,
        targetPersonId,
        targetPhoneNumber: phoneNumber,
        relationshipHint: null,
      } as Prisma.InvitationTokenUncheckedCreateInput,
    });

    return token;
  }

  private maskPhone(phone: string): string {
    if (phone.length < 7) return phone;
    return phone.substring(0, 7) + '****';
  }
}
