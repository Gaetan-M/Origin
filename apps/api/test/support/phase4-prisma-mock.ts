/**
 * In-memory PrismaService test double for the Phase 4 "Living Memory" flows
 * (Albums, Memorial tributes, Oral history / Source).
 *
 * Philosophy mirrors the existing feed/cultural/kinship mocks: every Prisma
 * call exercised by the Phase 4 code paths is intercepted and backed by plain
 * arrays/maps, so specs run the REAL GraphDegreeService (degree-bounded FAMILY
 * visibility) with only the database layer faked out. It is intentionally a
 * SEPARATE helper from feed-prisma-mock.ts — Phase 4 owns its own seam and
 * must not edit the existing helpers (parallel-safe rule).
 *
 * Supported accessors (exactly the ones the Phase 4 services + GraphDegree BFS
 * touch):
 *   - album.create / findUnique / findMany / update
 *   - albumItem.create / findMany / update
 *   - memorialTribute.create / findMany / update
 *   - source.create / findUnique / findMany / update      (oral history)
 *   - person.findUnique / findMany / update               (life_status gate)
 *   - claim.findFirst                                      (account -> person node)
 *   - parentChild.findMany / unionPartner.findMany         (GraphDegreeService BFS)
 *   - contribution.create / findMany                       (mandatory audit)
 *   - media.findUnique                                     (referenced media_id)
 *   - account.findUnique
 *   - $transaction (callback + array forms)
 *
 * No-`any` rule honoured: the Prisma client always speaks camelCase; columns
 * are snake_case only in schema.prisma (@map). Test utility, not prod code.
 */
import { randomUUID } from 'crypto';

export type MockLifeStatus = 'ALIVE' | 'DECEASED' | 'UNKNOWN';
export type MockVisibilityScope = 'PRIVATE_SELF' | 'FAMILY' | 'PUBLIC';
export type MockAlbumKind = 'PERSONAL' | 'FAMILY' | 'EVENT';
export type MockTributeKind = 'CANDLE' | 'MESSAGE' | 'PHOTO' | 'VIDEO';

export interface MockPerson {
  id: string;
  displayName: string;
  lifeStatus: MockLifeStatus;
  deceasedAssumed: boolean;
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

export interface MockMedia {
  id: string;
  fileType: string;
  deletedAt: Date | null;
}

export interface MockAlbum {
  id: string;
  subjectPersonId: string | null;
  ownerAccountId: string;
  title: string;
  description: string | null;
  kind: MockAlbumKind;
  coverMediaId: string | null;
  visibilityScope: MockVisibilityScope;
  visibleMaxDegree: number | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface MockAlbumItem {
  id: string;
  albumId: string;
  mediaId: string;
  caption: string | null;
  takenAt: Date | null;
  takenAtText: string | null;
  position: number;
  createdAt: Date;
  deletedAt: Date | null;
}

export interface MockMemorialTribute {
  id: string;
  personId: string;
  authorAccountId: string;
  kind: MockTributeKind;
  message: string | null;
  mediaId: string | null;
  visibilityScope: MockVisibilityScope;
  visibleMaxDegree: number | null;
  createdAt: Date;
  deletedAt: Date | null;
}

export interface MockSource {
  id: string;
  personId: string | null;
  unionId: string | null;
  sourceType: string | null;
  title: string | null;
  description: string | null;
  mediaFileId: string | null;
  audioTranscript: string | null;
  addedByAccountId: string | null;
  visibilityScope: MockVisibilityScope;
  visibleMaxDegree: number | null;
  createdAt: Date;
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
  media: Map<string, MockMedia>;
  albums: MockAlbum[];
  albumItems: MockAlbumItem[];
  memorialTributes: MockMemorialTribute[];
  sources: MockSource[];
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

/** Reads an orderBy direction for `position` (asc default) from a findMany arg. */
function positionAsc(orderBy: unknown): boolean {
  if (Array.isArray(orderBy)) {
    const clause = orderBy.find(
      (o) => o !== null && typeof o === 'object' && 'position' in o,
    ) as { position?: string } | undefined;
    return clause?.position !== 'desc';
  }
  if (orderBy !== null && typeof orderBy === 'object' && 'position' in orderBy) {
    return (orderBy as { position?: string }).position !== 'desc';
  }
  return true;
}

export interface Phase4PrismaMock {
  db: MockDb;
  seedPerson(input?: Partial<MockPerson>): MockPerson;
  seedAccount(input?: Partial<MockAccount>): MockAccount;
  seedClaim(accountId: string, personId: string, status?: string): MockClaim;
  seedMedia(input?: Partial<MockMedia>): MockMedia;
  addParentChild(parentId: string, childId: string): MockParentChild;
  addUnion(personIds: string[]): MockUnion;
  prisma: Record<string, unknown>;
}

/**
 * Build a fresh in-memory PrismaService double + seed helpers for Phase 4.
 */
export function createPhase4PrismaMock(): Phase4PrismaMock {
  const db: MockDb = {
    persons: new Map(),
    claims: [],
    parentChild: [],
    unions: new Map(),
    unionPartners: [],
    media: new Map(),
    albums: [],
    albumItems: [],
    memorialTributes: [],
    sources: [],
    contributions: [],
    accounts: new Map(),
  };

  // ---- seed helpers ------------------------------------------------------
  function seedPerson(input: Partial<MockPerson> = {}): MockPerson {
    const person: MockPerson = {
      id: input.id ?? randomUUID(),
      displayName: input.displayName ?? 'Test Person',
      lifeStatus: input.lifeStatus ?? 'ALIVE',
      deceasedAssumed: input.deceasedAssumed ?? false,
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

  function seedMedia(input: Partial<MockMedia> = {}): MockMedia {
    const media: MockMedia = {
      id: input.id ?? randomUUID(),
      fileType: input.fileType ?? 'photo',
      deletedAt: input.deletedAt ?? null,
    };
    db.media.set(media.id, media);
    return media;
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
        return Promise.resolve(match ? { ...match } : null);
      }),
    },

    person: {
      findUnique: jest
        .fn()
        .mockImplementation(({ where }: { where: { id: string } }) => {
          const person = db.persons.get(where.id);
          return Promise.resolve(person ? { ...person } : null);
        }),

      findMany: jest
        .fn()
        .mockImplementation(({ where = {} }: { where?: Where }) => {
          const ids = inList(where.id);
          let rows = [...db.persons.values()];
          if (ids) rows = rows.filter((p) => ids.includes(p.id));
          if (where.deletedAt === null)
            rows = rows.filter((p) => p.deletedAt === null);
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

    media: {
      findUnique: jest
        .fn()
        .mockImplementation(({ where }: { where: { id: string } }) => {
          const media = db.media.get(where.id);
          return Promise.resolve(media ? { ...media } : null);
        }),
    },

    album: {
      create: jest.fn().mockImplementation(({ data }: { data: Where }) => {
        const now = new Date();
        const album: MockAlbum = {
          id: randomUUID(),
          subjectPersonId: (data.subjectPersonId as string | null) ?? null,
          ownerAccountId: data.ownerAccountId as string,
          title: data.title as string,
          description: (data.description as string | null) ?? null,
          kind: (data.kind as MockAlbumKind) ?? 'PERSONAL',
          coverMediaId: (data.coverMediaId as string | null) ?? null,
          visibilityScope:
            (data.visibilityScope as MockVisibilityScope) ?? 'PRIVATE_SELF',
          visibleMaxDegree: (data.visibleMaxDegree as number | null) ?? null,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        };
        db.albums.push(album);
        return Promise.resolve({ ...album });
      }),

      findUnique: jest
        .fn()
        .mockImplementation(({ where }: { where: { id: string } }) => {
          const album = db.albums.find((a) => a.id === where.id);
          return Promise.resolve(album ? { ...album } : null);
        }),

      findMany: jest
        .fn()
        .mockImplementation(({ where = {} }: { where?: Where }) => {
          const scopes = inList(where.visibilityScope);
          const rows = db.albums.filter((a) => {
            if (where.deletedAt === null && a.deletedAt !== null) return false;
            if (where.ownerAccountId && a.ownerAccountId !== where.ownerAccountId)
              return false;
            if (
              where.subjectPersonId &&
              a.subjectPersonId !== where.subjectPersonId
            )
              return false;
            if (scopes && !scopes.includes(a.visibilityScope)) return false;
            if (
              !scopes &&
              where.visibilityScope &&
              a.visibilityScope !== where.visibilityScope
            )
              return false;
            return true;
          });
          return Promise.resolve(
            rows
              .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
              .map((a) => ({ ...a })),
          );
        }),

      update: jest
        .fn()
        .mockImplementation(
          ({ where, data }: { where: { id: string }; data: Where }) => {
            const album = db.albums.find((a) => a.id === where.id);
            if (!album) return Promise.resolve(null);
            Object.assign(album, data, { updatedAt: new Date() });
            return Promise.resolve({ ...album });
          },
        ),
    },

    albumItem: {
      create: jest.fn().mockImplementation(({ data }: { data: Where }) => {
        const item: MockAlbumItem = {
          id: randomUUID(),
          albumId: data.albumId as string,
          mediaId: data.mediaId as string,
          caption: (data.caption as string | null) ?? null,
          takenAt: (data.takenAt as Date | null) ?? null,
          takenAtText: (data.takenAtText as string | null) ?? null,
          position: (data.position as number | undefined) ?? 0,
          createdAt: new Date(),
          deletedAt: null,
        };
        db.albumItems.push(item);
        return Promise.resolve({ ...item });
      }),

      findMany: jest
        .fn()
        .mockImplementation(
          ({ where = {}, orderBy }: { where?: Where; orderBy?: unknown }) => {
            let rows = db.albumItems.filter((i) => {
              if (where.deletedAt === null && i.deletedAt !== null) return false;
              if (where.albumId && i.albumId !== where.albumId) return false;
              return true;
            });
            const asc = positionAsc(orderBy);
            rows = rows.sort((a, b) =>
              asc ? a.position - b.position : b.position - a.position,
            );
            return Promise.resolve(rows.map((i) => ({ ...i })));
          },
        ),

      update: jest
        .fn()
        .mockImplementation(
          ({ where, data }: { where: { id: string }; data: Where }) => {
            const item = db.albumItems.find((i) => i.id === where.id);
            if (!item) return Promise.resolve(null);
            Object.assign(item, data);
            return Promise.resolve({ ...item });
          },
        ),
    },

    memorialTribute: {
      create: jest.fn().mockImplementation(({ data }: { data: Where }) => {
        const tribute: MockMemorialTribute = {
          id: randomUUID(),
          personId: data.personId as string,
          authorAccountId: data.authorAccountId as string,
          kind: data.kind as MockTributeKind,
          message: (data.message as string | null) ?? null,
          mediaId: (data.mediaId as string | null) ?? null,
          visibilityScope:
            (data.visibilityScope as MockVisibilityScope) ?? 'FAMILY',
          visibleMaxDegree: (data.visibleMaxDegree as number | null) ?? null,
          createdAt: new Date(),
          deletedAt: null,
        };
        db.memorialTributes.push(tribute);
        return Promise.resolve({ ...tribute });
      }),

      findMany: jest
        .fn()
        .mockImplementation(({ where = {} }: { where?: Where }) => {
          const scopes = inList(where.visibilityScope);
          const rows = db.memorialTributes.filter((t) => {
            if (where.deletedAt === null && t.deletedAt !== null) return false;
            if (where.personId && t.personId !== where.personId) return false;
            if (
              where.authorAccountId &&
              t.authorAccountId !== where.authorAccountId
            )
              return false;
            if (scopes && !scopes.includes(t.visibilityScope)) return false;
            return true;
          });
          return Promise.resolve(
            rows
              .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
              .map((t) => ({ ...t })),
          );
        }),

      update: jest
        .fn()
        .mockImplementation(
          ({ where, data }: { where: { id: string }; data: Where }) => {
            const tribute = db.memorialTributes.find((t) => t.id === where.id);
            if (!tribute) return Promise.resolve(null);
            Object.assign(tribute, data);
            return Promise.resolve({ ...tribute });
          },
        ),
    },

    source: {
      create: jest.fn().mockImplementation(({ data }: { data: Where }) => {
        const source: MockSource = {
          id: randomUUID(),
          personId: (data.personId as string | null) ?? null,
          unionId: (data.unionId as string | null) ?? null,
          sourceType: (data.sourceType as string | null) ?? null,
          title: (data.title as string | null) ?? null,
          description: (data.description as string | null) ?? null,
          mediaFileId: (data.mediaFileId as string | null) ?? null,
          audioTranscript: (data.audioTranscript as string | null) ?? null,
          addedByAccountId: (data.addedByAccountId as string | null) ?? null,
          visibilityScope:
            (data.visibilityScope as MockVisibilityScope) ?? 'PRIVATE_SELF',
          visibleMaxDegree: (data.visibleMaxDegree as number | null) ?? null,
          createdAt: new Date(),
          deletedAt: null,
        };
        db.sources.push(source);
        return Promise.resolve({ ...source });
      }),

      findUnique: jest
        .fn()
        .mockImplementation(({ where }: { where: { id: string } }) => {
          const source = db.sources.find((s) => s.id === where.id);
          return Promise.resolve(source ? { ...source } : null);
        }),

      findMany: jest
        .fn()
        .mockImplementation(({ where = {} }: { where?: Where }) => {
          const scopes = inList(where.visibilityScope);
          const rows = db.sources.filter((s) => {
            if (where.deletedAt === null && s.deletedAt !== null) return false;
            if (where.personId && s.personId !== where.personId) return false;
            if (where.unionId && s.unionId !== where.unionId) return false;
            if (where.sourceType && s.sourceType !== where.sourceType)
              return false;
            if (scopes && !scopes.includes(s.visibilityScope)) return false;
            return true;
          });
          return Promise.resolve(
            rows
              .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
              .map((s) => ({ ...s })),
          );
        }),

      update: jest
        .fn()
        .mockImplementation(
          ({ where, data }: { where: { id: string }; data: Where }) => {
            const source = db.sources.find((s) => s.id === where.id);
            if (!source) return Promise.resolve(null);
            Object.assign(source, data);
            return Promise.resolve({ ...source });
          },
        ),
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

      findMany: jest
        .fn()
        .mockImplementation(({ where = {} }: { where?: Where }) => {
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
    seedMedia,
    addParentChild,
    addUnion,
    prisma,
  };
}
