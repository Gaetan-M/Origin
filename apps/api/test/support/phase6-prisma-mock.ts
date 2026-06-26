/**
 * In-memory PrismaService test double for the Phase-6 TOURISM + LEARNING world.
 *
 * WHY THIS EXISTS (parallel-safety):
 * The production TourismService / LearningService / LessonEnrollmentService and
 * their controllers are authored in parallel by other devs under
 * apps/api/src/modules/* (not importable yet without risking a broken e2e
 * compile), and the Phase-6 Prisma models (tourismPlace / learningLesson /
 * lessonEnrollment) are added to schema.prisma by the data-modeler. So this is a
 * standalone double — a deliberate SIBLING of `cultural-prisma-mock.ts` rather
 * than an edit of it — that backs exactly the Prisma calls the Phase-6 code
 * paths use with plain arrays/maps. The companion reference implementation
 * (`phase6-reference.ts`) encodes the agreed business rules and is driven by
 * `phase6-tourism-learning.e2e-spec.ts` against this double.
 *
 * Conventions: honours the no-`any` rule. The Prisma client always speaks
 * camelCase, so stored shapes use camelCase too; enum-typed columns are stored
 * as their plain string values (e.g. 'APPROVED' / 'MINISTRY'), exactly what the
 * generated Prisma enums equal at runtime — so the mock needs no dependency on
 * the generated client. snake_case lives only in the DB (schema @map), never
 * here.
 *
 * Accessors implemented (only what the Phase-6 code paths actually call):
 *   - tourismPlace.create / findFirst / findMany / update
 *   - learningLesson.create / findFirst / findMany / update
 *   - lessonEnrollment.findFirst / findMany / create / update
 *   - culturalAuthority.findFirst                  (verified-author gating)
 *   - contribution.create / findMany               (mandatory entity audit)
 *   - adminAuditLog.create                         (privileged-action audit)
 *   - account.findUnique
 *   - $transaction                                 (callback + array forms)
 */
import { randomUUID } from 'node:crypto';

export type MockModerationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type MockVisibilityScope = 'PRIVATE_SELF' | 'FAMILY' | 'PUBLIC';
export type MockTourismSource = 'MINISTRY' | 'NGO' | 'COMMUNITY';
export type MockTourismCategory =
  | 'HERITAGE'
  | 'NATURE'
  | 'CULTURE'
  | 'MUSEUM'
  | 'CHEFFERIE'
  | 'RELIGIOUS'
  | 'OTHER';
export type MockLearningLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

export interface MockTourismPlace {
  id: string;
  name: string;
  description: string | null;
  region: string | null;
  category: MockTourismCategory;
  latitude: number | null;
  longitude: number | null;
  source: MockTourismSource;
  sourceRef: string | null;
  verified: boolean;
  verifiedByAccountId: string | null;
  mediaId: string | null;
  submittedByAccountId: string | null;
  visibilityScope: MockVisibilityScope;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface MockLearningLesson {
  id: string;
  title: string;
  description: string | null;
  content: string | null;
  languageCode: string | null;
  level: MockLearningLevel;
  ethnicGroup: string | null;
  authorityId: string | null;
  authorAccountId: string;
  mediaId: string | null;
  isTicketed: boolean;
  liveSessionId: string | null;
  visibilityScope: MockVisibilityScope;
  moderationStatus: MockModerationStatus;
  position: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface MockLessonEnrollment {
  id: string;
  lessonId: string;
  accountId: string;
  progressPercent: number;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockCulturalAuthority {
  id: string;
  accountId: string;
  verified: boolean;
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
  deletedAt: Date | null;
}

export interface MockPhase6Db {
  places: MockTourismPlace[];
  lessons: MockLearningLesson[];
  enrollments: MockLessonEnrollment[];
  authorities: MockCulturalAuthority[];
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

export interface Phase6PrismaMock {
  db: MockPhase6Db;
  seedAccount(input?: Partial<MockAccount>): MockAccount;
  seedAuthority(
    input: Partial<MockCulturalAuthority> & { accountId: string },
  ): MockCulturalAuthority;
  seedPlace(input?: Partial<MockTourismPlace>): MockTourismPlace;
  seedLesson(
    input: Partial<MockLearningLesson> & { authorAccountId: string },
  ): MockLearningLesson;
  prisma: Record<string, unknown>;
}

/**
 * Build a fresh in-memory PrismaService double for the Phase-6 tourism/learning
 * flows, plus seed helpers. A monotonic virtual clock guarantees deterministic
 * created_at ordering even when many rows are created in the same millisecond.
 */
export function createPhase6PrismaMock(): Phase6PrismaMock {
  const db: MockPhase6Db = {
    places: [],
    lessons: [],
    enrollments: [],
    authorities: [],
    contributions: [],
    adminAuditLogs: [],
    accounts: new Map(),
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
      deletedAt: input.deletedAt ?? null,
    };
    db.accounts.set(account.id, account);
    return account;
  }

  function seedAuthority(
    input: Partial<MockCulturalAuthority> & { accountId: string },
  ): MockCulturalAuthority {
    const authority: MockCulturalAuthority = {
      id: input.id ?? randomUUID(),
      accountId: input.accountId,
      verified: input.verified ?? false,
      deletedAt: input.deletedAt ?? null,
    };
    db.authorities.push(authority);
    return authority;
  }

  function seedPlace(input: Partial<MockTourismPlace> = {}): MockTourismPlace {
    const now = nextTime();
    const place: MockTourismPlace = {
      id: input.id ?? randomUUID(),
      name: input.name ?? 'Untitled place',
      description: input.description ?? null,
      region: input.region ?? null,
      category: input.category ?? 'OTHER',
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      source: input.source ?? 'COMMUNITY',
      sourceRef: input.sourceRef ?? null,
      verified: input.verified ?? false,
      verifiedByAccountId: input.verifiedByAccountId ?? null,
      mediaId: input.mediaId ?? null,
      submittedByAccountId: input.submittedByAccountId ?? null,
      visibilityScope: input.visibilityScope ?? 'PUBLIC',
      createdAt: input.createdAt ?? now,
      updatedAt: input.updatedAt ?? now,
      deletedAt: input.deletedAt ?? null,
    };
    db.places.push(place);
    return place;
  }

  function seedLesson(
    input: Partial<MockLearningLesson> & { authorAccountId: string },
  ): MockLearningLesson {
    const now = nextTime();
    const lesson: MockLearningLesson = {
      id: input.id ?? randomUUID(),
      title: input.title ?? 'Untitled lesson',
      description: input.description ?? null,
      content: input.content ?? null,
      languageCode: input.languageCode ?? null,
      level: input.level ?? 'BEGINNER',
      ethnicGroup: input.ethnicGroup ?? null,
      authorityId: input.authorityId ?? null,
      authorAccountId: input.authorAccountId,
      mediaId: input.mediaId ?? null,
      isTicketed: input.isTicketed ?? false,
      liveSessionId: input.liveSessionId ?? null,
      visibilityScope: input.visibilityScope ?? 'PUBLIC',
      moderationStatus: input.moderationStatus ?? 'PENDING',
      position: input.position ?? 0,
      createdAt: input.createdAt ?? now,
      updatedAt: input.updatedAt ?? now,
      deletedAt: input.deletedAt ?? null,
    };
    db.lessons.push(lesson);
    return lesson;
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

    tourismPlace: {
      create: jest.fn().mockImplementation(({ data }: { data: Where }) => {
        const place = seedPlace({
          name: data.name as string,
          description: (data.description as string | null) ?? null,
          region: (data.region as string | null) ?? null,
          category: (data.category as MockTourismCategory) ?? 'OTHER',
          latitude: (data.latitude as number | null) ?? null,
          longitude: (data.longitude as number | null) ?? null,
          source: (data.source as MockTourismSource) ?? 'COMMUNITY',
          sourceRef: (data.sourceRef as string | null) ?? null,
          verified: (data.verified as boolean) ?? false,
          verifiedByAccountId:
            (data.verifiedByAccountId as string | null) ?? null,
          mediaId: (data.mediaId as string | null) ?? null,
          submittedByAccountId:
            (data.submittedByAccountId as string | null) ?? null,
          visibilityScope:
            (data.visibilityScope as MockVisibilityScope) ?? 'PUBLIC',
        });
        return Promise.resolve({ ...place });
      }),

      findFirst: jest
        .fn()
        .mockImplementation(({ where = {} }: { where?: Where }) => {
          const match = db.places.find((p) => whereMatches(p, where));
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
            let rows = db.places.filter((p) => whereMatches(p, where));
            rows = applyOrderBy(rows, orderBy);
            if (typeof skip === 'number') rows = rows.slice(skip);
            if (typeof take === 'number') rows = rows.slice(0, take);
            return Promise.resolve(rows.map((p) => ({ ...p })));
          },
        ),

      update: jest
        .fn()
        .mockImplementation(
          ({ where, data }: { where: { id: string }; data: Where }) => {
            const place = db.places.find((p) => p.id === where.id);
            if (!place) return Promise.resolve(null);
            Object.assign(place, data, { updatedAt: nextTime() });
            return Promise.resolve({ ...place });
          },
        ),
    },

    learningLesson: {
      create: jest.fn().mockImplementation(({ data }: { data: Where }) => {
        const lesson = seedLesson({
          authorAccountId: data.authorAccountId as string,
          title: data.title as string,
          description: (data.description as string | null) ?? null,
          content: (data.content as string | null) ?? null,
          languageCode: (data.languageCode as string | null) ?? null,
          level: (data.level as MockLearningLevel) ?? 'BEGINNER',
          ethnicGroup: (data.ethnicGroup as string | null) ?? null,
          authorityId: (data.authorityId as string | null) ?? null,
          mediaId: (data.mediaId as string | null) ?? null,
          isTicketed: (data.isTicketed as boolean) ?? false,
          liveSessionId: (data.liveSessionId as string | null) ?? null,
          visibilityScope:
            (data.visibilityScope as MockVisibilityScope) ?? 'PUBLIC',
          moderationStatus:
            (data.moderationStatus as MockModerationStatus) ?? 'PENDING',
          position: (data.position as number) ?? 0,
        });
        return Promise.resolve({ ...lesson });
      }),

      findFirst: jest
        .fn()
        .mockImplementation(({ where = {} }: { where?: Where }) => {
          const match = db.lessons.find((l) => whereMatches(l, where));
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
            let rows = db.lessons.filter((l) => whereMatches(l, where));
            rows = applyOrderBy(rows, orderBy);
            if (typeof skip === 'number') rows = rows.slice(skip);
            if (typeof take === 'number') rows = rows.slice(0, take);
            return Promise.resolve(rows.map((l) => ({ ...l })));
          },
        ),

      update: jest
        .fn()
        .mockImplementation(
          ({ where, data }: { where: { id: string }; data: Where }) => {
            const lesson = db.lessons.find((l) => l.id === where.id);
            if (!lesson) return Promise.resolve(null);
            Object.assign(lesson, data, { updatedAt: nextTime() });
            return Promise.resolve({ ...lesson });
          },
        ),
    },

    lessonEnrollment: {
      findFirst: jest
        .fn()
        .mockImplementation(({ where = {} }: { where?: Where }) => {
          const match = db.enrollments.find((e) => whereMatches(e, where));
          return Promise.resolve(match ? { ...match } : null);
        }),

      findMany: jest
        .fn()
        .mockImplementation(
          ({
            where = {},
            orderBy,
          }: {
            where?: Where;
            orderBy?: OrderBy | OrderBy[];
          }) => {
            let rows = db.enrollments.filter((e) => whereMatches(e, where));
            rows = applyOrderBy(rows, orderBy);
            return Promise.resolve(rows.map((e) => ({ ...e })));
          },
        ),

      create: jest.fn().mockImplementation(({ data }: { data: Where }) => {
        const now = nextTime();
        const enrollment: MockLessonEnrollment = {
          id: randomUUID(),
          lessonId: data.lessonId as string,
          accountId: data.accountId as string,
          progressPercent: (data.progressPercent as number) ?? 0,
          completedAt: (data.completedAt as Date | null) ?? null,
          createdAt: now,
          updatedAt: now,
        };
        db.enrollments.push(enrollment);
        return Promise.resolve({ ...enrollment });
      }),

      update: jest
        .fn()
        .mockImplementation(
          ({ where, data }: { where: { id: string }; data: Where }) => {
            const enrollment = db.enrollments.find((e) => e.id === where.id);
            if (!enrollment) return Promise.resolve(null);
            Object.assign(enrollment, data, { updatedAt: nextTime() });
            return Promise.resolve({ ...enrollment });
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
    },
  };

  return {
    db,
    seedAccount,
    seedAuthority,
    seedPlace,
    seedLesson,
    prisma,
  };
}
