'use client';

interface TreeLinkProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  type: 'parent-child' | 'union' | 'adoptive';
}

/**
 * Legacy straight-line link (kept for backward compatibility with list-tree if needed).
 */
export function TreeLink({ x1, y1, x2, y2, type }: TreeLinkProps) {
  const strokeColor = type === 'union' ? '#C8663B' : '#2D7A4B';
  const strokeDash = type === 'adoptive' ? '6 4' : undefined;
  const strokeWidth = type === 'union' ? 2.5 : 1.5;

  return (
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke={strokeColor}
      strokeWidth={strokeWidth}
      strokeDasharray={strokeDash}
      opacity={0.6}
    />
  );
}

interface ElbowLinkProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/**
 * Orthogonal elbow connector for parent-child relationships.
 * Draws: vertical down from parent → horizontal to child's X → vertical down to child.
 */
export function ElbowLink({ x1, y1, x2, y2 }: ElbowLinkProps) {
  const midY = (y1 + y2) / 2;
  const d = `M ${x1} ${y1} V ${midY} H ${x2} V ${y2}`;

  return (
    <path
      d={d}
      fill="none"
      stroke="#2D7A4B"
      strokeWidth={1.5}
      opacity={0.6}
    />
  );
}

interface SpouseLinkProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/**
 * Short horizontal double-line connector between spouses.
 */
export function SpouseLink({ x1, y1, x2, y2 }: SpouseLinkProps) {
  const gap = 3; // distance between the two parallel lines

  return (
    <g>
      <line
        x1={x1}
        y1={y1 - gap}
        x2={x2}
        y2={y2 - gap}
        stroke="#C8663B"
        strokeWidth={2}
        opacity={0.6}
      />
      <line
        x1={x1}
        y1={y1 + gap}
        x2={x2}
        y2={y2 + gap}
        stroke="#C8663B"
        strokeWidth={2}
        opacity={0.6}
      />
    </g>
  );
}
