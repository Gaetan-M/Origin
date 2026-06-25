/**
 * In-memory PrismaService test double for the life-events + family-feed flows.
 *
 * Mirrors the auth.e2e mock philosophy: every Prisma call used by the
 * life-events / family-feed code paths is intercepted and backed by plain
 * arrays/maps, so specs exercise the REAL NestJS pipeline + REAL services
 * (FamilyFeedService, GraphDegreeService, the life-event fan-out handler) with
 * only the database layer faked out.
 *
 * It deliberately supports exactly the accessors those code paths touch:
 *   - claim.findFirst                (resolve account -> claimed person node)
 *   - feedPost.create / findMany     (write + degree-bounded read)
 *   - feedReaction.create / findFirst / findMany / update
 *   - feedComment.create / findMany / update
 *   - lifeEvent.create / findUnique
 *   - person.update / findUnique / findMany   (life_status flip)
 *   - parentChild.findMany           (GraphDegreeService BFS)
 *   - unionPartner.findMany          (GraphDegreeService BFS)
 *   - contribution.create            (mandatory audit trail)
 *   - account.findUnique             (JwtStrategy, when the real guard is used)
 *   - $transaction                   (callback + array forms)
 *
 * Helper seeders (seedPerson / seedClaim / addParentChild / addUnion) let a
 * spec build a small slice of the global graph, and the public stores
 * (`db`) let assertions read back audit rows / mutated persons directly.
 *
 * NOTE: this is a test utility, not production code — but it still honours the
 * project's no-`any` rule and snake_case-on-the-wire / camelCase-in-client
 * conventions (the Prisma client always speaks camelCase).
 */
import { randomUUID } from 'crypto';

export type MockLifeStatus = 'ALIVE' | 'DECEASED' | 'UNKNOWN';
export type MockVisibilityScope = 'PRIVATE_SELF' | 'FAMILY' | 'PUBLIC';

export interface MockPerson {
  id: string;
  displayName: string;
  lifeStatus: MockLifeStatus;
  deceasedDate: Date | null;
  deletedAt: Date | null;
  [key: string]: unknown;
}

export interface MockClaim {
  id: string;
  accountId: string;
  personId: string;
  status: string;
}

export interface MockParentChild {
  id: string;
  parentId: string;
  childId: string;
  deletedAt: Date | null;
}

export interface MockUnion {
  id: string;
  deletedAt: Date | null;
}

export interface MockUnionPartner {
  id: string;
  unionId: string;
  personId: string;
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

export interface MockFeedReaction {
  id: string;
  feedPostId: string;
  accountId: string;
  reactionType: string;
  createdAt: Date;
  deletedAt: Date | null;
}

export interface MockFeedComment {
  id: string;
  feedPostId: string;
  accountId: string;
  body: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface MockLifeEvent {
  id: string;
  kind: string;
  primaryPersonId: string;
  unionId: string | null;
  occurredAt: Date | null;
  createdByAccountId: string;
  visibilityScope: MockVisibilityScope;
  visibleMaxDegree: number | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  [key: string]: unknown;
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
  createdAt: Date;
}

export interface MockAccount {
  id: string;
  phoneNumber: string;
  isActive: boolean;
  isBanned: boolean;
  deletedAt: Date | null;
  role: string;
}

export interface MockDb {
  persons: Map<string, MockPerson>;
  claims: MockClaim[];
  parentChild: MockParentChild[];
  unions: Map<string, MockUnion>;
  unionPartners: MockUnionPartner[];
  feedPosts: MockFeedPost[];
  feedReactions: MockFeedReaction[];
  feedComments: MockFeedComment[];
  lifeEvents: MockLifeEvent[];
  contributions: MockContribution[];
  accounts: Map<string, MockAccount>;
}

type Where = Record<string, unknown>;

function inList(constraint: unknown): string[] | null {
  if (
    constraint !== null &&
    typeof constraint === 'object' &&
    Array.isArray((constraint as { in?: unknown[] }).in)
  ) {
    return (constraint as { in: string[] }).in;
  }
  return null;
}

/** Evaluate FamilyFeedService's keyset OR clause against a post. */
function matchesKeyset(post: MockFeedPost, or: unknown): boolean {
  if (!Array.isArray(or)) {
    return true;
  }
  return (or as Where[]).some((clause) => {
    const createdAt = clause.createdAt;
    // { createdAt: { lt: Date } }
    if (
      createdAt !== null &&
      typeof createdAt === 'object' &&
      'lt' in (createdAt as Record<string, unknown>)
    ) {
      const lt = (createdAt as { lt: Date }).lt;
      return post.createdAt.getTime() < new Date(lt).getTime();
    }
    // { createdAt: Date, id: { lt: string } }
    if (createdAt instanceof Date || typeof createdAt === 'string') {
      const sameInstant =
        post.createdAt.getTime() === new Date(createdAt as Date).getTime();
      const idClause = clause.id as { lt?: string } | undefined;
      if (sameInstant && idClause && typeof idClause.lt === 'string') {
        return post.id < idClause.lt;
      }
    }
    return false;
  });
}

export interface FeedPrismaMock {
  db: MockDb;
  seedPerson(input?: Partial<MockPerson>): MockPerson;
  seedAccount(input?: Partial<MockAccount>): MockAccount;
  seedClaim(accountId: string, personId: string, status?: string): MockClaim;
  addParentChild(parentId: string, childId: string): MockParentChild;
  addUnion(personIds: string[]): MockUnion;
  prisma: Record<string, unknown>;
}

/**
 * Build a fresh in-memory PrismaService double + seed helpers.
 */
export function createFeedPrismaMock(): FeedPrismaMock {
  const db: MockDb = {
    persons: new Map(),
    claims: [],
    parentChild: [],
    unions: new Map(),
    unionPartners: [],
    feedPosts: [],
    feedReactions: [],
    feedComments: [],
    lifeEvents: [],
    contributions: [],
    accounts: new Map(),
  };

  // ---- seed helpers ------------------------------------------------------
  function seedPerson(input: Partial<MockPerson> = {}): MockPerson {
    const person: MockPerson = {
      id: input.id ?? randomUUID(),
      displayName: input.displayName ?? 'Test Person',
      lifeStatus: input.lifeStatus ?? 'ALIVE',
      deceasedDate: input.deceasedDate ?? null,
      deletedAt: input.deletedAt ?? null,
      ...input,
    };
    db.persons.set(person.id, person);
    return person;
  }

  function seedAccount(input: Partial<MockAccount> = {}): MockAccount {
    const account: MockAccount = {
      id: input.id ?? randomUUID(),
      phoneNumber: input.phoneNumber ?? '+237600000000',
      isActive: input.isActive ?? true,
      isBanned: input.isBanned ?? false,
      deletedAt: input.deletedAt ?? null,
      role: input.role ?? 'USER',
    };
    db.accounts.set(account.id, account);
    return account;
  }

  function seedClaim(
    accountId: string,
    personId: string,
    status = 'VERIFIED',
  ): MockClaim {
    const claim: MockClaim = { id: randomUUID(), accountId, personId, status };
    db.claims.push(claim);
    return claim;
  }

  function addParentChild(parentId: string, childId: string): MockParentChild {
    const edge: MockParentChild = {
      id: randomUUID(),
      parentId,
      childId,
      deletedAt: null,
    };
    db.parentChild.push(edge);
    return edge;
  }

  function addUnion(personIds: string[]): MockUnion {
    const union: MockUnion = { id: randomUUID(), deletedAt: null };
    db.unions.set(union.id, union);
    for (const personId of personIds) {
      db.unionPartners.push({ id: randomUUID(), unionId: union.id, personId });
    }
    return union;
  }

  // ---- prisma accessors --------------------------------------------------
  const prisma: Record<string, unknown> = {
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
    onModuleInit: jest.fn().mockResolvedValue(undefined),
    onModuleDestroy: jest.fn().mockResolvedValue(undefined),

    // Both forms: $transaction(cb) and $transaction([p1, p2]).
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

    claim: {
      findFirst: jest.fn().mockImplementation(({ where }: { where: Where }) => {
        const match = db.claims.find(
          (c) =>
            (where.accountId ? c.accountId === where.accountId : true) &&
            (where.status ? c.status === where.status : true) &&
            (where.personId ? c.personId === where.personId : true),
        );
        if (!match) return Promise.resolve(null);
        return Promise.resolve({ personId: match.personId, ...match });
      }),
    },

    feedPost: {
      create: jest.fn().mockImplementation(({ data }: { data: Where }) => {
        const now = new Date();
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

      findUnique: jest
        .fn()
        .mockImplementation(({ where }: { where: { id: string } }) => {
          const post = db.feedPosts.find(
            (p) => p.id === where.id && p.deletedAt === null,
          );
          return Promise.resolve(post ? { ...post } : null);
        }),

      findMany: jest
        .fn()
        .mockImplementation(
          ({
            where = {},
            take,
          }: {
            where?: Where;
            take?: number;
          }) => {
            const scopes = inList(where.visibilityScope);
            let rows = db.feedPosts.filter((p) => {
              if (where.deletedAt === null && p.deletedAt !== null) return false;
              if (scopes && !scopes.includes(p.visibilityScope)) return false;
              if (where.OR && !matchesKeyset(p, where.OR)) return false;
              return true;
            });
            rows = rows.sort((a, b) => {
              const t = b.createdAt.getTime() - a.createdAt.getTime();
              return t !== 0 ? t : b.id.localeCompare(a.id);
            });
            if (typeof take === 'number') rows = rows.slice(0, take);
            return Promise.resolve(rows.map((p) => ({ ...p })));
          },
        ),

      update: jest
        .fn()
        .mockImplementation(
          ({ where, data }: { where: { id: string }; data: Where }) => {
            const post = db.feedPosts.find((p) => p.id === where.id);
            if (!post) return Promise.resolve(null);
            Object.assign(post, data, { updatedAt: new Date() });
            return Promise.resolve({ ...post });
          },
        ),
    },

    feedReaction: {
      create: jest.fn().mockImplementation(({ data }: { data: Where }) => {
        const reaction: MockFeedReaction = {
          id: randomUUID(),
          feedPostId: data.feedPostId as string,
          accountId: data.accountId as string,
          reactionType: data.reactionType as string,
          createdAt: new Date(),
          deletedAt: null,
        };
        db.feedReactions.push(reaction);
        return Promise.resolve({ ...reaction });
      }),

      findFirst: jest.fn().mockImplementation(({ where }: { where: Where }) => {
        const match = db.feedReactions.find(
          (r) =>
            (where.feedPostId ? r.feedPostId === where.feedPostId : true) &&
            (where.accountId ? r.accountId === where.accountId : true) &&
            (where.reactionType
              ? r.reactionType === where.reactionType
              : true) &&
            (where.deletedAt === null ? r.deletedAt === null : true),
        );
        return Promise.resolve(match ? { ...match } : null);
      }),

      findMany: jest.fn().mockImplementation(({ where = {} }: { where?: Where }) => {
        const rows = db.feedReactions.filter(
          (r) =>
            (where.feedPostId ? r.feedPostId === where.feedPostId : true) &&
            (where.deletedAt === null ? r.deletedAt === null : true),
        );
        return Promise.resolve(rows.map((r) => ({ ...r })));
      }),

      update: jest
        .fn()
        .mockImplementation(
          ({ where, data }: { where: { id: string }; data: Where }) => {
            const reaction = db.feedReactions.find((r) => r.id === where.id);
            if (!reaction) return Promise.resolve(null);
            Object.assign(reaction, data);
            return Promise.resolve({ ...reaction });
          },
        ),

      delete: jest
        .fn()
        .mockImplementation(({ where }: { where: { id: string } }) => {
          const idx = db.feedReactions.findIndex((r) => r.id === where.id);
          if (idx === -1) return Promise.resolve(null);
          const [removed] = db.feedReactions.splice(idx, 1);
          return Promise.resolve(removed);
        }),
    },

    feedComment: {
      create: jest.fn().mockImplementation(({ data }: { data: Where }) => {
        const now = new Date();
        const comment: MockFeedComment = {
          id: randomUUID(),
          feedPostId: data.feedPostId as string,
          accountId: data.accountId as string,
          body: data.body as string,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        };
        db.feedComments.push(comment);
        return Promise.resolve({ ...comment });
      }),

      findMany: jest.fn().mockImplementation(({ where = {} }: { where?: Where }) => {
        const rows = db.feedComments.filter(
          (c) =>
            (where.feedPostId ? c.feedPostId === where.feedPostId : true) &&
            (where.deletedAt === null ? c.deletedAt === null : true),
        );
        return Promise.resolve(rows.map((c) => ({ ...c })));
      }),

      update: jest
        .fn()
        .mockImplementation(
          ({ where, data }: { where: { id: string }; data: Where }) => {
            const comment = db.feedComments.find((c) => c.id === where.id);
            if (!comment) return Promise.resolve(null);
            Object.assign(comment, data, { updatedAt: new Date() });
            return Promise.resolve({ ...comment });
          },
        ),
    },

    lifeEvent: {
      create: jest.fn().mockImplementation(({ data }: { data: Where }) => {
        const now = new Date();
        const event: MockLifeEvent = {
          id: randomUUID(),
          kind: data.kind as string,
          primaryPersonId:
            (data.primaryPersonId as string) ??
            (data.primary_person_id as string),
          unionId: (data.unionId as string | null) ?? null,
          occurredAt: (data.occurredAt as Date | null) ?? null,
          createdByAccountId:
            (data.createdByAccountId as string) ??
            (data.created_by_account_id as string),
          visibilityScope:
            (data.visibilityScope as MockVisibilityScope) ?? 'FAMILY',
          visibleMaxDegree: (data.visibleMaxDegree as number | null) ?? null,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
          ...data,
        };
        db.lifeEvents.push(event);
        return Promise.resolve({ ...event });
      }),

      findUnique: jest
        .fn()
        .mockImplementation(({ where }: { where: { id: string } }) => {
          const event = db.lifeEvents.find((e) => e.id === where.id);
          return Promise.resolve(event ? { ...event } : null);
        }),
    },

    person: {
      findUnique: jest
        .fn()
        .mockImplementation(({ where }: { where: { id: string } }) => {
          const person = db.persons.get(where.id);
          return Promise.resolve(person ? { ...person } : null);
        }),

      findMany: jest.fn().mockImplementation(({ where = {} }: { where?: Where }) => {
        const ids = inList(where.id);
        let rows = [...db.persons.values()];
        if (ids) rows = rows.filter((p) => ids.includes(p.id));
        if (where.deletedAt === null) rows = rows.filter((p) => p.deletedAt === null);
        return Promise.resolve(rows.map((p) => ({ ...p })));
      }),

      update: jest
        .fn()
        .mockImplementation(
          ({ where, data }: { where: { id: string }; data: Where }) => {
            const person = db.persons.get(where.id);
            if (!person) return Promise.resolve(null);
            Object.assign(person, data);
            return Promise.resolve({ ...person });
          },
        ),
    },

    parentChild: {
      findMany: jest.fn().mockImplementation(({ where = {} }: { where?: Where }) => {
        const parentIds = inList(where.parentId);
        const childIds = inList(where.childId);
        const rows = db.parentChild.filter((e) => {
          if (e.deletedAt !== null) return false;
          if (parentIds && !parentIds.includes(e.parentId)) return false;
          if (childIds && !childIds.includes(e.childId)) return false;
          if (!parentIds && !childIds) return false;
          return true;
        });
        return Promise.resolve(
          rows.map((e) => ({ childId: e.childId, parentId: e.parentId })),
        );
      }),
    },

    unionPartner: {
      findMany: jest.fn().mockImplementation(({ where = {} }: { where?: Where }) => {
        const personIds = inList(where.personId);
        const unionIds = inList(where.unionId);
        if (personIds) {
          // Only unions that are not soft-deleted (where.union.deletedAt === null)
          const rows = db.unionPartners.filter((p) => {
            if (!personIds.includes(p.personId)) return false;
            const union = db.unions.get(p.unionId);
            return union !== undefined && union.deletedAt === null;
          });
          return Promise.resolve(rows.map((p) => ({ unionId: p.unionId })));
        }
        if (unionIds) {
          const rows = db.unionPartners.filter((p) =>
            unionIds.includes(p.unionId),
          );
          return Promise.resolve(rows.map((p) => ({ personId: p.personId })));
        }
        return Promise.resolve([]);
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
          createdAt: new Date(),
        };
        db.contributions.push(contribution);
        return Promise.resolve({ ...contribution });
      }),

      findMany: jest.fn().mockImplementation(({ where = {} }: { where?: Where }) => {
        const rows = db.contributions.filter(
          (c) =>
            (where.entityType ? c.entityType === where.entityType : true) &&
            (where.entityId ? c.entityId === where.entityId : true) &&
            (where.accountId ? c.accountId === where.accountId : true),
        );
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
    },
  };

  return {
    db,
    seedPerson,
    seedAccount,
    seedClaim,
    addParentChild,
    addUnion,
    prisma,
  };
}
