import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Default cap for family-graph traversal when no explicit depth is supplied.
 * Kept conservative: most "FAMILY" visibility rules only need a handful of
 * hops, and an unbounded BFS over the unified global graph would be a DoS
 * vector at feed scale.
 */
export const DEFAULT_MAX_DEGREE = 5;

/**
 * Computes the shortest relationship degree (number of edges) between two
 * persons in the single, global family graph.
 *
 * Edges considered (all undirected for the purpose of "family closeness"):
 *  - parent <-> child  (ParentChild: parent_id / child_id)
 *  - partner <-> partner within the same union (UnionPartner via Union)
 *
 * Soft-deleted edges (ParentChild.deleted_at, Union.deleted_at) are ignored.
 *
 * The traversal is a bounded breadth-first search. Each BFS level issues a
 * fixed, small number of batched queries for the entire frontier (not one
 * query per node), so cost scales with graph density and depth rather than
 * frontier size.
 */
@Injectable()
export class GraphDegreeService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * @returns the shortest degree between the two persons, or `null` when they
   *          are unreachable within `maxDepth` hops. Identity returns 0.
   */
  async computeDegree(
    fromPersonId: string,
    toPersonId: string,
    maxDepth: number = DEFAULT_MAX_DEGREE,
  ): Promise<number | null> {
    if (fromPersonId === toPersonId) {
      return 0;
    }
    if (maxDepth < 1) {
      return null;
    }

    // TODO(perf/caching): adjacency lookups dominate cost here. Before this is
    // exercised on the public feed, introduce a cache layer (e.g. Redis-backed
    // per-person neighbour sets with invalidation on ParentChild/Union writes,
    // or a precomputed bidirectional-BFS meeting-in-the-middle index). The
    // getNeighbours() seam below is intentionally the single choke point.
    const visited = new Set<string>([fromPersonId]);
    let frontier: string[] = [fromPersonId];

    for (let depth = 1; depth <= maxDepth; depth += 1) {
      const neighbours = await this.getNeighbours(frontier);
      const next: string[] = [];

      for (const personId of neighbours) {
        if (personId === toPersonId) {
          return depth;
        }
        if (!visited.has(personId)) {
          visited.add(personId);
          next.push(personId);
        }
      }

      if (next.length === 0) {
        break;
      }
      frontier = next;
    }

    return null;
  }

  /**
   * Returns the set of persons adjacent to ANY person in `personIds` via a
   * non-deleted parent/child or union-partner edge. Batched: at most a small
   * constant number of queries regardless of frontier size.
   */
  private async getNeighbours(personIds: string[]): Promise<Set<string>> {
    const [childrenEdges, parentEdges, partnerships] = await Promise.all([
      // Persons in the frontier acting as parents -> their children.
      this.prisma.parentChild.findMany({
        where: { parentId: { in: personIds }, deletedAt: null },
        select: { childId: true },
      }),
      // Persons in the frontier acting as children -> their parents.
      this.prisma.parentChild.findMany({
        where: { childId: { in: personIds }, deletedAt: null },
        select: { parentId: true },
      }),
      // Unions (non-deleted) the frontier persons belong to.
      this.prisma.unionPartner.findMany({
        where: { personId: { in: personIds }, union: { deletedAt: null } },
        select: { unionId: true },
      }),
    ]);

    const neighbours = new Set<string>();
    for (const edge of childrenEdges) {
      neighbours.add(edge.childId);
    }
    for (const edge of parentEdges) {
      neighbours.add(edge.parentId);
    }

    const unionIds = [...new Set(partnerships.map((p) => p.unionId))];
    if (unionIds.length > 0) {
      const coPartners = await this.prisma.unionPartner.findMany({
        where: { unionId: { in: unionIds } },
        select: { personId: true },
      });
      for (const partner of coPartners) {
        neighbours.add(partner.personId);
      }
    }

    return neighbours;
  }
}
