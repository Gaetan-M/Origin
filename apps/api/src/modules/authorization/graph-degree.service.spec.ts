import { Test, TestingModule } from '@nestjs/testing';
import { GraphDegreeService } from './graph-degree.service';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Tiny in-memory fixture of the family graph, queried by the Prisma mock so
 * the BFS exercises the real traversal logic (not pre-canned per-call values).
 *
 * Graph:
 *   A ──parent──▶ B
 *   A ──parent──▶ C          (B and C are siblings)
 *   C ──parent──▶ D
 *   D ──parent──▶ E
 *   E ──parent──▶ F          (long chain for beyond-cap)
 *   X ──union(u1)── Y        (spouses)
 *   Z                        (isolated / unreachable)
 *   G ──parent──▶ H  [deleted edge -> must be ignored]
 */
interface PcRow {
  parentId: string;
  childId: string;
  deletedAt: Date | null;
}
interface UpRow {
  unionId: string;
  personId: string;
}

const pcRows: PcRow[] = [
  { parentId: 'A', childId: 'B', deletedAt: null },
  { parentId: 'A', childId: 'C', deletedAt: null },
  { parentId: 'C', childId: 'D', deletedAt: null },
  { parentId: 'D', childId: 'E', deletedAt: null },
  { parentId: 'E', childId: 'F', deletedAt: null },
  { parentId: 'G', childId: 'H', deletedAt: new Date() },
];

const upRows: UpRow[] = [
  { unionId: 'u1', personId: 'X' },
  { unionId: 'u1', personId: 'Y' },
];

interface FindManyArgs {
  where?: {
    parentId?: { in: string[] };
    childId?: { in: string[] };
    personId?: { in: string[] };
    unionId?: { in: string[] };
    deletedAt?: null;
    union?: { deletedAt: null };
  };
  select?: Record<string, boolean>;
}

const mockPrisma = {
  parentChild: {
    findMany: jest.fn((args: FindManyArgs) => {
      const where = args.where ?? {};
      let rows = pcRows.filter((r) => r.deletedAt === null);
      if (where.parentId?.in) {
        rows = rows.filter((r) => where.parentId!.in.includes(r.parentId));
      }
      if (where.childId?.in) {
        rows = rows.filter((r) => where.childId!.in.includes(r.childId));
      }
      return Promise.resolve(
        rows.map((r) => ({ parentId: r.parentId, childId: r.childId })),
      );
    }),
  },
  unionPartner: {
    findMany: jest.fn((args: FindManyArgs) => {
      const where = args.where ?? {};
      let rows = upRows;
      if (where.personId?.in) {
        rows = rows.filter((r) => where.personId!.in.includes(r.personId));
      }
      if (where.unionId?.in) {
        rows = rows.filter((r) => where.unionId!.in.includes(r.unionId));
      }
      return Promise.resolve(
        rows.map((r) => ({ unionId: r.unionId, personId: r.personId })),
      );
    }),
  },
};

describe('GraphDegreeService', () => {
  let service: GraphDegreeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GraphDegreeService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<GraphDegreeService>(GraphDegreeService);
    jest.clearAllMocks();
  });

  it('returns 0 for the same person (identity)', async () => {
    await expect(service.computeDegree('A', 'A', 5)).resolves.toBe(0);
  });

  it('returns 1 for a direct parent->child edge', async () => {
    await expect(service.computeDegree('A', 'B', 5)).resolves.toBe(1);
  });

  it('returns 1 for a direct child->parent edge (undirected)', async () => {
    await expect(service.computeDegree('B', 'A', 5)).resolves.toBe(1);
  });

  it('returns 2 for siblings (child -> shared parent -> sibling)', async () => {
    await expect(service.computeDegree('B', 'C', 5)).resolves.toBe(2);
  });

  it('returns 1 for spouses linked through a union', async () => {
    await expect(service.computeDegree('X', 'Y', 5)).resolves.toBe(1);
  });

  it('returns null when the target is beyond the depth cap', async () => {
    // B..F shortest path is B-A-C-D-E-F = 5 hops; cap at 3 -> unreachable.
    await expect(service.computeDegree('B', 'F', 3)).resolves.toBeNull();
  });

  it('finds the target exactly at the depth cap', async () => {
    // B-A-C-D-E-F = degree 5.
    await expect(service.computeDegree('B', 'F', 5)).resolves.toBe(5);
  });

  it('returns null for an unreachable (isolated) person', async () => {
    await expect(service.computeDegree('A', 'Z', 5)).resolves.toBeNull();
  });

  it('returns null when maxDepth < 1 and persons differ', async () => {
    await expect(service.computeDegree('A', 'B', 0)).resolves.toBeNull();
  });

  it('ignores soft-deleted parent/child edges', async () => {
    await expect(service.computeDegree('G', 'H', 5)).resolves.toBeNull();
  });
});
