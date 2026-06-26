/**
 * In-memory PrismaService test double for the Phase-3 "Sommes-nous parents ?"
 * (kinship-check) consent + compute flow.
 *
 * Sibling to feed-prisma-mock.ts (intentionally NOT shared/edited): it backs
 * exactly the Prisma accessors the kinship-check code paths touch with plain
 * arrays/maps, so specs can drive the REAL GraphDegreeService +
 * RelationshipLabelService over a small slice of the unified family graph while
 * faking only the database layer.
 *
 * Accessors supported:
 *   - kinshipCheck.create / findUnique / findMany / update
 *   - claim.findFirst            (resolve account -> VERIFIED person node)
 *   - account.findUnique
 *   - parentChild.findMany       (GraphDegreeService BFS)
 *   - unionPartner.findMany      (GraphDegreeService BFS)
 *   - contribution.create        (mandatory audit trail)
 *   - $transaction               (callback + array forms)
 *
 * Honours the no-`any` rule and the camelCase-in-client convention (the Prisma
 * client always speaks camelCase even though DB columns are snake_case).
 */
import { randomUUID } from 'crypto';

export type MockKinshipCheckStatus =
  | 'PENDING_CONSENT'
  | 'CONSENTED'
  | 'DECLINED'
  | 'COMPUTED'
  | 'EXPIRED'
  | 'CANCELLED';

export interface MockKinPerson {
  id: string;
  displayName: string;
  deletedAt: Date | null;
  [key: string]: unknown;
}

export interface MockKinClaim {
  id: string;
  accountId: string;
  personId: string;
  status: string;
  deletedAt: Date | null;
}

export interface MockKinParentChild {
  id: string;
  parentId: string;
  childId: string;
  deletedAt: Date | null;
}

export interface MockKinUnion {
  id: string;
  deletedAt: Date | null;
}

export interface MockKinUnionPartner {
  id: string;
  unionId: string;
  personId: string;
}

export interface MockKinAccount {
  id: string;
  phoneNumber: string;
  fullName: string | null;
  isActive: boolean;
  isBanned: boolean;
  deletedAt: Date | null;
  role: string;
}

export interface MockKinshipCheck {
  id: string;
  requesterAccountId: string;
  targetAccountId: string | null;
  targetPhone: string | null;
  status: MockKinshipCheckStatus;
  requesterConsent: boolean;
  targetConsent: boolean;
  resultDegree: number | null;
  resultRelated: boolean | null;
  resultLabelFr: string | null;
  resultLabelEn: string | null;
  computedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface MockKinContribution {
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

export interface MockKinDb {
  persons: Map<string, MockKinPerson>;
  claims: MockKinClaim[];
  parentChild: MockKinParentChild[];
  unions: Map<string, MockKinUnion>;
  unionPartners: MockKinUnionPartner[];
  accounts: Map<string, MockKinAccount>;
  kinshipChecks: MockKinshipCheck[];
  contributions: MockKinContribution[];
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

export interface KinshipPrismaMock {
  db: MockKinDb;
  seedPerson(input?: Partial<MockKinPerson>): MockKinPerson;
  seedAccount(input?: Partial<MockKinAccount>): MockKinAccount;
  seedClaim(
    accountId: string,
    personId: string,
    status?: string,
  ): MockKinClaim;
  addParentChild(parentId: string, childId: string): MockKinParentChild;
  addUnion(personIds: string[]): MockKinUnion;
  prisma: Record<string, unknown>;
}

/**
 * Build a fresh in-memory PrismaService double + seed helpers for kinship-check
 * specs.
 */
export function createKinshipPrismaMock(): KinshipPrismaMock {
  const db: MockKinDb = {
    persons: new Map(),
    claims: [],
    parentChild: [],
    unions: new Map(),
    unionPartners: [],
    accounts: new Map(),
    kinshipChecks: [],
    contributions: [],
  };

  // ---- seed helpers ------------------------------------------------------
  function seedPerson(input: Partial<MockKinPerson> = {}): MockKinPerson {
    const person: MockKinPerson = {
      id: input.id ?? randomUUID(),
      displayName: input.displayName ?? 'Test Person',
      deletedAt: input.deletedAt ?? null,
      ...input,
    };
    db.persons.set(person.id, person);
    return person;
  }

  function seedAccount(input: Partial<MockKinAccount> = {}): MockKinAccount {
    const account: MockKinAccount = {
      id: input.id ?? randomUUID(),
      phoneNumber: input.phoneNumber ?? '+237600000000',
      fullName: input.fullName ?? null,
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
  ): MockKinClaim {
    const claim: MockKinClaim = {
      id: randomUUID(),
      accountId,
      personId,
      status,
      deletedAt: null,
    };
    db.claims.push(claim);
    return claim;
  }

  function addParentChild(
    parentId: string,
    childId: string,
  ): MockKinParentChild {
    const edge: MockKinParentChild = {
      id: randomUUID(),
      parentId,
      childId,
      deletedAt: null,
    };
    db.parentChild.push(edge);
    return edge;
  }

  function addUnion(personIds: string[]): MockKinUnion {
    const union: MockKinUnion = { id: randomUUID(), deletedAt: null };
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
            (where.personId ? c.personId === where.personId : true) &&
            (where.deletedAt === null ? c.deletedAt === null : true),
        );
        return Promise.resolve(match ? { ...match } : null);
      }),
    },

    account: {
      findUnique: jest
        .fn()
        .mockImplementation(({ where }: { where: { id?: string; phoneNumber?: string } }) => {
          let account: MockKinAccount | undefined;
          if (where.id) {
            account = db.accounts.get(where.id);
          } else if (where.phoneNumber) {
            account = [...db.accounts.values()].find(
              (a) => a.phoneNumber === where.phoneNumber,
            );
          }
          return Promise.resolve(account ? { ...account } : null);
        }),
    },

    parentChild: {
      findMany: jest
        .fn()
        .mockImplementation(({ where = {} }: { where?: Where }) => {
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
      findMany: jest
        .fn()
        .mockImplementation(({ where = {} }: { where?: Where }) => {
          const personIds = inList(where.personId);
          const unionIds = inList(where.unionId);
          if (personIds) {
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

    kinshipCheck: {
      create: jest.fn().mockImplementation(({ data }: { data: Where }) => {
        const now = new Date();
        const check: MockKinshipCheck = {
          id: randomUUID(),
          requesterAccountId: data.requesterAccountId as string,
          targetAccountId: (data.targetAccountId as string | null) ?? null,
          targetPhone: (data.targetPhone as string | null) ?? null,
          status: (data.status as MockKinshipCheckStatus) ?? 'PENDING_CONSENT',
          requesterConsent: (data.requesterConsent as boolean) ?? true,
          targetConsent: (data.targetConsent as boolean) ?? false,
          resultDegree: (data.resultDegree as number | null) ?? null,
          resultRelated: (data.resultRelated as boolean | null) ?? null,
          resultLabelFr: (data.resultLabelFr as string | null) ?? null,
          resultLabelEn: (data.resultLabelEn as string | null) ?? null,
          computedAt: (data.computedAt as Date | null) ?? null,
          expiresAt: (data.expiresAt as Date | null) ?? null,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        };
        db.kinshipChecks.push(check);
        return Promise.resolve({ ...check });
      }),

      findUnique: jest
        .fn()
        .mockImplementation(({ where }: { where: { id: string } }) => {
          const check = db.kinshipChecks.find(
            (c) => c.id === where.id && c.deletedAt === null,
          );
          return Promise.resolve(check ? { ...check } : null);
        }),

      findMany: jest
        .fn()
        .mockImplementation(({ where = {} }: { where?: Where }) => {
          const rows = db.kinshipChecks.filter((c) => {
            if (where.deletedAt === null && c.deletedAt !== null) return false;
            if (
              where.requesterAccountId &&
              c.requesterAccountId !== where.requesterAccountId
            ) {
              return false;
            }
            if (
              where.targetAccountId &&
              c.targetAccountId !== where.targetAccountId
            ) {
              return false;
            }
            if (where.status && c.status !== where.status) return false;
            return true;
          });
          return Promise.resolve(rows.map((c) => ({ ...c })));
        }),

      update: jest
        .fn()
        .mockImplementation(
          ({ where, data }: { where: { id: string }; data: Where }) => {
            const check = db.kinshipChecks.find((c) => c.id === where.id);
            if (!check) return Promise.resolve(null);
            Object.assign(check, data, { updatedAt: new Date() });
            return Promise.resolve({ ...check });
          },
        ),
    },

    contribution: {
      create: jest.fn().mockImplementation(({ data }: { data: Where }) => {
        const contribution: MockKinContribution = {
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
