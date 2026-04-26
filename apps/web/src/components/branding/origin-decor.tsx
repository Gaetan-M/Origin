'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';

/**
 * Kente-inspired multi-color band. Used as a top/bottom accent on marketing
 * surfaces. Rendered as a horizontal strip of colored segments.
 */
export function KenteBorder({
  className,
  size = 'md',
}: {
  className?: string;
  size?: 'sm' | 'md';
}) {
  const height = size === 'sm' ? 'h-1.5' : 'h-2.5';
  return (
    <div className={cn('flex w-full', height, className)} aria-hidden>
      <span className="flex-1 bg-forest" />
      <span className="flex-1 bg-ochre" />
      <span className="flex-1 bg-terracotta" />
      <span className="flex-1 bg-[var(--color-deep-blue)]" />
      <span className="flex-1 bg-ochre" />
      <span className="flex-1 bg-forest" />
      <span className="flex-1 bg-terracotta" />
      <span className="flex-1 bg-ochre" />
      <span className="flex-1 bg-forest" />
      <span className="flex-1 bg-[var(--color-deep-blue)]" />
      <span className="flex-1 bg-terracotta" />
      <span className="flex-1 bg-ochre" />
    </div>
  );
}

/**
 * Small Adinkra-inspired geometric motif. Not meant to reproduce any specific
 * traditional symbol — it borrows the vocabulary of circles, spokes and
 * quadrants found on Ghanaian stamps. Decorative only.
 */
export function AdinkraMotif({
  className,
  color = 'currentColor',
}: {
  className?: string;
  color?: string;
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      aria-hidden
      fill="none"
      stroke={color}
      strokeWidth={1.5}
    >
      <circle cx="50" cy="50" r="42" />
      <circle cx="50" cy="50" r="28" />
      <circle cx="50" cy="50" r="14" />
      {/* Eight-petal rosette */}
      {Array.from({ length: 8 }, (_, i) => {
        const angle = (i * Math.PI) / 4;
        const x1 = 50 + Math.cos(angle) * 14;
        const y1 = 50 + Math.sin(angle) * 14;
        const x2 = 50 + Math.cos(angle) * 42;
        const y2 = 50 + Math.sin(angle) * 42;
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />;
      })}
      {/* Quadrant crescents */}
      {Array.from({ length: 4 }, (_, i) => {
        const angle = (i * Math.PI) / 2 + Math.PI / 4;
        const cx = 50 + Math.cos(angle) * 28;
        const cy = 50 + Math.sin(angle) * 28;
        return <circle key={`c${i}`} cx={cx} cy={cy} r="5" />;
      })}
    </svg>
  );
}

/**
 * Background layer of slowly drifting leaves. Positions and delays are fixed
 * so the server-rendered markup matches the client — no hydration flicker.
 */
const LEAVES: Array<{
  left: string;
  delay: string;
  duration: string;
  size: number;
  dx: string;
  rot: string;
  color: string;
}> = [
  { left: '8%',  delay: '0s',   duration: '20s', size: 18, dx: '40px',  rot: '220deg', color: '#2D7A4B' },
  { left: '22%', delay: '4s',   duration: '26s', size: 14, dx: '-30px', rot: '-180deg', color: '#D9A441' },
  { left: '38%', delay: '9s',   duration: '22s', size: 20, dx: '60px',  rot: '300deg', color: '#C8663B' },
  { left: '55%', delay: '2s',   duration: '28s', size: 12, dx: '-50px', rot: '-240deg', color: '#2D7A4B' },
  { left: '70%', delay: '12s',  duration: '24s', size: 22, dx: '30px',  rot: '200deg', color: '#D9A441' },
  { left: '84%', delay: '6s',   duration: '30s', size: 16, dx: '-40px', rot: '-300deg', color: '#C8663B' },
  { left: '95%', delay: '15s',  duration: '26s', size: 14, dx: '20px',  rot: '160deg', color: '#2D7A4B' },
];

export function FloatingLeaves({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-0 overflow-hidden',
        className,
      )}
      aria-hidden
    >
      {LEAVES.map((l, i) => (
        <span
          key={i}
          className="anim-drift absolute bottom-0"
          style={
            {
              left: l.left,
              width: l.size,
              height: l.size,
              animationDelay: l.delay,
              animationDuration: l.duration,
              '--dx': l.dx,
              '--rot': l.rot,
            } as React.CSSProperties
          }
        >
          <Leaf color={l.color} />
        </span>
      ))}
    </div>
  );
}

function Leaf({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-full w-full" fill={color} aria-hidden>
      <path
        d="M12 2c-2 3-6 5-6 10 0 3.5 2.5 6 6 6s6-2.5 6-6c0-5-4-7-6-10z"
        opacity="0.85"
      />
      <path
        d="M12 4v14"
        stroke="white"
        strokeWidth="0.75"
        strokeLinecap="round"
        fill="none"
        opacity="0.6"
      />
    </svg>
  );
}

/**
 * Fixed evaporation parameters for the canopy leaves. Kept outside the
 * render so SSR and CSR produce identical markup (no Math.random).
 */
const EVAPORATING_LEAVES: Array<{
  x: number;
  y: number;
  size: number;
  color: string;
  delay: string;
  duration: string;
  dx: string;
  dy: string;
  rot: string;
  sc: string;
}> = [
  { x:  62, y: 58, size: 1.2, color: '#2D7A4B', delay: '0s',    duration: '5.5s', dx: '-18px', dy: '-115px', rot: '-85deg', sc: '0.5' },
  { x:  82, y: 50, size: 1,   color: '#D9A441', delay: '1.4s',  duration: '6s',   dx:  '10px', dy: '-125px', rot:  '70deg', sc: '0.55' },
  { x: 100, y: 44, size: 1.3, color: '#3D9A5F', delay: '0.8s',  duration: '5.2s', dx:  '-5px', dy: '-130px', rot: '-50deg', sc: '0.6' },
  { x: 120, y: 52, size: 1,   color: '#C8663B', delay: '2.2s',  duration: '6.4s', dx:  '16px', dy: '-118px', rot: '110deg', sc: '0.55' },
  { x:  72, y: 78, size: 1.1, color: '#D9A441', delay: '3s',    duration: '5.8s', dx: '-22px', dy: '-128px', rot: '-75deg', sc: '0.5' },
  { x:  98, y: 84, size: 0.9, color: '#2D7A4B', delay: '2.5s',  duration: '6s',   dx:   '8px', dy: '-140px', rot:  '60deg', sc: '0.5' },
  { x: 132, y: 80, size: 1.1, color: '#3D9A5F', delay: '1s',    duration: '6.2s', dx:  '20px', dy: '-120px', rot:  '90deg', sc: '0.55' },
  { x: 110, y: 92, size: 0.95,color: '#C8663B', delay: '3.8s',  duration: '5.5s', dx: '-12px', dy: '-135px', rot: '-60deg', sc: '0.5' },
  { x:  88, y: 66, size: 0.85,color: '#2D7A4B', delay: '4.5s',  duration: '6s',   dx:  '14px', dy: '-124px', rot:  '80deg', sc: '0.5' },
];

/**
 * Supernatural aura behind the Origin logo. Reads as a living circulatory
 * system: ancestral energy rises from the earth below, travels up through
 * the roots and trunk, and makes the canopy leaves glow.
 *
 *   - A luminous horizontal band at the very bottom is the energy source.
 *   - Eight organic tendrils surge from the band, curve up through the
 *     roots, and dissolve into a soft canopy glow where the leaves are.
 *     The stroke gradient fades at both ends so each tendril blends
 *     seamlessly into the ground band and the canopy halo.
 *   - The dash animation travels from bottom to top — you see energy
 *     *rising*, not falling.
 *   - Small sparks flicker near the ground (emerging) and on the canopy
 *     (arriving and illuminating the foliage).
 */
export function TreeEnergyAura({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-0 flex items-center justify-center',
        className,
      )}
      aria-hidden
    >
      <svg
        viewBox="0 0 200 340"
        preserveAspectRatio="xMidYMid meet"
        className="absolute inset-0 h-full w-full"
      >
        <defs>
          <filter id="origin-aura-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.6" />
          </filter>

          {/* Canopy halo — the destination. Leaves illuminated from within. */}
          <radialGradient id="origin-canopy-halo" cx="50%" cy="30%" r="55%">
            <stop offset="0%"   stopColor="#E9C461" stopOpacity="0.55" />
            <stop offset="45%"  stopColor="#D9A441" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#2D7A4B" stopOpacity="0" />
          </radialGradient>

          {/* Ground source — radial so it fades softly at every edge and
              leaves no visible rectangular boundary. */}
          <radialGradient id="origin-ground-source" cx="50%" cy="100%" r="80%">
            <stop offset="0%"   stopColor="#C8663B" stopOpacity="0.75" />
            <stop offset="28%"  stopColor="#D9A441" stopOpacity="0.42" />
            <stop offset="60%"  stopColor="#D9A441" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#D9A441" stopOpacity="0"    />
          </radialGradient>

          {/* Tendril gradient — soft at both ends so the stroke melts into
              the ground band below and the canopy halo above, vivid in
              the trunk/root zone in between. */}
          <linearGradient id="origin-tendril" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#2D7A4B" stopOpacity="0"    />
            <stop offset="18%"  stopColor="#2D7A4B" stopOpacity="0.5"  />
            <stop offset="45%"  stopColor="#2D7A4B" stopOpacity="0.85" />
            <stop offset="70%"  stopColor="#D9A441" stopOpacity="0.9"  />
            <stop offset="92%"  stopColor="#C8663B" stopOpacity="0.7"  />
            <stop offset="100%" stopColor="#C8663B" stopOpacity="0"    />
          </linearGradient>

          <linearGradient id="origin-tendril-warm" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#D9A441" stopOpacity="0"    />
            <stop offset="20%"  stopColor="#D9A441" stopOpacity="0.5"  />
            <stop offset="55%"  stopColor="#D9A441" stopOpacity="0.9"  />
            <stop offset="92%"  stopColor="#C8663B" stopOpacity="0.7"  />
            <stop offset="100%" stopColor="#C8663B" stopOpacity="0"    />
          </linearGradient>
        </defs>

        {/* Breathing canopy halo — where leaves light up. */}
        <ellipse
          cx="100"
          cy="85"
          rx="95"
          ry="80"
          fill="url(#origin-canopy-halo)"
          className="anim-pulse-soft"
          filter="url(#origin-aura-glow)"
        />
        <ellipse
          cx="100"
          cy="80"
          rx="60"
          ry="50"
          fill="url(#origin-canopy-halo)"
          className="anim-pulse-soft anim-delay-600"
          opacity="0.85"
        />

        {/* Compact earth source — a small luminous seed just under the tree,
            not a wide pool (which used to create a visible horizontal edge
            at the root tips). */}
        <ellipse
          cx="100"
          cy="335"
          rx="55"
          ry="18"
          fill="url(#origin-ground-source)"
          className="anim-pulse-soft"
          filter="url(#origin-aura-glow)"
        />

        {/* Fan of rising energy rays. All curves converge at the seed point
            (100, 340) and open outward as they climb into the root zone,
            like beams of light spreading from under the earth. Each path
            is drawn from its upper end down to the seed so the dash
            animation (which moves against the drawing direction) makes
            the particles appear to RISE along the beam. */}
        <g
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#origin-aura-glow)"
        >
          <path
            d="M 10 220 C 22 265 58 315 100 340"
            stroke="url(#origin-tendril)"
            strokeWidth="1.8"
            className="anim-flow"
          />
          <path
            d="M 40 200 C 50 255 76 315 100 340"
            stroke="url(#origin-tendril-warm)"
            strokeWidth="2"
            className="anim-flow anim-delay-200"
          />
          <path
            d="M 72 188 C 80 245 92 315 100 340"
            stroke="url(#origin-tendril)"
            strokeWidth="1.5"
            className="anim-flow anim-delay-400"
          />
          <path
            d="M 100 180 C 100 230 100 305 100 340"
            stroke="url(#origin-tendril-warm)"
            strokeWidth="1.3"
            strokeOpacity="0.8"
            className="anim-flow anim-delay-100"
          />
          <path
            d="M 128 188 C 120 245 108 315 100 340"
            stroke="url(#origin-tendril)"
            strokeWidth="1.5"
            className="anim-flow anim-delay-600"
          />
          <path
            d="M 160 200 C 150 255 124 315 100 340"
            stroke="url(#origin-tendril-warm)"
            strokeWidth="2"
            className="anim-flow anim-delay-300"
          />
          <path
            d="M 190 220 C 178 265 142 315 100 340"
            stroke="url(#origin-tendril)"
            strokeWidth="1.8"
            className="anim-flow anim-delay-800"
          />
        </g>

        {/* A few embers hovering around the seed, accentuating the origin. */}
        <g fill="#C8663B" filter="url(#origin-aura-glow)">
          <circle cx="78"  cy="330" r="1.5" className="anim-pulse-soft" />
          <circle cx="100" cy="335" r="2"   className="anim-pulse-soft anim-delay-400" />
          <circle cx="122" cy="330" r="1.5" className="anim-pulse-soft anim-delay-600" />
          <circle cx="90"  cy="337" r="1"   className="anim-pulse-soft anim-delay-200" />
          <circle cx="110" cy="337" r="1"   className="anim-pulse-soft anim-delay-800" />
        </g>

        {/* Glowing sparkles on the canopy — leaves brightening as the
            energy arrives. */}
        <g fill="#E9C461" filter="url(#origin-aura-glow)">
          <circle cx="74"  cy="62"  r="2.4" className="anim-pulse-soft anim-delay-400" />
          <circle cx="100" cy="48"  r="3"   className="anim-pulse-soft" />
          <circle cx="126" cy="65"  r="2.4" className="anim-pulse-soft anim-delay-800" />
          <circle cx="60"  cy="82"  r="1.8" className="anim-pulse-soft anim-delay-300" />
          <circle cx="140" cy="80"  r="2"   className="anim-pulse-soft anim-delay-600" />
          <circle cx="88"  cy="92"  r="1.6" className="anim-pulse-soft anim-delay-200" />
          <circle cx="115" cy="95"  r="1.8" className="anim-pulse-soft anim-delay-1200" />
        </g>

        {/* Leaves evaporating off the canopy — each leaf detaches from
            a spot on the foliage, drifts upward while rotating, and
            dissolves into the sky. Positions and motion parameters are
            fixed so the markup renders identically on server and client
            (no hydration flicker from random seeds). */}
        <g filter="url(#origin-aura-glow)">
          {EVAPORATING_LEAVES.map((l, i) => (
            <g key={i} transform={`translate(${l.x} ${l.y})`}>
              <g
                className="anim-evaporate"
                style={
                  {
                    animationDelay: l.delay,
                    animationDuration: l.duration,
                    '--dx':  l.dx,
                    '--dy':  l.dy,
                    '--rot': l.rot,
                    '--sc':  l.sc,
                  } as React.CSSProperties
                }
              >
                <g transform={`scale(${l.size})`}>
                  <path
                    d="M 0 -6 C 3 -4 4 0 3 4 C 2 6 -2 6 -3 4 C -4 0 -3 -4 0 -6 Z"
                    fill={l.color}
                    opacity="0.9"
                  />
                  <path
                    d="M 0 -5 L 0 5"
                    stroke="white"
                    strokeOpacity="0.35"
                    strokeWidth="0.6"
                    fill="none"
                    strokeLinecap="round"
                  />
                </g>
              </g>
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}

/**
 * Branded logo with optional wordmark. Sizes are constrained so the PNG
 * never blows up past its natural height.
 */
export function OriginLogo({
  size = 32,
  withText = true,
  className,
  priority,
}: {
  size?: number;
  withText?: boolean;
  className?: string;
  priority?: boolean;
}) {
  return (
    <span className={cn('flex items-center gap-2', className)}>
      <Image
        src="/origin-logo.png"
        alt="Origin"
        width={size}
        height={Math.round(size * 1.56)}
        className="h-auto w-auto"
        style={{ height: size, width: 'auto' }}
        priority={priority}
      />
      {withText && (
        <span className="text-lg font-bold tracking-tight text-charcoal">
          Origin
        </span>
      )}
    </span>
  );
}
