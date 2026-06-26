/**
 * In-memory PrismaService test double for the Phase-2 PUBLIC cultural-heritage
 * world (cultural content authoring, the public discovery feed, and moderation).
 *
 * It is a deliberate SIBLING of `feed-prisma-mock.ts` rather than an edit of it:
 * the private family-feed flows and the public cultural flows touch disjoint
 * Prisma models, so keeping the doubles separate keeps each one small and
 * readable. Both follow the same philosophy — intercept exactly the Prisma calls
 * the production code paths use, back them with plain arrays/maps, and let specs
 * exercise the REAL services (CulturalContentService / PublicFeedService /
 * ModerationService) with only the database layer faked out.
 *
 * Accessors implemented (only what the three services actually call):
 *   - culturalAuthority.findFirst / findMany / create / update
 *   - culturalContent.create / findFirst / findMany / update
 *   - moderationReport.findFirst / findMany / findUnique / create / update
 *   - contribution.create / findMany        (mandatory entity audit trail)
 *   - adminAuditLog.create                  (privileged-action audit trail)
 *   - account.findUnique / findMany         (display-name resolution)
 *   - $transaction                          (callback + array forms)
 *
 * Conventions: honours the project's no-`any` rule; the Prisma client always
 * speaks camelCase, so the stored shapes use camelCase too. Enum-typed columns
 * are stored as their plain string values (e.g. 'APPROVED'), which is exactly
 * what the generated Prisma enums equal at runtime — so the mock needs no
 * dependency on the generated client.
 */
import { randomUUID } from 'node:crypto';

export type MockModerationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type MockVisibilityScope = 'PRIVATE_SELF' | 'FAMILY' | 'PUBLIC';
export type MockReportStatus =
  | 'OPEN'
  | 'REVIEWING'
  | 'RESOLVED'
  | 'DISMISSED';

export interface MockCulturalAuthority {
  id: string;
  accountId: string;
  kind: string;
  displayName: string;
  region: string | null;
  ethnicGroup: string | null;
  bio: string | null;
  verified: boolean;
  verifiedAt: Date | null;
  verifiedByAccountId: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface MockCulturalContent {
  id: string;
  authorAccountId: string;
  authorityId: string | null;
  contentType: string;
  title: string;
  body: string | null;
  languageCode: string | null;
  region: string | null;
  ethnicGroup: string | null;
  mediaId: string | null;
  visibilityScope: MockVisibilityScope;
  moderationStatus: MockModerationStatus;
  isFromVerifiedAuthority: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface MockModerationReport {
  id: string;
  reporterAccountId: string;
  targetType: string;
  targetId: string;
  reason: string;
  details: string | null;
  status: MockReportStatus;
  resolution: string | null;
  resolvedByAccountId: string | null;
  resolvedAt: Date | null;
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

export interface MockAdminAuditLog {
  id: string;
  actorAccountId: string;
  actorRole: string;
  action: string;
  category: string;
  severity: string | null;
  targetEntityType: string | null;
  targetEntityId: string | null;
  targetAccountId: string | null;
  reason: string | null;
  beforeState: unknown;
  afterState: unknown;
  metadata: unknown;
  createdAt: Date;
}

export interface MockAccount {
  id: string;
  phoneNumber: string;
  fullName: string | null;
  role: string;
  isActive: boolean;
  isBanned: boolean;
  deletedAt: Date | null;
}

export interface MockCulturalDb {
  authorities: MockCulturalAuthority[];
  contents: MockCulturalContent[];
  reports: MockModerationReport[];
  contributions: MockContribution[];
  adminAuditLogs: MockAdminAuditLog[];
  accounts: Map<string, MockAccount>;
}

type Where = Record<string, unknown>;

// ---- generic where / order-by evaluation ---------------------------------

function compareValues(a: unknown, b: unknown): number {
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() - b.getTime();
  }
  if (typeof a === 'boolean' && typeof b === 'boolean') {
    return (a ? 1 : 0) - (b ? 1 : 0);
  }
  if (typeof a === 'string' && typeof b === 'string') {
    return a < b ? -1 : a > b ? 1 : 0;
  }
  if (typeof a === 'number' && typeof b === 'number') {
    return a - b;
  }
  return 0;
}

/** Evaluate a single field constraint (scalar equality or an operator object). */
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
    if ('lt' in c) {
      return value !== null && compareValues(value, c.lt) < 0;
    }
    if ('gt' in c) {
      return value !== null && compareValues(value, c.gt) > 0;
    }
    if ('not' in c) {
      return value !== c.not;
    }
    return false;
  }
  return value === cond;
}

/** Recursive Prisma-`where` matcher supporting AND / OR / NOT + field ops. */
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

export interface CulturalPrismaMock {
  db: MockCulturalDb;
  seedAccount(input?: Partial<MockAccount>): MockAccount;
  seedAuthority(
    input: Partial<MockCulturalAuthority> & { accountId: string },
  ): MockCulturalAuthority;
  seedContent(
    input: Partial<MockCulturalContent> & { authorAccountId: string },
  ): MockCulturalContent;
  prisma: Record<string, unknown>;
}

/**
 * Build a fresh in-memory PrismaService double for the cultural/moderation
 * flows, plus seed helpers. A monotonic clock guarantees deterministic
 * created_at ordering even when many rows are created in the same millisecond.
 */
export function createCulturalPrismaMock(): CulturalPrismaMock {
  const db: MockCulturalDb = {
    authorities: [],
    contents: [],
    reports: [],
    contributions: [],
    adminAuditLogs: [],
    accounts: new Map(),
  };

  // Strictly-increasing virtual clock so createdAt ordering is deterministic.
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
      region: input.region ?? null,
      ethnicGroup: input.ethnicGroup ?? null,
      bio: input.bio ?? null,
      verified: input.verified ?? false,
      verifiedAt: input.verifiedAt ?? null,
      verifiedByAccountId: input.verifiedByAccountId ?? null,
      createdAt: input.createdAt ?? now,
      updatedAt: input.updatedAt ?? now,
      deletedAt: input.deletedAt ?? null,
    };
    db.authorities.push(authority);
    return authority;
  }

  function seedContent(
    input: Partial<MockCulturalContent> & { authorAccountId: string },
  ): MockCulturalContent {
    const now = nextTime();
    const content: MockCulturalContent = {
      id: input.id ?? randomUUID(),
      authorAccountId: input.authorAccountId,
      authorityId: input.authorityId ?? null,
      contentType: input.contentType ?? 'OTHER',
      title: input.title ?? 'Untitled',
      body: input.body ?? null,
      languageCode: input.languageCode ?? null,
      region: input.region ?? null,
      ethnicGroup: input.ethnicGroup ?? null,
      mediaId: input.mediaId ?? null,
      visibilityScope: input.visibilityScope ?? 'PUBLIC',
      moderationStatus: input.moderationStatus ?? 'PENDING',
      isFromVerifiedAuthority: input.isFromVerifiedAuthority ?? false,
      createdAt: input.createdAt ?? now,
      updatedAt: input.updatedAt ?? now,
      deletedAt: input.deletedAt ?? null,
    };
    db.contents.push(content);
    return content;
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

    culturalAuthority: {
      findFirst: jest
        .fn()
        .mockImplementation(({ where = {} }: { where?: Where }) => {
          const match = db.authorities.find((a) => whereMatches(a, where));
          return Promise.resolve(match ? { ...match } : null);
        }),

      findMany: jest
        .fn()
        .mockImplementation(({ where = {} }: { where?: Where }) => {
          const rows = db.authorities.filter((a) => whereMatches(a, where));
          return Promise.resolve(rows.map((a) => ({ ...a })));
        }),

      create: jest.fn().mockImplementation(({ data }: { data: Where }) => {
        const authority = seedAuthority({
          accountId: data.accountId as string,
          kind: data.kind as string,
          displayName: data.displayName as string,
          region: (data.region as string | null) ?? null,
          ethnicGroup: (data.ethnicGroup as string | null) ?? null,
          bio: (data.bio as string | null) ?? null,
          verified: (data.verified as boolean) ?? false,
        });
        return Promise.resolve({ ...authority });
      }),

      update: jest
        .fn()
        .mockImplementation(
          ({ where, data }: { where: { id: string }; data: Where }) => {
            const authority = db.authorities.find((a) => a.id === where.id);
            if (!authority) return Promise.resolve(null);
            Object.assign(authority, data, { updatedAt: nextTime() });
            return Promise.resolve({ ...authority });
          },
        ),
    },

    culturalContent: {
      create: jest.fn().mockImplementation(({ data }: { data: Where }) => {
        const content = seedContent({
          authorAccountId: data.authorAccountId as string,
          authorityId: (data.authorityId as string | null) ?? null,
          contentType: data.contentType as string,
          title: data.title as string,
          body: (data.body as string | null) ?? null,
          languageCode: (data.languageCode as string | null) ?? null,
          region: (data.region as string | null) ?? null,
          ethnicGroup: (data.ethnicGroup as string | null) ?? null,
          mediaId: (data.mediaId as string | null) ?? null,
          visibilityScope:
            (data.visibilityScope as MockVisibilityScope) ?? 'PUBLIC',
          moderationStatus:
            (data.moderationStatus as MockModerationStatus) ?? 'PENDING',
          isFromVerifiedAuthority:
            (data.isFromVerifiedAuthority as boolean) ?? false,
        });
        return Promise.resolve({ ...content });
      }),

      findFirst: jest
        .fn()
        .mockImplementation(({ where = {} }: { where?: Where }) => {
          const match = db.contents.find((c) => whereMatches(c, where));
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
            let rows = db.contents.filter((c) => whereMatches(c, where));
            rows = applyOrderBy(rows, orderBy);
            if (typeof take === 'number') rows = rows.slice(0, take);
            return Promise.resolve(rows.map((c) => ({ ...c })));
          },
        ),

      update: jest
        .fn()
        .mockImplementation(
          ({ where, data }: { where: { id: string }; data: Where }) => {
            const content = db.contents.find((c) => c.id === where.id);
            if (!content) return Promise.resolve(null);
            Object.assign(content, data, { updatedAt: nextTime() });
            return Promise.resolve({ ...content });
          },
        ),
    },

    moderationReport: {
      findFirst: jest
        .fn()
        .mockImplementation(({ where = {} }: { where?: Where }) => {
          const match = db.reports.find((r) => whereMatches(r, where));
          return Promise.resolve(match ? { ...match } : null);
        }),

      findUnique: jest
        .fn()
        .mockImplementation(({ where }: { where: { id: string } }) => {
          const match = db.reports.find((r) => r.id === where.id);
          return Promise.resolve(match ? { ...match } : null);
        }),

      findMany: jest
        .fn()
        .mockImplementation(
          ({
            where = {},
            orderBy,
            take,
            skip,
          }: {
            where?: Where;
            orderBy?: OrderBy | OrderBy[];
            take?: number;
            skip?: number;
          }) => {
            let rows = db.reports.filter((r) => whereMatches(r, where));
            rows = applyOrderBy(rows, orderBy);
            if (typeof skip === 'number') rows = rows.slice(skip);
            if (typeof take === 'number') rows = rows.slice(0, take);
            return Promise.resolve(rows.map((r) => ({ ...r })));
          },
        ),

      create: jest.fn().mockImplementation(({ data }: { data: Where }) => {
        const report: MockModerationReport = {
          id: randomUUID(),
          reporterAccountId: data.reporterAccountId as string,
          targetType: data.targetType as string,
          targetId: data.targetId as string,
          reason: data.reason as string,
          details: (data.details as string | null) ?? null,
          status: (data.status as MockReportStatus) ?? 'OPEN',
          resolution: null,
          resolvedByAccountId: null,
          resolvedAt: null,
          createdAt: nextTime(),
        };
        db.reports.push(report);
        return Promise.resolve({ ...report });
      }),

      update: jest
        .fn()
        .mockImplementation(
          ({ where, data }: { where: { id: string }; data: Where }) => {
            const report = db.reports.find((r) => r.id === where.id);
            if (!report) return Promise.resolve(null);
            Object.assign(report, data);
            return Promise.resolve({ ...report });
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

    adminAuditLog: {
      create: jest.fn().mockImplementation(({ data }: { data: Where }) => {
        const log: MockAdminAuditLog = {
          id: randomUUID(),
          actorAccountId: data.actorAccountId as string,
          actorRole: data.actorRole as string,
          action: data.action as string,
          category: data.category as string,
          severity: (data.severity as string | null) ?? null,
          targetEntityType: (data.targetEntityType as string | null) ?? null,
          targetEntityId: (data.targetEntityId as string | null) ?? null,
          targetAccountId: (data.targetAccountId as string | null) ?? null,
          reason: (data.reason as string | null) ?? null,
          beforeState: data.beforeState ?? null,
          afterState: data.afterState ?? null,
          metadata: data.metadata ?? null,
          createdAt: nextTime(),
        };
        db.adminAuditLogs.push(log);
        return Promise.resolve({ ...log });
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
  };

  return { db, seedAccount, seedAuthority, seedContent, prisma };
}
