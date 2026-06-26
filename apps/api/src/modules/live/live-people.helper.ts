import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/** Bilingual fallback when a relative has no resolvable display name. */
const GENERIC_LABEL = 'Un proche / A relative';

/**
 * Shared resolution of human-friendly, NON-leaking labels for accounts/phones
 * surfaced by the live host panels (invitation list + participant roster).
 *
 * The label is the claimed person's public display name when available, else
 * the account's own `fullName`, else a generic bilingual fallback — NEVER the
 * raw phone number. Phones (for off-platform invitees) are shown masked.
 */
@Injectable()
export class LivePeopleHelper {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolve a display label for each account id, in one batched pass.
   * @returns Map keyed by accountId; every requested id is present.
   */
  async resolveAccountLabels(
    accountIds: readonly string[],
  ): Promise<Map<string, string>> {
    const unique = Array.from(new Set(accountIds));
    const labels = new Map<string, string>();
    if (unique.length === 0) {
      return labels;
    }

    const [persons, accounts] = await Promise.all([
      this.prisma.person.findMany({
        where: { claimedByAccountId: { in: unique }, deletedAt: null },
        select: { claimedByAccountId: true, displayName: true },
      }),
      this.prisma.account.findMany({
        where: { id: { in: unique } },
        select: { id: true, fullName: true },
      }),
    ]);

    const personByAccount = new Map<string, string>();
    for (const p of persons) {
      if (p.claimedByAccountId && p.displayName) {
        personByAccount.set(p.claimedByAccountId, p.displayName);
      }
    }
    const fullNameByAccount = new Map<string, string>();
    for (const a of accounts) {
      if (a.fullName) {
        fullNameByAccount.set(a.id, a.fullName);
      }
    }

    for (const id of unique) {
      labels.set(
        id,
        personByAccount.get(id) ?? fullNameByAccount.get(id) ?? GENERIC_LABEL,
      );
    }
    return labels;
  }

  /**
   * Resolve an existing, deliverable account by E.164 phone, or null. Lets a
   * "phone" invite collapse onto an in-app account when the relative is already
   * on the platform (so they get an in-app Notification, not just an SMS).
   */
  async resolveAccountIdByPhone(phone: string): Promise<string | null> {
    const account = await this.prisma.account.findFirst({
      where: { phoneNumber: phone, deletedAt: null },
      select: { id: true },
    });
    return account?.id ?? null;
  }

  /** Mask a phone for display, keeping only the last two digits (+237••••67). */
  maskPhone(phone: string): string {
    if (phone.length <= 4) {
      return '••';
    }
    const cc = phone.startsWith('+') ? phone.slice(0, 4) : '';
    const last2 = phone.slice(-2);
    return `${cc}••••${last2}`;
  }
}
