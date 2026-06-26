/**
 * In-memory PrismaService test double for the ELEVATION-WAVE-1 LIVE rebuild.
 *
 * WHY A DEDICATED DOUBLE (and not a reuse of phase5-live-prisma-mock.ts):
 * the wave-1 rebuild adds an INVITATION + presence-control surface on top of the
 * phase-5 access/token core — LiveInvitation (invite -> respond), per-participant
 * `hand_raised` / `is_speaker` flags, an `invite_code` join shortcut, the
 * Notification fan-out an invite triggers, and the family FeedPost auto-posted
 * when a live starts. Those touch four models phase-5 never did
 * (liveInvitation, notification, feedPost, and the new participant flags), so a
 * focused sibling double keeps the spec readable while still exercising the REAL
 * GraphDegreeService traversal for FAMILY join-by-code.
 *
 * Philosophy (identical to the other *-prisma-mock.ts doubles): intercept ONLY
 * the Prisma calls the live-rebuild code paths use, back them with plain
 * arrays/maps, and let the spec drive real logic (the live-rebuild reference
 * contract + the real graph degree BFS) with just the DB faked out.
 *
 * Accessors implemented (only what the rebuild code paths actually call):
 *   - liveSession.create / findUnique / findFirst / update
 *   - liveParticipant.create / findFirst / findMany / update
 *   - liveInvitation.create / findUnique / findFirst / findMany / update
 *   - notification.create / findMany               (invite fan-out)
 *   - feedPost.create / findMany                   (live-started auto-post)
 *   - claim.findFirst                              (account -> claimed person)
 *   - account.findUnique                           (resolve an invited account)
 *   - contribution.create / findMany               (mandatory audit trail)
 *   - parentChild.findMany / unionPartner.findMany (REAL GraphDegreeService BFS)
 *   - $transaction                                 (callback + array forms)
 *
 * Conventions: no-`any`; the Prisma client speaks camelCase so the stored shapes
 * are camelCase; enum columns are stored as their plain string values (exactly
 * what the generated Prisma enums equal at runtime), so the mock needs no
 * dependency on @prisma/client.
 */
import { randomUUID } from 'node:crypto';

export type MockLiveSessionStatus = 'SCHEDULED' | 'LIVE' | 'ENDED' | 'CANCELLED';
export type MockLiveSessionKind =
  | 'CEREMONY'
  | 'FAMILY_COUNCIL'
  | 'LESSON'
  | 'STORYTELLING'
  | 'MASTERCLASS'
  | 'OTHER';
export type MockVisibilityScope = 'PRIVATE_SELF' | 'FAMILY' | 'PUBLIC';
export type MockLiveInvitationStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED';
export type MockClaimStatus = 'PENDING' | 'VERIFIED' | 'DISPUTED' | 'REJECTED';

export interface MockAccount {
  id: string;
  phoneNumber: string;
  fullName: string | null;
  deletedAt: Date | null;
}

export interface MockClaim {
  id: string;
  accountId: string;
  personId: string;
  status: MockClaimStatus;
}

export interface MockLiveSession {
  id: string;
  hostAccountId: string;
  hostAuthorityId: string | null;
  title: string;
  description: string | null;
  kind: MockLiveSessionKind;
  visibilityScope: MockVisibilityScope;
  visibleMaxDegree: number | null;
  subjectPersonId: string | null;
  roomName: string;
  inviteCode: string | null;
  status: MockLiveSessionStatus;
  scheduledAt: Date | null;
  startedAt: Date | null;
  endedAt: Date | null;
  recordingMediaId: string | null;
  replayPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface MockLiveParticipant {
  id: string;
  liveSessionId: string;
  accountId: string;
  role: string;
  handRaised: boolean;
  isSpeaker: boolean;
  joinedAt: Date | null;
  leftAt: Date | null;
  createdAt: Date;
}

export interface MockLiveInvitation {
  id: string;
  liveSessionId: string;
  inviterAccountId: string;
  invitedAccountId: string | null;
  invitedPhone: string | null;
  status: MockLiveInvitationStatus;
  createdAt: Date;
  respondedAt: Date | null;
  deletedAt: Date | null;
}

export interface MockNotification {
  id: string;
  accountId: string;
  notificationType: string;
  title: string;
  body: string | null;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  actionUrl: string | null;
  isRead: boolean;
  createdAt: Date;
}

export interface MockFeedPost {
  id: string;
  lifeEventId: string | null;
  authorAccountId: string;
  subjectPersonId: string | null;
  postType: string;
  body: string | null;
  visibilityScope: MockVisibilityScope;
  visibleMaxDegree: number | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface MockContribution {
  id: string;
  accountId: string;
  entityType: string;
  entityId: string;
  action: string;
  fieldName: string | null;
  oldValue: unknown;
  newValue: unknown;
  note: string | null;
  createdAt: Date;
}

interface MockParentChildEdge {
  parentId: string;
  childId: string;
  deletedAt: Date | null;
}

interface MockUnionEdge {
  unionId: string;
  personId: string;
  unionDeletedAt: Date | null;
}

export interface MockLiveRebuildDb {
  accounts: Map<string, MockAccount>;
  claims: MockClaim[];
  sessions: MockLiveSession[];
  participants: MockLiveParticipant[];
  invitations: MockLiveInvitation[];
  notifications: MockNotification[];
  feedPosts: MockFeedPost[];
  contributions: MockContribution[];
  parentChild: MockParentChildEdge[];
  unions: MockUnionEdge[];
}

type Where = Record<string, unknown>;

// ---- generic where evaluation (scalars + simple operators) ----------------

function fieldMatches(value: unknown, cond: unknown): boolean {
  if (cond === null) {
    return value === null || value === undefined;
  }
  if (cond instanceof Date) {
    return value instanceof Date && value.getTime() === cond.getTime();
  }
  if (typeof cond === 'object') {
    const c = cond as Record<string, unknown>;
    if ('in' in c) {
      return Array.isArray(c.in) && (c.in as unknown[]).includes(value);
    }
    if ('not' in c) {
      return value !== c.not;
    }
    return false;
  }
  return value === cond;
}

function whereMatches(row: Record<string, unknown>, where: Where): boolean {
  return Object.entries(where).every(([key, cond]) => {
    if (key === 'AND') {
      return (cond as Where[]).every((c) => whereMatches(row, c));
    }
    if (key === 'OR') {
      return (cond as Where[]).some((c) => whereMatches(row, c));
    }
    if (key === 'NOT') {
      return !whereMatches(row, cond as Where);
    }
    return fieldMatches(row[key], cond);
  });
}

export interface LiveRebuildPrismaMock {
  db: MockLiveRebuildDb;
  seedAccount(input?: Partial<MockAccount>): MockAccount;
  seedClaim(
    input: Partial<MockClaim> & { accountId: string; personId: string },
  ): MockClaim;
  seedSession(
    input: Partial<MockLiveSession> & { hostAccountId: string },
  ): MockLiveSession;
  seedParticipant(
    input: Partial<MockLiveParticipant> & {
      liveSessionId: string;
      accountId: string;
    },
  ): MockLiveParticipant;
  /** Add a non-deleted parent->child edge to the global graph. */
  seedParentChild(parentId: string, childId: string, deleted?: boolean): void;
  /** Add a union linking every personId together (spouses are degree 1). */
  seedUnion(unionId: string, personIds: string[], deleted?: boolean): void;
  prisma: Record<string, unknown>;
}

/**
 * Build a fresh in-memory PrismaService double for the live-rebuild flows, plus
 * seed helpers. A monotonic clock guarantees deterministic created_at ordering
 * even when many rows land in the same millisecond.
 */
export function createLiveRebuildPrismaMock(): LiveRebuildPrismaMock {
  const db: MockLiveRebuildDb = {
    accounts: new Map(),
    claims: [],
    sessions: [],
    participants: [],
    invitations: [],
    notifications: [],
    feedPosts: [],
    contributions: [],
    parentChild: [],
    unions: [],
  };

  let clock = 0;
  const nextTime = (): Date => new Date(1_700_000_000_000 + clock++);

  // ---- seed helpers ------------------------------------------------------
  function seedAccount(input: Partial<MockAccount> = {}): MockAccount {
    const account: MockAccount = {
      id: input.id ?? randomUUID(),
      phoneNumber: input.phoneNumber ?? '+237600000000',
      fullName: input.fullName ?? 'Test Account',
      deletedAt: input.deletedAt ?? null,
    };
    db.accounts.set(account.id, account);
    return account;
  }

  function seedClaim(
    input: Partial<MockClaim> & { accountId: string; personId: string },
  ): MockClaim {
    const claim: MockClaim = {
      id: input.id ?? randomUUID(),
      accountId: input.accountId,
      personId: input.personId,
      status: input.status ?? 'VERIFIED',
    };
    db.claims.push(claim);
    return claim;
  }

  function seedSession(
    input: Partial<MockLiveSession> & { hostAccountId: string },
  ): MockLiveSession {
    const now = nextTime();
    const session: MockLiveSession = {
      id: input.id ?? randomUUID(),
      hostAccountId: input.hostAccountId,
      hostAuthorityId: input.hostAuthorityId ?? null,
      title: input.title ?? 'Untitled live',
      description: input.description ?? null,
      kind: input.kind ?? 'FAMILY_COUNCIL',
      visibilityScope: input.visibilityScope ?? 'FAMILY',
      visibleMaxDegree: input.visibleMaxDegree ?? null,
      subjectPersonId: input.subjectPersonId ?? null,
      roomName: input.roomName ?? `room-${randomUUID()}`,
      inviteCode: input.inviteCode ?? null,
      status: input.status ?? 'SCHEDULED',
      scheduledAt: input.scheduledAt ?? null,
      startedAt: input.startedAt ?? null,
      endedAt: input.endedAt ?? null,
      recordingMediaId: input.recordingMediaId ?? null,
      replayPublished: input.replayPublished ?? false,
      createdAt: input.createdAt ?? now,
      updatedAt: input.updatedAt ?? now,
      deletedAt: input.deletedAt ?? null,
    };
    db.sessions.push(session);
    return session;
  }

  function seedParticipant(
    input: Partial<MockLiveParticipant> & {
      liveSessionId: string;
      accountId: string;
    },
  ): MockLiveParticipant {
    const participant: MockLiveParticipant = {
      id: input.id ?? randomUUID(),
      liveSessionId: input.liveSessionId,
      accountId: input.accountId,
      role: input.role ?? 'viewer',
      handRaised: input.handRaised ?? false,
      isSpeaker: input.isSpeaker ?? false,
      joinedAt: input.joinedAt ?? nextTime(),
      leftAt: input.leftAt ?? null,
      createdAt: input.createdAt ?? nextTime(),
    };
    db.participants.push(participant);
    return participant;
  }

  function seedParentChild(
    parentId: string,
    childId: string,
    deleted = false,
  ): void {
    db.parentChild.push({
      parentId,
      childId,
      deletedAt: deleted ? nextTime() : null,
    });
  }

  function seedUnion(unionId: string, personIds: string[], deleted = false): void {
    for (const personId of personIds) {
      db.unions.push({
        unionId,
        personId,
        unionDeletedAt: deleted ? nextTime() : null,
      });
    }
  }

  // ---- prisma accessors --------------------------------------------------
  const prisma: Record<string, unknown> = {
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
    onModuleInit: jest.fn().mockResolvedValue(undefined),
    onModuleDestroy: jest.fn().mockResolvedValue(undefined),

    $transaction: jest
      .fn()
      .mockImplementation(
        (
          arg: ((tx: Record<string, unknown>) => unknown) | Promise<unknown>[],
        ): Promise<unknown> => {
          if (typeof arg === 'function') {
            return Promise.resolve(arg(prisma));
          }
          return Promise.all(arg);
        },
      ),

    liveSession: {
      create: jest.fn().mockImplementation(({ data }: { data: Where }) =>
        Promise.resolve({
          ...seedSession({
            hostAccountId: data.hostAccountId as string,
            hostAuthorityId: (data.hostAuthorityId as string | null) ?? null,
            title: data.title as string,
            description: (data.description as string | null) ?? null,
            kind: (data.kind as MockLiveSessionKind) ?? 'FAMILY_COUNCIL',
            visibilityScope:
              (data.visibilityScope as MockVisibilityScope) ?? 'FAMILY',
            visibleMaxDegree: (data.visibleMaxDegree as number | null) ?? null,
            subjectPersonId: (data.subjectPersonId as string | null) ?? null,
            roomName: data.roomName as string,
            inviteCode: (data.inviteCode as string | null) ?? null,
            status: (data.status as MockLiveSessionStatus) ?? 'SCHEDULED',
            scheduledAt: (data.scheduledAt as Date | null) ?? null,
          }),
        }),
      ),

      findUnique: jest
        .fn()
        .mockImplementation(({ where }: { where: { id: string } }) => {
          const match = db.sessions.find((s) => s.id === where.id);
          return Promise.resolve(match ? { ...match } : null);
        }),

      findFirst: jest
        .fn()
        .mockImplementation(({ where = {} }: { where?: Where }) => {
          const match = db.sessions.find((s) => whereMatches(s, where));
          return Promise.resolve(match ? { ...match } : null);
        }),

      update: jest
        .fn()
        .mockImplementation(
          ({ where, data }: { where: { id: string }; data: Where }) => {
            const session = db.sessions.find((s) => s.id === where.id);
            if (!session) return Promise.resolve(null);
            Object.assign(session, data, { updatedAt: nextTime() });
            return Promise.resolve({ ...session });
          },
        ),
    },

    liveParticipant: {
      create: jest.fn().mockImplementation(({ data }: { data: Where }) =>
        Promise.resolve({
          ...seedParticipant({
            liveSessionId: data.liveSessionId as string,
            accountId: data.accountId as string,
            role: (data.role as string) ?? 'viewer',
            handRaised: (data.handRaised as boolean) ?? false,
            isSpeaker: (data.isSpeaker as boolean) ?? false,
            joinedAt: (data.joinedAt as Date | null) ?? null,
            leftAt: (data.leftAt as Date | null) ?? null,
          }),
        }),
      ),

      findFirst: jest
        .fn()
        .mockImplementation(({ where = {} }: { where?: Where }) => {
          const match = db.participants.find((p) => whereMatches(p, where));
          return Promise.resolve(match ? { ...match } : null);
        }),

      findMany: jest
        .fn()
        .mockImplementation(({ where = {} }: { where?: Where }) => {
          const rows = db.participants.filter((p) => whereMatches(p, where));
          return Promise.resolve(rows.map((p) => ({ ...p })));
        }),

      update: jest
        .fn()
        .mockImplementation(
          ({ where, data }: { where: { id: string }; data: Where }) => {
            const participant = db.participants.find((p) => p.id === where.id);
            if (!participant) return Promise.resolve(null);
            Object.assign(participant, data);
            return Promise.resolve({ ...participant });
          },
        ),
    },

    liveInvitation: {
      create: jest.fn().mockImplementation(({ data }: { data: Where }) => {
        const invitation: MockLiveInvitation = {
          id: randomUUID(),
          liveSessionId: data.liveSessionId as string,
          inviterAccountId: data.inviterAccountId as string,
          invitedAccountId: (data.invitedAccountId as string | null) ?? null,
          invitedPhone: (data.invitedPhone as string | null) ?? null,
          status: (data.status as MockLiveInvitationStatus) ?? 'PENDING',
          createdAt: nextTime(),
          respondedAt: (data.respondedAt as Date | null) ?? null,
          deletedAt: null,
        };
        db.invitations.push(invitation);
        return Promise.resolve({ ...invitation });
      }),

      findUnique: jest
        .fn()
        .mockImplementation(({ where }: { where: { id: string } }) => {
          const match = db.invitations.find((i) => i.id === where.id);
          return Promise.resolve(match ? { ...match } : null);
        }),

      findFirst: jest
        .fn()
        .mockImplementation(({ where = {} }: { where?: Where }) => {
          const match = db.invitations.find((i) => whereMatches(i, where));
          return Promise.resolve(match ? { ...match } : null);
        }),

      findMany: jest
        .fn()
        .mockImplementation(({ where = {} }: { where?: Where }) => {
          const rows = db.invitations.filter((i) => whereMatches(i, where));
          return Promise.resolve(rows.map((i) => ({ ...i })));
        }),

      update: jest
        .fn()
        .mockImplementation(
          ({ where, data }: { where: { id: string }; data: Where }) => {
            const invitation = db.invitations.find((i) => i.id === where.id);
            if (!invitation) return Promise.resolve(null);
            Object.assign(invitation, data);
            return Promise.resolve({ ...invitation });
          },
        ),
    },

    notification: {
      create: jest.fn().mockImplementation(({ data }: { data: Where }) => {
        const notification: MockNotification = {
          id: randomUUID(),
          accountId: data.accountId as string,
          notificationType: data.notificationType as string,
          title: data.title as string,
          body: (data.body as string | null) ?? null,
          relatedEntityType: (data.relatedEntityType as string | null) ?? null,
          relatedEntityId: (data.relatedEntityId as string | null) ?? null,
          actionUrl: (data.actionUrl as string | null) ?? null,
          isRead: (data.isRead as boolean) ?? false,
          createdAt: nextTime(),
        };
        db.notifications.push(notification);
        return Promise.resolve({ ...notification });
      }),

      findMany: jest
        .fn()
        .mockImplementation(({ where = {} }: { where?: Where }) => {
          const rows = db.notifications.filter((n) => whereMatches(n, where));
          return Promise.resolve(rows.map((n) => ({ ...n })));
        }),
    },

    feedPost: {
      create: jest.fn().mockImplementation(({ data }: { data: Where }) => {
        const now = nextTime();
        const post: MockFeedPost = {
          id: randomUUID(),
          lifeEventId: (data.lifeEventId as string | null) ?? null,
          authorAccountId: data.authorAccountId as string,
          subjectPersonId: (data.subjectPersonId as string | null) ?? null,
          postType: data.postType as string,
          body: (data.body as string | null) ?? null,
          visibilityScope:
            (data.visibilityScope as MockVisibilityScope) ?? 'FAMILY',
          visibleMaxDegree: (data.visibleMaxDegree as number | null) ?? null,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        };
        db.feedPosts.push(post);
        return Promise.resolve({ ...post });
      }),

      findMany: jest
        .fn()
        .mockImplementation(({ where = {} }: { where?: Where }) => {
          const rows = db.feedPosts.filter((p) => whereMatches(p, where));
          return Promise.resolve(rows.map((p) => ({ ...p })));
        }),
    },

    claim: {
      findFirst: jest
        .fn()
        .mockImplementation(({ where = {} }: { where?: Where }) => {
          const match = db.claims.find((c) => whereMatches(c, where));
          return Promise.resolve(match ? { ...match } : null);
        }),
    },

    account: {
      findUnique: jest
        .fn()
        .mockImplementation(({ where }: { where: { id: string } }) => {
          const account = db.accounts.get(where.id);
          return Promise.resolve(account ? { ...account } : null);
        }),
    },

    contribution: {
      create: jest.fn().mockImplementation(({ data }: { data: Where }) => {
        const contribution: MockContribution = {
          id: randomUUID(),
          accountId: data.accountId as string,
          entityType: data.entityType as string,
          entityId: data.entityId as string,
          action: data.action as string,
          fieldName: (data.fieldName as string | null) ?? null,
          oldValue: data.oldValue ?? null,
          newValue: data.newValue ?? null,
          note: (data.note as string | null) ?? null,
          createdAt: nextTime(),
        };
        db.contributions.push(contribution);
        return Promise.resolve({ ...contribution });
      }),

      findMany: jest
        .fn()
        .mockImplementation(({ where = {} }: { where?: Where }) => {
          const rows = db.contributions.filter((c) => whereMatches(c, where));
          return Promise.resolve(rows.map((c) => ({ ...c })));
        }),
    },

    // ---- family-graph edges consumed by the REAL GraphDegreeService ------
    parentChild: {
      findMany: jest
        .fn()
        .mockImplementation(
          ({
            where = {},
          }: {
            where?: {
              parentId?: { in: string[] };
              childId?: { in: string[] };
              deletedAt?: null;
            };
          }) => {
            let rows = db.parentChild.filter((r) => r.deletedAt === null);
            if (where.parentId?.in) {
              rows = rows.filter((r) => where.parentId!.in.includes(r.parentId));
            }
            if (where.childId?.in) {
              rows = rows.filter((r) => where.childId!.in.includes(r.childId));
            }
            return Promise.resolve(
              rows.map((r) => ({ parentId: r.parentId, childId: r.childId })),
            );
          },
        ),
    },

    unionPartner: {
      findMany: jest
        .fn()
        .mockImplementation(
          ({
            where = {},
          }: {
            where?: {
              personId?: { in: string[] };
              unionId?: { in: string[] };
              union?: { deletedAt: null };
            };
          }) => {
            let rows = db.unions;
            if (where.union?.deletedAt === null) {
              rows = rows.filter((r) => r.unionDeletedAt === null);
            }
            if (where.personId?.in) {
              rows = rows.filter((r) => where.personId!.in.includes(r.personId));
            }
            if (where.unionId?.in) {
              rows = rows.filter((r) => where.unionId!.in.includes(r.unionId));
            }
            return Promise.resolve(
              rows.map((r) => ({ unionId: r.unionId, personId: r.personId })),
            );
          },
        ),
    },
  };

  return {
    db,
    seedAccount,
    seedClaim,
    seedSession,
    seedParticipant,
    seedParentChild,
    seedUnion,
    prisma,
  };
}
