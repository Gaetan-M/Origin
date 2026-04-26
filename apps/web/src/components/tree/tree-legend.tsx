'use client';

/**
 * Inline SVG key describing every distinctive mark the tree uses:
 * connector shapes, life-status ring colors, and the birth-order badge.
 * Rendered below the canvas so users can decode the symbols at a glance.
 */
export function TreeLegend() {
  return (
    <div className="rounded-xl border border-sand bg-white px-4 py-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-charcoal/60">
        Légende
      </p>
      <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-charcoal">
        <LegendItem label="Filiation (parent – enfant)">
          <svg width="36" height="18" viewBox="0 0 36 18" aria-hidden>
            <path
              d="M 6 4 V 9 H 30 V 14"
              fill="none"
              stroke="#2D7A4B"
              strokeWidth={1.5}
              opacity={0.8}
            />
          </svg>
        </LegendItem>

        <LegendItem label="Mariage / union (conjoints)">
          <svg width="36" height="18" viewBox="0 0 36 18" aria-hidden>
            <line x1="4" y1="6" x2="32" y2="6" stroke="#C8663B" strokeWidth={2} opacity={0.8} />
            <line x1="4" y1="12" x2="32" y2="12" stroke="#C8663B" strokeWidth={2} opacity={0.8} />
          </svg>
        </LegendItem>

        <LegendItem label="En vie">
          <StatusRing color="#2D7A4B" />
        </LegendItem>

        <LegendItem label="Décédé(e)">
          <StatusRing color="#9CA3AF" />
        </LegendItem>

        <LegendItem label="Statut inconnu">
          <StatusRing color="#D9A441" />
        </LegendItem>

        <LegendItem label="Ordre de naissance (frères/sœurs, enfants)">
          <svg width="24" height="24" viewBox="-12 -12 24 24" aria-hidden>
            <circle r={10} fill="#D9A441" />
            <text
              textAnchor="middle"
              dominantBaseline="central"
              fill="white"
              fontSize={11}
              fontWeight={700}
            >
              1
            </text>
          </svg>
        </LegendItem>

        <LegendItem label="Cliquer pour explorer l'arbre de cette personne (conjoint)">
          <svg width="24" height="24" viewBox="-12 -12 24 24" aria-hidden>
            <circle r={10} fill="white" />
            <circle r={9} fill="#2D7A4B" />
            <path
              d="M -3 -4 L 2.5 0 L -3 4"
              fill="none"
              stroke="white"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </LegendItem>
      </div>
    </div>
  );
}

function LegendItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-6 w-9 items-center justify-center">{children}</span>
      <span className="text-xs text-charcoal/80">{label}</span>
    </div>
  );
}

function StatusRing({ color }: { color: string }) {
  return (
    <svg width="24" height="24" viewBox="-12 -12 24 24" aria-hidden>
      <circle r={9} fill="none" stroke={color} strokeWidth={3} />
    </svg>
  );
}
