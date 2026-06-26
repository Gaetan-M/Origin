/**
 * In-memory PrismaService test double for the Phase-5 LIVE world (LiveSession /
 * LiveParticipant) plus the seams a live session leans on: CulturalAuthority
 * (who may host a PUBLIC lesson/masterclass), Claim (VERIFIED -> personId, the
 * account->person bridge used for FAMILY degree-bounded access), Account, the
 * family-graph edges consumed by the REAL GraphDegreeService (parentChild /
 * unionPartner), and the mandatory Contribution audit trail.
 *
 * It is a deliberate SIBLING of cultural-prisma-mock.ts / feed-prisma-mock.ts:
 * the Phase-5 flows touch their own Prisma models, so a dedicated, small double
 * keeps each spec readable. The philosophy is identical — intercept exactly the
 * Prisma calls the code paths use, back them with plain arrays/maps, and let the
 * spec exercise real logic (here: the real GraphDegreeService + the Phase-5
 * reference contract in phase5-live-reference.ts) with only the DB faked out.
 *
 * Accessors implemented (only what the live code paths actually call):
 *   - liveSession.create / findUnique / findFirst / findMany / update
 *   - liveParticipant.create / findFirst / findMany / update
 *   - culturalAuthority.findFirst / findUnique
 *   - claim.findFirst / findMany
 *   - account.findUnique / findMany
 *   - parentChild.findMany        (REAL GraphDegreeService traversal)
 *   - unionPartner.findMany       (REAL GraphDegreeService traversal)
 *   - contribution.create / findMany   (mandatory entity audit trail)
 *   - $transaction                (callback + array forms)
 *
 * Conventions: honours the no-`any` rule; the Prisma client speaks camelCase, so
 * the stored shapes use camelCase too. Enum-typed columns are stored as their
 * plain string values (e.g. 'LIVE'), which is exactly what the generated Prisma
 * enums equal at runtime — so the mock needs no dependency on the client.
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
export type MockClaimStatus = 'PENDING' | 'VERIFIED' | 'DISPUTED' | 'REJECTED';

export interface MockAccount {
  id: string;
  phoneNumber: string;
  fullName: string | null;
  role: string;
  isActive: boolean;
  isBanned: boolean;
  deletedAt: Date | null;
}

export interface MockCulturalAuthority {
  id: string;
  accountId: string;
  kind: string;
  displayName: string;
  verified: boolean;
  verifiedAt: Date | null;
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
  joinedAt: Date | null;
  leftAt: Date | null;
  createdAt: Date;
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

export interface MockLiveDb {
  accounts: Map<string, MockAccount>;
  authorities: MockCulturalAuthority[];
  claims: MockClaim[];
  sessions: MockLiveSession[];
  participants: MockLiveParticipant[];
  contributions: MockContribution[];
  parentChild: MockParentChildEdge[];
  unions: MockUnionEdge[];
}

type Where = Record<string, unknown>;

// ---- generic where / order-by evaluation (scalars + simple operators) -----

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

type OrderBy = Record<string, 'asc' | 'desc'>;

function compareValues(a: unknown, b: unknown): number {
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() - b.getTime();
  }
  if (typeof a === 'string' && typeof b === 'string') {
    return a < b ? -1 : a > b ? 1 : 0;
  }
  if (typeof a === 'number' && typeof b === 'number') {
    return a - b;
  }
  return 0;
}

function applyOrderBy<T extends Record<string, unknown>>(
  rows: T[],
  orderBy: OrderBy | OrderBy[] | undefined,
): T[] {
  if (!orderBy) {
    return rows;
  }
  const clauses = Array.isArray(orderBy) ? orderBy : [orderBy];
  return [...rows].sort((a, b) => {
    for (const clause of clauses) {
      const [field, dir] = Object.entries(clause)[0];
      const c = compareValues(a[field], b[field]);
      if (c !== 0) {
        return dir === 'desc' ? -c : c;
      }
    }
    return 0;
  });
}

export interface LivePrismaMock {
  db: MockLiveDb;
  seedAccount(input?: Partial<MockAccount>): MockAccount;
  seedAuthority(
    input: Partial<MockCulturalAuthority> & { accountId: string },
  ): MockCulturalAuthority;
  seedClaim(
    input: Partial<MockClaim> & { accountId: string; personId: string },
  ): MockClaim;
  seedSession(
    input: Partial<MockLiveSession> & { hostAccountId: string },
  ): MockLiveSession;
  /** Add a non-deleted parent->child edge to the global graph. */
  seedParentChild(parentId: string, childId: string, deleted?: boolean): void;
  /** Add a union linking every personId together (spouses are degree 1). */
  seedUnion(unionId: string, personIds: string[], deleted?: boolean): void;
  prisma: Record<string, unknown>;
}

/**
 * Build a fresh in-memory PrismaService double for the LIVE flows, plus seed
 * helpers. A monotonic clock guarantees deterministic created_at ordering even
 * when many rows are created in the same millisecond.
 */
export function createLivePrismaMock(): LivePrismaMock {
  const db: MockLiveDb = {
    accounts: new Map(),
    authorities: [],
    claims: [],
    sessions: [],
    participants: [],
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
      role: input.role ?? 'USER',
      isActive: input.isActive ?? true,
      isBanned: input.isBanned ?? false,
      deletedAt: input.deletedAt ?? null,
    };
    db.accounts.set(account.id, account);
    return account;
  }

  function seedAuthority(
    input: Partial<MockCulturalAuthority> & { accountId: string },
  ): MockCulturalAuthority {
    const now = nextTime();
    const authority: MockCulturalAuthority = {
      id: input.id ?? randomUUID(),
      accountId: input.accountId,
      kind: input.kind ?? 'EXPERT',
      displayName: input.displayName ?? 'Test Authority',
      verified: input.verified ?? false,
      verifiedAt: input.verifiedAt ?? (input.verified ? now : null),
      deletedAt: input.deletedAt ?? null,
    };
    db.authorities.push(authority);
    return authority;
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
      kind: input.kind ?? 'OTHER',
      visibilityScope: input.visibilityScope ?? 'FAMILY',
      visibleMaxDegree: input.visibleMaxDegree ?? null,
      subjectPersonId: input.subjectPersonId ?? null,
      roomName: input.roomName ?? `room-${randomUUID()}`,
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

  function seedUnion(
    unionId: string,
    personIds: string[],
    deleted = false,
  ): void {
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
      create: jest.fn().mockImplementation(({ data }: { data: Where }) => {
        const session = seedSession({
          hostAccountId: data.hostAccountId as string,
          hostAuthorityId: (data.hostAuthorityId as string | null) ?? null,
          title: data.title as string,
          description: (data.description as string | null) ?? null,
          kind: data.kind as MockLiveSessionKind,
          visibilityScope:
            (data.visibilityScope as MockVisibilityScope) ?? 'FAMILY',
          visibleMaxDegree: (data.visibleMaxDegree as number | null) ?? null,
          subjectPersonId: (data.subjectPersonId as string | null) ?? null,
          roomName: data.roomName as string,
          status: (data.status as MockLiveSessionStatus) ?? 'SCHEDULED',
          scheduledAt: (data.scheduledAt as Date | null) ?? null,
        });
        return Promise.resolve({ ...session });
      }),

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

      findMany: jest
        .fn()
        .mockImplementation(
          ({
            where = {},
            orderBy,
            take,
          }: {
            where?: Where;
            orderBy?: OrderBy | OrderBy[];
            take?: number;
          }) => {
            let rows = db.sessions.filter((s) => whereMatches(s, where));
            rows = applyOrderBy(rows, orderBy);
            if (typeof take === 'number') rows = rows.slice(0, take);
            return Promise.resolve(rows.map((s) => ({ ...s })));
          },
        ),

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
      create: jest.fn().mockImplementation(({ data }: { data: Where }) => {
        const participant: MockLiveParticipant = {
          id: randomUUID(),
          liveSessionId: data.liveSessionId as string,
          accountId: data.accountId as string,
          role: data.role as string,
          joinedAt: (data.joinedAt as Date | null) ?? null,
          leftAt: (data.leftAt as Date | null) ?? null,
          createdAt: nextTime(),
        };
        db.participants.push(participant);
        return Promise.resolve({ ...participant });
      }),

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

    culturalAuthority: {
      findFirst: jest
        .fn()
        .mockImplementation(({ where = {} }: { where?: Where }) => {
          const match = db.authorities.find((a) => whereMatches(a, where));
          return Promise.resolve(match ? { ...match } : null);
        }),

      findUnique: jest
        .fn()
        .mockImplementation(
          ({ where }: { where: { accountId?: string; id?: string } }) => {
            const match = db.authorities.find(
              (a) =>
                (where.id !== undefined && a.id === where.id) ||
                (where.accountId !== undefined &&
                  a.accountId === where.accountId),
            );
            return Promise.resolve(match ? { ...match } : null);
          },
        ),
    },

    claim: {
      findFirst: jest
        .fn()
        .mockImplementation(({ where = {} }: { where?: Where }) => {
          const match = db.claims.find((c) => whereMatches(c, where));
          return Promise.resolve(match ? { ...match } : null);
        }),

      findMany: jest
        .fn()
        .mockImplementation(({ where = {} }: { where?: Where }) => {
          const rows = db.claims.filter((c) => whereMatches(c, where));
          return Promise.resolve(rows.map((c) => ({ ...c })));
        }),
    },

    account: {
      findUnique: jest
        .fn()
        .mockImplementation(({ where }: { where: { id: string } }) => {
          const account = db.accounts.get(where.id);
          return Promise.resolve(account ? { ...account } : null);
        }),

      findMany: jest
        .fn()
        .mockImplementation(({ where = {} }: { where?: Where }) => {
          const ids = (where.id as { in?: string[] } | undefined)?.in;
          let rows = [...db.accounts.values()];
          if (ids) rows = rows.filter((a) => ids.includes(a.id));
          return Promise.resolve(rows.map((a) => ({ ...a })));
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
            // The service filters on union.deletedAt = null on the personId
            // lookup; honour it so soft-deleted unions never bridge.
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
  };

  return {
    db,
    seedAccount,
    seedAuthority,
    seedClaim,
    seedSession,
    seedParentChild,
    seedUnion,
    prisma,
  };
}
