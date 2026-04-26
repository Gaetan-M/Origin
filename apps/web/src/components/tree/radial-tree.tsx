'use client';

import { useMemo, useState, useCallback, useRef } from 'react';
import type { FamilyTree, FamilyNeighbor, Person } from '@origin/shared-types';
import { LifeStatus } from '@origin/shared-types';
import { TreeNode } from './tree-node';
import { ElbowLink, SpouseLink } from './tree-link';
import { getMediaFileUrl } from '@/lib/api/media';

interface RadialTreeProps {
  data: FamilyTree;
  zoom: number;
  onSelectPerson: (person: Person) => void;
  /** If provided, clicking a SPOUSE node re-centers the tree on that
   * person instead of opening their details sheet. */
  onJumpToPerson?: (personId: string) => void;
  showUnions: boolean;
}

interface LayoutNode {
  id: string;
  person: Person;
  x: number;
  y: number;
  row: number;
  isCenter: boolean;
  relationshipLabel: string;
  isSpouse?: boolean;
  partnerId?: string;
}

interface LinkData {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  type: 'parent-child' | 'union';
}

const ROW_HEIGHT = 160;
const COL_WIDTH = 140;
const SPOUSE_GAP = 30;
// Horizontal offset of each parent from the center axis. Picked wide enough
// that each parent's pair of grandparents can sit above without overlapping
// the other parent's pair.
const PARENT_OFFSET = 180;
// Half-distance between a parent's two grandparents on the ancestor row.
const GRANDPARENT_PAIR_HALF = 80;

/**
 * Return a sortable numeric key for a person's birth, or null when unknown.
 * Prefers the precise birthDate; falls back to birthYearApproximate.
 */
function birthSortKey(person: Person): number | null {
  if (person.birthDate) {
    const t = new Date(person.birthDate).getTime();
    if (!Number.isNaN(t)) return t;
  }
  if (person.birthYearApproximate != null) {
    return new Date(person.birthYearApproximate, 0, 1).getTime();
  }
  return null;
}

/**
 * Assign a 1-indexed birth order to each person in `group` based on birth date.
 * People without a known birth date are left unnumbered. No numbers are
 * assigned when the group has fewer than two datable members.
 */
function assignBirthOrder(group: Person[], out: Map<string, number>): void {
  const dated = group
    .map((p) => ({ id: p.id, key: birthSortKey(p) }))
    .filter((x): x is { id: string; key: number } => x.key !== null)
    .sort((a, b) => a.key - b.key);

  if (dated.length < 2) return;
  dated.forEach((x, i) => out.set(x.id, i + 1));
}

/**
 * Determine the generation row from the relationship label.
 * Negative rows = ancestors (above), positive rows = descendants (below).
 */
function getRowFromLabel(label: string): number {
  switch (label) {
    case 'GREAT_GRANDPARENT': return -3;
    case 'GRANDPARENT': return -2;
    case 'PARENT': return -1;
    case 'UNCLE_AUNT': return -1;     // same generation as parents
    case 'SPOUSE': return 0;
    case 'SIBLING': return 0;
    case 'COUSIN': return 0;          // same generation
    case 'RELATIVE': return 0;        // default to same generation
    case 'CHILD': return 1;
    case 'NEPHEW_NIECE': return 1;    // same generation as children
    case 'GRANDCHILD': return 2;
    case 'GREAT_GRANDCHILD': return 3;
    default:
      if (label.startsWith('ANCESTOR_')) {
        const n = parseInt(label.replace('ANCESTOR_', ''), 10);
        return isNaN(n) ? -4 : -n;
      }
      if (label.startsWith('DESCENDANT_')) {
        const n = parseInt(label.replace('DESCENDANT_', ''), 10);
        return isNaN(n) ? 4 : n;
      }
      return 0;
  }
}

export function RadialTree({
  data,
  zoom,
  onSelectPerson,
  onJumpToPerson,
  showUnions,
}: RadialTreeProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  const { nodes, links, birthOrder } = useMemo(() => {
    const layoutNodes: LayoutNode[] = [];
    const layoutLinks: LinkData[] = [];
    const orderMap = new Map<string, number>();

    // Center node at row 0
    layoutNodes.push({
      id: data.center.id,
      person: data.center,
      x: 0,
      y: 0,
      row: 0,
      isCenter: true,
      relationshipLabel: 'SELF',
    });

    // Classify neighbors by row and identify spouses
    const spouseIds = new Set<string>();
    const neighborsByRow = new Map<number, FamilyNeighbor[]>();

    for (const n of data.neighbors) {
      const row = getRowFromLabel(n.relationshipLabel);
      if (n.relationshipLabel === 'SPOUSE') {
        spouseIds.add(n.personId);
      }
      const arr = neighborsByRow.get(row) ?? [];
      arr.push(n);
      neighborsByRow.set(row, arr);
    }

    // Separate spouses from non-spouses in row 0
    const row0Spouses = neighborsByRow.get(0)?.filter((n) => spouseIds.has(n.personId)) ?? [];
    const row0NonSpouses = neighborsByRow.get(0)?.filter((n) => !spouseIds.has(n.personId)) ?? [];

    // Replace row 0 with only non-spouses (siblings)
    if (row0NonSpouses.length > 0) {
      neighborsByRow.set(0, row0NonSpouses);
    } else {
      neighborsByRow.delete(0);
    }

    // Place center person's spouses beside them
    // Center is at x=0. Spouses alternate left/right of center.
    const spouseNodes: LayoutNode[] = [];
    row0Spouses.forEach((n, i) => {
      const person = n.person ?? {
        id: n.personId,
        displayName: n.personId.slice(0, 8),
        lifeStatus: LifeStatus.UNKNOWN,
      } as Person;

      const side = i % 2 === 0 ? 1 : -1;
      const offset = Math.ceil((i + 1) / 2);
      const x = side * offset * (COL_WIDTH + SPOUSE_GAP);

      const node: LayoutNode = {
        id: n.personId,
        person,
        x,
        y: 0,
        row: 0,
        isCenter: false,
        relationshipLabel: n.relationshipLabel,
        isSpouse: true,
        partnerId: data.center.id,
      };
      spouseNodes.push(node);
      layoutNodes.push(node);
    });

    // Ancestor rows get bespoke placement so that each parent sits visually
    // between its two grandparents (rather than every ancestor being centered
    // on x=0, which made Papa/Mama overlap with their in-laws).
    const row1Up = neighborsByRow.get(-1) ?? [];
    const row2Up = neighborsByRow.get(-2) ?? [];
    const parents = row1Up.filter((n) => n.relationshipLabel === 'PARENT');
    const uncleAunts = row1Up.filter((n) => n.relationshipLabel === 'UNCLE_AUNT');
    const otherRow1Up = row1Up.filter(
      (n) => n.relationshipLabel !== 'PARENT' && n.relationshipLabel !== 'UNCLE_AUNT',
    );
    const grandparents = row2Up.filter((n) => n.relationshipLabel === 'GRANDPARENT');
    const otherRow2Up = row2Up.filter((n) => n.relationshipLabel !== 'GRANDPARENT');

    const parentX = new Map<string, number>();
    if (parents.length === 1) {
      parentX.set(parents[0].personId, 0);
    } else if (parents.length === 2) {
      parentX.set(parents[0].personId, -PARENT_OFFSET);
      parentX.set(parents[1].personId, PARENT_OFFSET);
    } else if (parents.length > 2) {
      const totalWidth = (parents.length - 1) * COL_WIDTH;
      parents.forEach((n, i) => {
        parentX.set(n.personId, -totalWidth / 2 + i * COL_WIDTH);
      });
    }

    const pushAncestor = (
      n: FamilyNeighbor,
      x: number,
      y: number,
      row: number,
    ): void => {
      const person =
        n.person ??
        ({
          id: n.personId,
          displayName: n.personId.slice(0, 8),
          lifeStatus: LifeStatus.UNKNOWN,
        } as Person);
      layoutNodes.push({
        id: n.personId,
        person,
        x,
        y,
        row,
        isCenter: false,
        relationshipLabel: n.relationshipLabel,
      });
    };

    for (const n of parents) {
      pushAncestor(n, parentX.get(n.personId) ?? 0, -ROW_HEIGHT, -1);
    }

    // Each grandparent inherits its x from the parent it belongs to. The
    // downstream parent is the second-to-last entry in the traversal path
    // (i.e. the node whose child is this grandparent's grandchild).
    const gpByParent = new Map<string, FamilyNeighbor[]>();
    for (const n of grandparents) {
      const downstreamParentId = n.path[n.path.length - 2];
      const arr = gpByParent.get(downstreamParentId) ?? [];
      arr.push(n);
      gpByParent.set(downstreamParentId, arr);
    }

    for (const [downstreamParentId, pair] of gpByParent) {
      const baseX = parentX.get(downstreamParentId) ?? 0;
      if (pair.length === 1) {
        pushAncestor(pair[0], baseX, -2 * ROW_HEIGHT, -2);
      } else if (pair.length === 2) {
        pushAncestor(pair[0], baseX - GRANDPARENT_PAIR_HALF, -2 * ROW_HEIGHT, -2);
        pushAncestor(pair[1], baseX + GRANDPARENT_PAIR_HALF, -2 * ROW_HEIGHT, -2);
      } else {
        const totalWidth = (pair.length - 1) * COL_WIDTH;
        const startX = baseX - totalWidth / 2;
        pair.forEach((n, i) => pushAncestor(n, startX + i * COL_WIDTH, -2 * ROW_HEIGHT, -2));
      }
    }

    // Uncles/aunts sit on the parents' row but outside of them, alternating
    // sides so the subtree stays balanced.
    uncleAunts.forEach((n, i) => {
      const side = i % 2 === 0 ? 1 : -1;
      const offset = Math.floor(i / 2) + 1;
      const x = side * (PARENT_OFFSET + offset * COL_WIDTH);
      pushAncestor(n, x, -ROW_HEIGHT, -1);
    });

    // Anything else that happened to be tagged on these rows (unusual labels)
    // falls back to plain horizontal centering.
    if (otherRow1Up.length > 0) {
      const totalWidth = (otherRow1Up.length - 1) * COL_WIDTH;
      const startX = -totalWidth / 2;
      otherRow1Up.forEach((n, i) =>
        pushAncestor(n, startX + i * COL_WIDTH, -ROW_HEIGHT, -1),
      );
    }
    if (otherRow2Up.length > 0) {
      const totalWidth = (otherRow2Up.length - 1) * COL_WIDTH;
      const startX = -totalWidth / 2;
      otherRow2Up.forEach((n, i) =>
        pushAncestor(n, startX + i * COL_WIDTH, -2 * ROW_HEIGHT, -2),
      );
    }

    neighborsByRow.delete(-1);
    neighborsByRow.delete(-2);

    // Layout non-spouse nodes per row, centered horizontally.
    // Row 0 is a special case: the center node (self) already occupies x=0 and
    // spouses are placed beside it, so siblings must be pushed outside of them.
    for (const [row, neighbors] of neighborsByRow) {
      const nonSpouse = neighbors.filter((n) => !spouseIds.has(n.personId));
      if (nonSpouse.length === 0) continue;

      if (row === 0) {
        // Farthest x used on each side by center + spouses.
        const rightAnchor = spouseNodes
          .filter((s) => s.x > 0)
          .reduce((max, s) => Math.max(max, s.x), 0);
        const leftAnchor = spouseNodes
          .filter((s) => s.x < 0)
          .reduce((min, s) => Math.min(min, s.x), 0);

        nonSpouse.forEach((n, i) => {
          const person = n.person ?? {
            id: n.personId,
            displayName: n.personId.slice(0, 8),
            lifeStatus: LifeStatus.UNKNOWN,
          } as Person;

          // Alternate left/right (left first), 1-indexed offset from the anchor.
          const goRight = i % 2 === 1;
          const offset = Math.floor(i / 2) + 1;
          const x = goRight
            ? rightAnchor + offset * COL_WIDTH
            : leftAnchor - offset * COL_WIDTH;

          layoutNodes.push({
            id: n.personId,
            person,
            x,
            y: 0,
            row: 0,
            isCenter: false,
            relationshipLabel: n.relationshipLabel,
          });
        });
        continue;
      }

      const totalWidth = (nonSpouse.length - 1) * COL_WIDTH;
      const startX = -totalWidth / 2;

      nonSpouse.forEach((n, i) => {
        const person = n.person ?? {
          id: n.personId,
          displayName: n.personId.slice(0, 8),
          lifeStatus: LifeStatus.UNKNOWN,
        } as Person;

        layoutNodes.push({
          id: n.personId,
          person,
          x: startX + i * COL_WIDTH,
          y: row * ROW_HEIGHT,
          row,
          isCenter: false,
          relationshipLabel: n.relationshipLabel,
        });
      });
    }

    // Build links using path data
    const nodeMap = new Map(layoutNodes.map((n) => [n.id, n]));

    for (const neighbor of data.neighbors) {
      if (spouseIds.has(neighbor.personId)) continue; // spouse links handled separately

      const node = nodeMap.get(neighbor.personId);
      if (!node) continue;

      // Connect to the previous node in path, or to center
      if (neighbor.path.length >= 2) {
        const parentId = neighbor.path[neighbor.path.length - 2];
        const parentNode = nodeMap.get(parentId);
        if (parentNode) {
          layoutLinks.push({
            x1: parentNode.x,
            y1: parentNode.y,
            x2: node.x,
            y2: node.y,
            type: 'parent-child',
          });
        }
      } else {
        const center = layoutNodes[0];
        layoutLinks.push({
          x1: center.x,
          y1: center.y,
          x2: node.x,
          y2: node.y,
          type: 'parent-child',
        });
      }
    }

    // Birth order within sibling and child groups (center included among siblings).
    const siblingGroup: Person[] = [data.center];
    const childrenGroup: Person[] = [];
    for (const n of data.neighbors) {
      if (!n.person) continue;
      if (n.relationshipLabel === 'SIBLING') siblingGroup.push(n.person);
      else if (n.relationshipLabel === 'CHILD') childrenGroup.push(n.person);
    }
    assignBirthOrder(siblingGroup, orderMap);
    assignBirthOrder(childrenGroup, orderMap);

    return { nodes: layoutNodes, links: layoutLinks, birthOrder: orderMap };
  }, [data]);

  // Union links come straight from the backend (the Union table is the
  // single source of truth). We never infer couples from graph paths,
  // otherwise unrelated people like two grandparents from opposite sides
  // of the family can get linked together by coincidence.
  const spouseLinks = useMemo(() => {
    const byId = new Map(nodes.map((n) => [n.id, n] as const));
    const links: { x1: number; y1: number; x2: number; y2: number }[] = [];
    const seen = new Set<string>();
    for (const u of data.unions ?? []) {
      const a = byId.get(u.personAId);
      const b = byId.get(u.personBId);
      if (!a || !b) continue;
      const key = [a.id, b.id].sort().join('|');
      if (seen.has(key)) continue;
      seen.add(key);
      const [left, right] = a.x <= b.x ? [a, b] : [b, a];
      links.push({ x1: left.x, y1: left.y, x2: right.x, y2: right.y });
    }
    return links;
  }, [nodes, data.unions]);

  // Panning
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setPan({ x: dragStart.current.panX + dx, y: dragStart.current.panY + dy });
  }, [dragging]);

  const handleMouseUp = useCallback(() => {
    setDragging(false);
  }, []);

  // Compute SVG viewBox from node positions
  const padding = 120;
  const minX = Math.min(0, ...nodes.map((n) => n.x)) - padding;
  const maxX = Math.max(0, ...nodes.map((n) => n.x)) + padding;
  const minY = Math.min(0, ...nodes.map((n) => n.y)) - padding;
  const maxY = Math.max(0, ...nodes.map((n) => n.y)) + padding;
  const viewBox = `${minX} ${minY} ${maxX - minX} ${maxY - minY}`;

  return (
    <svg
      ref={svgRef}
      width="100%"
      height="100%"
      viewBox={viewBox}
      className="touch-none"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
        {/* Parent-child elbow connectors */}
        {links.map((link, i) => (
          <ElbowLink key={`pc-${i}`} x1={link.x1} y1={link.y1} x2={link.x2} y2={link.y2} />
        ))}

        {/* Spouse double-line connectors (opt-in via toolbar toggle) */}
        {showUnions &&
          spouseLinks.map((link, i) => (
            <SpouseLink key={`sp-${i}`} x1={link.x1} y1={link.y1} x2={link.x2} y2={link.y2} />
          ))}

        {/* Nodes */}
        {nodes.map((node) => (
          <TreeNode
            key={node.id}
            id={node.id}
            displayName={node.person.displayName}
            lifeStatus={node.person.lifeStatus}
            gender={node.person.gender}
            relationshipLabel={node.relationshipLabel}
            x={node.x}
            y={node.y}
            isCenter={node.isCenter}
            birthOrder={birthOrder.get(node.id)}
            photoUrl={node.person.primaryPhotoId ? getMediaFileUrl(node.person.primaryPhotoId) : null}
            jumpable={!!node.isSpouse && !node.isCenter && !!onJumpToPerson}
            onClick={() => {
              // Spouse nodes act as a "jump" button — clicking them
              // re-centers the tree on that person rather than opening
              // the details sheet.
              if (node.isSpouse && !node.isCenter && onJumpToPerson) {
                onJumpToPerson(node.id);
              } else {
                onSelectPerson(node.person);
              }
            }}
          />
        ))}
      </g>
    </svg>
  );
}
