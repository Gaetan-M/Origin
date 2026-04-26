'use client';

import { LifeStatus } from '@origin/shared-types';
import { getInitials, getAvatarColor } from '@/lib/utils/format-name';
import { getRelationshipLabel } from '@/lib/utils/relationship-labels';

interface TreeNodeProps {
  id: string;
  displayName: string;
  lifeStatus: LifeStatus;
  gender?: string | null;
  relationshipLabel?: string;
  x: number;
  y: number;
  isCenter?: boolean;
  birthOrder?: number;
  photoUrl?: string | null;
  /**
   * When true, the click action re-centers the tree on this person
   * instead of opening the details sheet. Renders a small jump glyph
   * so users can tell the node is navigable.
   */
  jumpable?: boolean;
  onClick?: () => void;
}

const RADIUS = 28;
const CENTER_RADIUS = 36;

function getBorderColor(status: LifeStatus): string {
  switch (status) {
    case LifeStatus.ALIVE: return '#2D7A4B';
    case LifeStatus.DECEASED: return '#9CA3AF';
    case LifeStatus.UNKNOWN: return '#D9A441';
  }
}

const BADGE_RADIUS = 10;

export function TreeNode({ id, displayName, lifeStatus, gender, relationshipLabel, x, y, isCenter, birthOrder, photoUrl, jumpable, onClick }: TreeNodeProps) {
  const r = isCenter ? CENTER_RADIUS : RADIUS;
  const initials = getInitials(displayName);
  const bgColor = getAvatarColor(id);
  const borderColor = getBorderColor(lifeStatus);
  const nameParts = displayName.split(' ');
  const shortName = nameParts.length > 2 ? `${nameParts[0]} ${nameParts[nameParts.length - 1]}` : displayName;

  const label = relationshipLabel ? getRelationshipLabel(relationshipLabel, gender) : undefined;

  return (
    <g
      transform={`translate(${x},${y})`}
      onClick={onClick}
      className="cursor-pointer"
      role="button"
      tabIndex={0}
      aria-label={
        jumpable
          ? `Voir l'arbre de ${displayName}`
          : displayName
      }
    >
      <title>
        {jumpable ? `Voir l'arbre de ${displayName}` : displayName}
      </title>
      {/* Relationship label above node */}
      {label && !isCenter && (
        <text
          y={-(r + 10)}
          textAnchor="middle"
          fill="#6B7280"
          fontSize={10}
          fontWeight={500}
        >
          {label}
        </text>
      )}
      {/* Border ring */}
      <circle r={r + 3} fill={borderColor} opacity={0.3} />
      <circle r={r + 1.5} fill={borderColor} />
      {/* Avatar: photo clipped to circle when available, otherwise color + initials */}
      {photoUrl ? (
        <>
          <defs>
            <clipPath id={`node-clip-${id}`}>
              <circle r={r} />
            </clipPath>
          </defs>
          <circle r={r} fill={bgColor} />
          <image
            href={photoUrl}
            x={-r}
            y={-r}
            width={r * 2}
            height={r * 2}
            preserveAspectRatio="xMidYMid slice"
            clipPath={`url(#node-clip-${id})`}
          />
        </>
      ) : (
        <>
          <circle r={r} fill={bgColor} />
          <text
            textAnchor="middle"
            dominantBaseline="central"
            fill="white"
            fontSize={isCenter ? 16 : 13}
            fontWeight={600}
          >
            {initials}
          </text>
        </>
      )}
      {/* Name label below */}
      <text
        y={r + 16}
        textAnchor="middle"
        fill="#1A1A1A"
        fontSize={11}
        fontWeight={500}
      >
        {shortName.length > 18 ? shortName.slice(0, 16) + '...' : shortName}
      </text>
      {/* Birth order badge (top-right corner) */}
      {birthOrder != null && (
        <g transform={`translate(${r * 0.72},${-r * 0.72})`}>
          <circle r={BADGE_RADIUS + 1.5} fill="white" />
          <circle r={BADGE_RADIUS} fill="#D9A441" />
          <text
            textAnchor="middle"
            dominantBaseline="central"
            fill="white"
            fontSize={11}
            fontWeight={700}
          >
            {birthOrder}
          </text>
        </g>
      )}

      {/* Jump glyph (bottom-right corner) — small chevron badge that
          signals the click will re-center the tree on this person. */}
      {jumpable && (
        <g transform={`translate(${r * 0.72},${r * 0.72})`}>
          <circle r={9} fill="white" />
          <circle r={8} fill="#2D7A4B" />
          <path
            d="M -2.5 -3 L 2 0 L -2.5 3"
            fill="none"
            stroke="white"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      )}
    </g>
  );
}
