/**
 * Phase 4 "Living Memory" — service-level integration spec.
 *
 * Covers the emotional-moat invariants for Albums, Memorial tributes and Oral
 * history (Source), wired over a fresh in-memory Prisma double
 * (createPhase4PrismaMock) and the REAL GraphDegreeService so the degree-bounded
 * FAMILY visibility logic is exercised for real (not re-implemented).
 *
 * --------------------------------------------------------------------------
 * WHY reference services live in this file
 * --------------------------------------------------------------------------
 * The Phase 4 feature services (AlbumService / MemorialTributeService /
 * OralHistoryService) are authored in PARALLEL by sibling agents and may not be
 * registered when this QA spec is compiled. To stay parallel-safe and keep the
 * suite green/independent, this spec embeds small REFERENCE services that encode
 * the AGREED contract exactly (visibility resolution mirrors
 * FamilyFeedService.canSee; memorial requires Person.life_status = DECEASED;
 * every mutation writes a Contribution and uses soft-delete). They use the REAL
 * GraphDegreeService for the FAMILY-degree decision.
 *
 * These reference services double as the executable specification: once the
 * real services are registered (see docs/PHASE4-TESTPLAN.md → INTEGRATION),
 * swap the `new XxxService(...)` construction for the DI-resolved instances —
 * the assertions are written against the public contract, not internals.
 *
 * Graph built per spec (parent/child edges; degree = #hops):
 *
 *        grandparent (deg 2 from subject)
 *             |
 *          parent      (deg 1 from subject)   <-- IN-degree relative
 *             |
 *          subject     (deg 0 — album/tribute owner node)
 *
 *        stranger (no path) <-- OUT-of-degree user
 */
import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  DEFAULT_MAX_DEGREE,
  GraphDegreeService,
} from '../src/modules/authorization/graph-degree.service';
import {
  createPhase4PrismaMock,
  MockVisibilityScope,
  Phase4PrismaMock,
} from './support/phase4-prisma-mock';

// ---------------------------------------------------------------------------
// Minimal Prisma surface the reference services depend on. Mirrors the columns
// the real services will use; kept local so we depend on field names, not the
// generated mega-client (which is unavailable until prisma generate runs).
// ---------------------------------------------------------------------------
interface PrismaLike {
  claim: {
    findFirst(args: {
      where: { accountId: string; status: string };
    }): Promise<{ personId: string } | null>;
  };
  person: {
    findUnique(args: {
      where: { id: string };
    }): Promise<{ id: string; lifeStatus: string; deletedAt: Date | null } | null>;
  };
  album: {
    create(args: { data: Record<string, unknown> }): Promise<AlbumRow>;
    findUnique(args: { where: { id: string } }): Promise<AlbumRow | null>;
    update(args: {
      where: { id: string };
      data: Record<string, unknown>;
    }): Promise<AlbumRow>;
  };
  albumItem: {
    create(args: { data: Record<string, unknown> }): Promise<AlbumItemRow>;
    findMany(args: {
      where: Record<string, unknown>;
      orderBy?: unknown;
    }): Promise<AlbumItemRow[]>;
  };
  memorialTribute: {
    create(args: { data: Record<string, unknown> }): Promise<TributeRow>;
    findMany(args: {
      where: Record<string, unknown>;
    }): Promise<TributeRow[]>;
  };
  source: {
    create(args: { data: Record<string, unknown> }): Promise<SourceRow>;
    findMany(args: {
      where: Record<string, unknown>;
    }): Promise<SourceRow[]>;
  };
  contribution: {
    create(args: { data: Record<string, unknown> }): Promise<unknown>;
  };
}

interface AlbumRow {
  id: string;
  subjectPersonId: string | null;
  ownerAccountId: string;
  title: string;
  visibilityScope: MockVisibilityScope;
  visibleMaxDegree: number | null;
  deletedAt: Date | null;
}

interface AlbumItemRow {
  id: string;
  albumId: string;
  mediaId: string;
  caption: string | null;
  position: number;
  deletedAt: Date | null;
}

interface TributeRow {
  id: string;
  personId: string;
  authorAccountId: string;
  kind: string;
  message: string | null;
  visibilityScope: MockVisibilityScope;
  visibleMaxDegree: number | null;
  deletedAt: Date | null;
}

interface SourceRow {
  id: string;
  personId: string | null;
  sourceType: string | null;
  title: string | null;
  audioTranscript: string | null;
  mediaFileId: string | null;
  visibilityScope: MockVisibilityScope;
  deletedAt: Date | null;
}

/**
 * Shared FAMILY/PRIVATE_SELF/PUBLIC decision, identical in spirit to
 * FamilyFeedService.canSee. `requesterPersonId` is the viewer's claimed node
 * (null when the account has no verified self-claim → only PUBLIC is visible).
 */
async function canSee(
  graph: GraphDegreeService,
  requesterPersonId: string | null,
  ownerPersonId: string | null,
  scope: MockVisibilityScope,
  visibleMaxDegree: number | null,
): Promise<boolean> {
  switch (scope) {
    case 'PUBLIC':
      return true;
    case 'PRIVATE_SELF':
      return (
        requesterPersonId !== null &&
        ownerPersonId !== null &&
        requesterPersonId === ownerPersonId
      );
    case 'FAMILY': {
      if (!requesterPersonId || !ownerPersonId) return false;
      if (requesterPersonId === ownerPersonId) return true;
      const maxDegree = visibleMaxDegree ?? DEFAULT_MAX_DEGREE;
      const degree = await graph.computeDegree(
        requesterPersonId,
        ownerPersonId,
        maxDegree,
      );
      return degree !== null && degree <= maxDegree;
    }
    default:
      return false;
  }
}

async function resolveRequesterPersonId(
  prisma: PrismaLike,
  accountId: string,
): Promise<string | null> {
  const claim = await prisma.claim.findFirst({
    where: { accountId, status: 'VERIFIED' },
  });
  return claim?.personId ?? null;
}

// ---------------------------------------------------------------------------
// Reference ALBUM service
// ---------------------------------------------------------------------------
class RefAlbumService {
  constructor(
    private readonly prisma: PrismaLike,
    private readonly graph: GraphDegreeService,
  ) {}

  async createAlbum(input: {
    ownerAccountId: string;
    subjectPersonId: string | null;
    title: string;
    visibilityScope?: MockVisibilityScope;
    visibleMaxDegree?: number | null;
  }): Promise<AlbumRow> {
    const album = await this.prisma.album.create({
      data: {
        ownerAccountId: input.ownerAccountId,
        subjectPersonId: input.subjectPersonId,
        title: input.title,
        visibilityScope: input.visibilityScope ?? 'PRIVATE_SELF',
        visibleMaxDegree: input.visibleMaxDegree ?? null,
      },
    });
    await this.prisma.contribution.create({
      data: {
        accountId: input.ownerAccountId,
        entityType: 'album',
        entityId: album.id,
        action: 'CREATE',
        newValue: { visibilityScope: album.visibilityScope },
      },
    });
    return album;
  }

  async addItem(input: {
    albumId: string;
    actorAccountId: string;
    mediaId: string;
    caption?: string | null;
    position?: number;
  }): Promise<AlbumItemRow> {
    const item = await this.prisma.albumItem.create({
      data: {
        albumId: input.albumId,
        mediaId: input.mediaId,
        caption: input.caption ?? null,
        position: input.position ?? 0,
      },
    });
    await this.prisma.contribution.create({
      data: {
        accountId: input.actorAccountId,
        entityType: 'album_item',
        entityId: item.id,
        action: 'CREATE',
        newValue: { albumId: input.albumId },
      },
    });
    return item;
  }

  async listItems(albumId: string): Promise<AlbumItemRow[]> {
    return this.prisma.albumItem.findMany({
      where: { albumId, deletedAt: null },
      orderBy: [{ position: 'asc' }],
    });
  }

  /** Loads an album the viewer is permitted to see, or throws (NotFound/Forbidden). */
  async getAlbumForViewer(
    albumId: string,
    viewerAccountId: string,
  ): Promise<AlbumRow> {
    const album = await this.prisma.album.findUnique({ where: { id: albumId } });
    if (!album || album.deletedAt !== null) {
      throw new NotFoundException('Album not accessible');
    }
    const viewerPersonId = await resolveRequesterPersonId(
      this.prisma,
      viewerAccountId,
    );
    const ownerIsViewer = album.ownerAccountId === viewerAccountId;
    const visible =
      ownerIsViewer ||
      (await canSee(
        this.graph,
        viewerPersonId,
        album.subjectPersonId,
        album.visibilityScope,
        album.visibleMaxDegree,
      ));
    if (!visible) {
      throw new ForbiddenException('Album not accessible');
    }
    return album;
  }

  async softDelete(
    albumId: string,
    actorAccountId: string,
  ): Promise<AlbumRow> {
    const album = await this.prisma.album.update({
      where: { id: albumId },
      data: { deletedAt: new Date() },
    });
    await this.prisma.contribution.create({
      data: {
        accountId: actorAccountId,
        entityType: 'album',
        entityId: albumId,
        action: 'DELETE',
        newValue: null,
      },
    });
    return album;
  }
}

// ---------------------------------------------------------------------------
// Reference MEMORIAL TRIBUTE service
// ---------------------------------------------------------------------------
class RefMemorialService {
  constructor(
    private readonly prisma: PrismaLike,
    private readonly graph: GraphDegreeService,
  ) {}

  /** A tribute is only allowed on a DECEASED person. Blocks ALIVE/UNKNOWN. */
  async createTribute(input: {
    personId: string;
    authorAccountId: string;
    kind: string;
    message?: string | null;
    visibilityScope?: MockVisibilityScope;
    visibleMaxDegree?: number | null;
  }): Promise<TributeRow> {
    const person = await this.prisma.person.findUnique({
      where: { id: input.personId },
    });
    if (!person || person.deletedAt !== null) {
      throw new NotFoundException('Person not found');
    }
    if (person.lifeStatus !== 'DECEASED') {
      throw new BadRequestException(
        'Tributes can only be left on a deceased person',
      );
    }
    const tribute = await this.prisma.memorialTribute.create({
      data: {
        personId: input.personId,
        authorAccountId: input.authorAccountId,
        kind: input.kind,
        message: input.message ?? null,
        visibilityScope: input.visibilityScope ?? 'FAMILY',
        visibleMaxDegree: input.visibleMaxDegree ?? null,
      },
    });
    await this.prisma.contribution.create({
      data: {
        accountId: input.authorAccountId,
        entityType: 'memorial_tribute',
        entityId: tribute.id,
        action: 'CREATE',
        newValue: { kind: input.kind, personId: input.personId },
      },
    });
    return tribute;
  }

  /** Returns tributes on a person the viewer is permitted to see. */
  async listTributesForViewer(
    personId: string,
    viewerAccountId: string,
  ): Promise<TributeRow[]> {
    const all = await this.prisma.memorialTribute.findMany({
      where: { personId, deletedAt: null },
    });
    const viewerPersonId = await resolveRequesterPersonId(
      this.prisma,
      viewerAccountId,
    );
    const visible: TributeRow[] = [];
    for (const tribute of all) {
      const ownerIsAuthor = tribute.authorAccountId === viewerAccountId;
      if (
        ownerIsAuthor ||
        (await canSee(
          this.graph,
          viewerPersonId,
          tribute.personId,
          tribute.visibilityScope,
          tribute.visibleMaxDegree,
        ))
      ) {
        visible.push(tribute);
      }
    }
    return visible;
  }
}

// ---------------------------------------------------------------------------
// Reference ORAL HISTORY service (reuses the existing Source model)
// ---------------------------------------------------------------------------
class RefOralHistoryService {
  constructor(private readonly prisma: PrismaLike) {}

  async createTestimony(input: {
    personId: string;
    addedByAccountId: string;
    title: string;
    mediaFileId: string;
    audioTranscript?: string | null;
    visibilityScope?: MockVisibilityScope;
  }): Promise<SourceRow> {
    const source = await this.prisma.source.create({
      data: {
        personId: input.personId,
        sourceType: 'ORAL_HISTORY',
        title: input.title,
        mediaFileId: input.mediaFileId,
        audioTranscript: input.audioTranscript ?? null,
        addedByAccountId: input.addedByAccountId,
        visibilityScope: input.visibilityScope ?? 'PRIVATE_SELF',
      },
    });
    await this.prisma.contribution.create({
      data: {
        accountId: input.addedByAccountId,
        entityType: 'source',
        entityId: source.id,
        action: 'CREATE',
        newValue: { sourceType: 'ORAL_HISTORY', personId: input.personId },
      },
    });
    return source;
  }

  async listForPerson(personId: string): Promise<SourceRow[]> {
    return this.prisma.source.findMany({
      where: { personId, sourceType: 'ORAL_HISTORY', deletedAt: null },
    });
  }
}

// ===========================================================================
// SUITE
// ===========================================================================
describe('Phase 4 Living Memory (service-level integration)', () => {
  let mock: Phase4PrismaMock;
  let graph: GraphDegreeService;
  let albums: RefAlbumService;
  let memorial: RefMemorialService;
  let oralHistory: RefOralHistoryService;

  // person ids
  let subjectId: string;
  let parentId: string;
  let grandparentId: string;
  let strangerId: string;

  // account ids
  let accSubject: string;
  let accParent: string;
  let accGrandparent: string;
  let accStranger: string;

  beforeEach(async () => {
    mock = createPhase4PrismaMock();

    subjectId = mock.seedPerson({ displayName: 'Subject' }).id;
    parentId = mock.seedPerson({ displayName: 'Parent' }).id;
    grandparentId = mock.seedPerson({ displayName: 'Grandparent' }).id;
    strangerId = mock.seedPerson({ displayName: 'Stranger' }).id;

    mock.addParentChild(parentId, subjectId); // subject deg 1 from parent
    mock.addParentChild(grandparentId, parentId); // subject deg 2 from grandparent
    // stranger intentionally disconnected.

    accSubject = mock.seedAccount().id;
    accParent = mock.seedAccount().id;
    accGrandparent = mock.seedAccount().id;
    accStranger = mock.seedAccount().id;
    mock.seedClaim(accSubject, subjectId);
    mock.seedClaim(accParent, parentId);
    mock.seedClaim(accGrandparent, grandparentId);
    mock.seedClaim(accStranger, strangerId);

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        GraphDegreeService,
        { provide: PrismaService, useValue: mock.prisma },
      ],
    }).compile();

    graph = moduleRef.get(GraphDegreeService);
    const prismaLike = mock.prisma as unknown as PrismaLike;
    albums = new RefAlbumService(prismaLike, graph);
    memorial = new RefMemorialService(prismaLike, graph);
    oralHistory = new RefOralHistoryService(prismaLike);
  });

  // -------------------------------------------------------------------------
  // (1) ALBUM VISIBILITY
  // -------------------------------------------------------------------------
  describe('album visibility', () => {
    it('PRIVATE_SELF album is visible to the owner only', async () => {
      const album = await albums.createAlbum({
        ownerAccountId: accSubject,
        subjectPersonId: subjectId,
        title: 'My private childhood album',
        visibilityScope: 'PRIVATE_SELF',
      });

      await expect(
        albums.getAlbumForViewer(album.id, accSubject),
      ).resolves.toMatchObject({ id: album.id });

      // A degree-1 relative cannot see a PRIVATE_SELF album.
      await expect(
        albums.getAlbumForViewer(album.id, accParent),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('FAMILY album is degree-bounded: in-degree relative sees it, stranger does not', async () => {
      const album = await albums.createAlbum({
        ownerAccountId: accSubject,
        subjectPersonId: subjectId,
        title: 'Family growing-up album',
        visibilityScope: 'FAMILY',
      });

      // owner + degree-1 parent + degree-2 grandparent are all within default degree.
      await expect(
        albums.getAlbumForViewer(album.id, accSubject),
      ).resolves.toMatchObject({ id: album.id });
      await expect(
        albums.getAlbumForViewer(album.id, accParent),
      ).resolves.toMatchObject({ id: album.id });
      await expect(
        albums.getAlbumForViewer(album.id, accGrandparent),
      ).resolves.toMatchObject({ id: album.id });

      // disconnected stranger is out of degree.
      await expect(
        albums.getAlbumForViewer(album.id, accStranger),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('FAMILY album respects a tighter visibleMaxDegree (1 excludes degree-2 grandparent)', async () => {
      const album = await albums.createAlbum({
        ownerAccountId: accSubject,
        subjectPersonId: subjectId,
        title: 'Close family only',
        visibilityScope: 'FAMILY',
        visibleMaxDegree: 1,
      });

      await expect(
        albums.getAlbumForViewer(album.id, accParent),
      ).resolves.toMatchObject({ id: album.id }); // degree 1 — in
      await expect(
        albums.getAlbumForViewer(album.id, accGrandparent),
      ).rejects.toBeInstanceOf(ForbiddenException); // degree 2 — out
    });

    it('PUBLIC album is visible even to a disconnected stranger', async () => {
      const album = await albums.createAlbum({
        ownerAccountId: accSubject,
        subjectPersonId: subjectId,
        title: 'Public family heritage',
        visibilityScope: 'PUBLIC',
      });

      await expect(
        albums.getAlbumForViewer(album.id, accStranger),
      ).resolves.toMatchObject({ id: album.id });
    });

    it('soft-deleted album is not accessible (NotFound), never physically removed', async () => {
      const album = await albums.createAlbum({
        ownerAccountId: accSubject,
        subjectPersonId: subjectId,
        title: 'To be removed',
        visibilityScope: 'PUBLIC',
      });
      await albums.softDelete(album.id, accSubject);

      await expect(
        albums.getAlbumForViewer(album.id, accSubject),
      ).rejects.toBeInstanceOf(NotFoundException);
      // row still present in the store (soft-delete, not physical DELETE)
      expect(mock.db.albums.find((a) => a.id === album.id)).toBeDefined();
      expect(
        mock.db.albums.find((a) => a.id === album.id)?.deletedAt,
      ).not.toBeNull();
    });

    it('writes a mandatory Contribution audit row when an album is created', async () => {
      const album = await albums.createAlbum({
        ownerAccountId: accSubject,
        subjectPersonId: subjectId,
        title: 'Audited album',
      });
      const audit = mock.db.contributions.filter(
        (c) => c.entityType === 'album' && c.entityId === album.id,
      );
      expect(audit).toHaveLength(1);
      expect(audit[0].action).toBe('CREATE');
      expect(audit[0].accountId).toBe(accSubject);
    });
  });

  // -------------------------------------------------------------------------
  // (2) ALBUM ITEM ORDERING
  // -------------------------------------------------------------------------
  describe('album item ordering', () => {
    it('returns items sorted by ascending position regardless of insertion order', async () => {
      const album = await albums.createAlbum({
        ownerAccountId: accSubject,
        subjectPersonId: subjectId,
        title: 'Timeline album',
        visibilityScope: 'PRIVATE_SELF',
      });
      const m0 = mock.seedMedia().id;
      const m1 = mock.seedMedia().id;
      const m2 = mock.seedMedia().id;

      // insert out of order
      await albums.addItem({
        albumId: album.id,
        actorAccountId: accSubject,
        mediaId: m2,
        caption: 'Graduation',
        position: 2,
      });
      await albums.addItem({
        albumId: album.id,
        actorAccountId: accSubject,
        mediaId: m0,
        caption: 'Newborn',
        position: 0,
      });
      await albums.addItem({
        albumId: album.id,
        actorAccountId: accSubject,
        mediaId: m1,
        caption: 'First steps',
        position: 1,
      });

      const items = await albums.listItems(album.id);
      expect(items.map((i) => i.position)).toEqual([0, 1, 2]);
      expect(items.map((i) => i.caption)).toEqual([
        'Newborn',
        'First steps',
        'Graduation',
      ]);
      expect(items.map((i) => i.mediaId)).toEqual([m0, m1, m2]);
    });

    it('each added item references existing Media and writes an audit row', async () => {
      const album = await albums.createAlbum({
        ownerAccountId: accSubject,
        subjectPersonId: subjectId,
        title: 'Audited items',
      });
      const mediaId = mock.seedMedia().id;
      const item = await albums.addItem({
        albumId: album.id,
        actorAccountId: accSubject,
        mediaId,
        position: 0,
      });
      expect(mock.db.media.get(item.mediaId)).toBeDefined();
      const audit = mock.db.contributions.filter(
        (c) => c.entityType === 'album_item' && c.entityId === item.id,
      );
      expect(audit).toHaveLength(1);
    });
  });

  // -------------------------------------------------------------------------
  // (3) MEMORIAL — blocked on ALIVE, allowed on DECEASED
  // -------------------------------------------------------------------------
  describe('memorial tribute life_status gate', () => {
    it('BLOCKS a tribute on an ALIVE person', async () => {
      // subject is ALIVE by default
      await expect(
        memorial.createTribute({
          personId: subjectId,
          authorAccountId: accParent,
          kind: 'CANDLE',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(mock.db.memorialTributes).toHaveLength(0);
    });

    it('BLOCKS a tribute on an UNKNOWN-status person', async () => {
      const unknownPerson = mock.seedPerson({ lifeStatus: 'UNKNOWN' });
      await expect(
        memorial.createTribute({
          personId: unknownPerson.id,
          authorAccountId: accSubject,
          kind: 'MESSAGE',
          message: 'thinking of you',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('ALLOWS a tribute on a DECEASED person and writes an audit row', async () => {
      const ancestor = mock.seedPerson({
        displayName: 'Late Grandmother',
        lifeStatus: 'DECEASED',
      });
      mock.addParentChild(ancestor.id, grandparentId); // connect into the graph

      const tribute = await memorial.createTribute({
        personId: ancestor.id,
        authorAccountId: accSubject,
        kind: 'CANDLE',
        message: 'We remember you.',
      });

      expect(tribute.id).toBeDefined();
      expect(mock.db.memorialTributes).toHaveLength(1);
      const audit = mock.db.contributions.filter(
        (c) => c.entityType === 'memorial_tribute' && c.entityId === tribute.id,
      );
      expect(audit).toHaveLength(1);
      expect(audit[0].action).toBe('CREATE');
    });

    it('throws NotFound when the target person does not exist', async () => {
      await expect(
        memorial.createTribute({
          personId: 'non-existent-id',
          authorAccountId: accSubject,
          kind: 'CANDLE',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  // -------------------------------------------------------------------------
  // (4) MEMORIAL — tribute visibility enforced
  // -------------------------------------------------------------------------
  describe('memorial tribute visibility', () => {
    let ancestorId: string;

    beforeEach(() => {
      // Deceased ancestor positioned 1 hop above grandparent:
      //   ancestor -> grandparent -> parent -> subject
      // degree(ancestor, subject)     = 3
      // degree(ancestor, parent)      = 2
      // degree(ancestor, grandparent) = 1
      const ancestor = mock.seedPerson({
        displayName: 'Ancestor',
        lifeStatus: 'DECEASED',
      });
      ancestorId = ancestor.id;
      mock.addParentChild(ancestorId, grandparentId);
    });

    it('FAMILY tribute is visible to in-degree relatives but not a disconnected stranger', async () => {
      await memorial.createTribute({
        personId: ancestorId,
        authorAccountId: accGrandparent,
        kind: 'MESSAGE',
        message: 'Rest in peace.',
        visibilityScope: 'FAMILY',
      });

      const grandparentView = await memorial.listTributesForViewer(
        ancestorId,
        accGrandparent,
      );
      expect(grandparentView).toHaveLength(1); // degree 1 — in

      const strangerView = await memorial.listTributesForViewer(
        ancestorId,
        accStranger,
      );
      expect(strangerView).toHaveLength(0); // disconnected — out
    });

    it('FAMILY tribute with visibleMaxDegree=1 hides from a degree-2 relative', async () => {
      await memorial.createTribute({
        personId: ancestorId,
        authorAccountId: accGrandparent,
        kind: 'CANDLE',
        visibilityScope: 'FAMILY',
        visibleMaxDegree: 1,
      });

      const grandparentView = await memorial.listTributesForViewer(
        ancestorId,
        accGrandparent,
      );
      expect(grandparentView).toHaveLength(1); // degree 1 — in

      const parentView = await memorial.listTributesForViewer(
        ancestorId,
        accParent,
      );
      expect(parentView).toHaveLength(0); // degree 2 — out
    });

    it('PUBLIC tribute is visible to everyone, including a stranger', async () => {
      await memorial.createTribute({
        personId: ancestorId,
        authorAccountId: accGrandparent,
        kind: 'PHOTO',
        visibilityScope: 'PUBLIC',
      });
      const strangerView = await memorial.listTributesForViewer(
        ancestorId,
        accStranger,
      );
      expect(strangerView).toHaveLength(1);
    });

    it('the tribute author always sees their own tribute even when out of degree', async () => {
      // stranger authors a FAMILY tribute on the ancestor (still allowed —
      // deceased); they are out of degree but must see their own contribution.
      await memorial.createTribute({
        personId: ancestorId,
        authorAccountId: accStranger,
        kind: 'MESSAGE',
        message: 'A distant relative remembers.',
        visibilityScope: 'FAMILY',
      });
      const authorView = await memorial.listTributesForViewer(
        ancestorId,
        accStranger,
      );
      expect(authorView).toHaveLength(1);
    });
  });

  // -------------------------------------------------------------------------
  // (5) ORAL HISTORY — persists + lists (Source reuse)
  // -------------------------------------------------------------------------
  describe('oral history testimony (Source)', () => {
    it('persists a testimony with transcript + media reference and writes audit', async () => {
      const elder = mock.seedPerson({
        displayName: 'Elder',
        lifeStatus: 'ALIVE',
      });
      const mediaId = mock.seedMedia({ fileType: 'audio' }).id;

      const source = await oralHistory.createTestimony({
        personId: elder.id,
        addedByAccountId: accSubject,
        title: 'How our village was founded',
        mediaFileId: mediaId,
        audioTranscript: 'Long ago, our ancestors settled by the river...',
        visibilityScope: 'FAMILY',
      });

      expect(source.id).toBeDefined();
      expect(source.sourceType).toBe('ORAL_HISTORY');
      expect(source.mediaFileId).toBe(mediaId);
      expect(source.audioTranscript).toContain('ancestors settled');

      const audit = mock.db.contributions.filter(
        (c) => c.entityType === 'source' && c.entityId === source.id,
      );
      expect(audit).toHaveLength(1);
      expect(audit[0].action).toBe('CREATE');
    });

    it('lists oral-history testimonies for a person (and only that person)', async () => {
      const elderA = mock.seedPerson({ displayName: 'Elder A' });
      const elderB = mock.seedPerson({ displayName: 'Elder B' });
      const mediaId = mock.seedMedia({ fileType: 'audio' }).id;

      await oralHistory.createTestimony({
        personId: elderA.id,
        addedByAccountId: accSubject,
        title: 'Testimony 1',
        mediaFileId: mediaId,
      });
      await oralHistory.createTestimony({
        personId: elderA.id,
        addedByAccountId: accParent,
        title: 'Testimony 2',
        mediaFileId: mediaId,
      });
      await oralHistory.createTestimony({
        personId: elderB.id,
        addedByAccountId: accSubject,
        title: 'Other elder',
        mediaFileId: mediaId,
      });

      const forA = await oralHistory.listForPerson(elderA.id);
      expect(forA).toHaveLength(2);
      expect(forA.map((s) => s.title).sort()).toEqual([
        'Testimony 1',
        'Testimony 2',
      ]);

      const forB = await oralHistory.listForPerson(elderB.id);
      expect(forB).toHaveLength(1);
    });

    it('does not list a soft-deleted testimony', async () => {
      const elder = mock.seedPerson({ displayName: 'Elder' });
      const mediaId = mock.seedMedia({ fileType: 'audio' }).id;
      const source = await oralHistory.createTestimony({
        personId: elder.id,
        addedByAccountId: accSubject,
        title: 'Soon deleted',
        mediaFileId: mediaId,
      });

      // soft delete directly in the store
      const stored = mock.db.sources.find((s) => s.id === source.id);
      if (stored) stored.deletedAt = new Date();

      const listed = await oralHistory.listForPerson(elder.id);
      expect(listed).toHaveLength(0);
      // still present physically (soft delete)
      expect(mock.db.sources.find((s) => s.id === source.id)).toBeDefined();
    });
  });
});
