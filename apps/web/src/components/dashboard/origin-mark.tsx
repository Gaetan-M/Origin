'use client';

/**
 * Origin tree mark — the canopy/trunk/roots SVG used as a small accent in the
 * dashboard hero and various decorative spots. Hand-tuned to match the design
 * brief (palette: forest greens for canopy, terracotta for trunk + roots).
 */
export function OriginMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size * 1.2}
      viewBox="0 0 60 72"
      fill="none"
      className={className}
      style={{ display: 'block' }}
      aria-hidden
    >
      {/* Roots */}
      <g
        stroke="var(--color-terracotta-dark)"
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
        opacity="0.85"
      >
        <path d="M30 50 Q22 56 16 64" />
        <path d="M30 50 Q38 56 44 64" />
        <path d="M30 50 L30 66" />
        <path d="M30 50 Q12 60 8 68" opacity="0.5" />
        <path d="M30 50 Q48 60 52 68" opacity="0.5" />
      </g>

      {/* Trunk with bark grooves */}
      <path
        d="M27 22 Q26 36 28 50 L32 50 Q34 36 33 22 Z"
        fill="var(--color-terracotta)"
      />
      <path
        d="M28 26 L32 26 M28 32 L32 32 M28 38 L32 38"
        stroke="var(--color-terracotta-dark)"
        strokeWidth="0.6"
        opacity="0.5"
      />

      {/* Canopy clusters */}
      <g>
        <circle cx="30" cy="14" r="9" fill="var(--color-forest)" />
        <circle cx="20" cy="18" r="7" fill="var(--color-forest-light)" />
        <circle cx="40" cy="18" r="7" fill="var(--color-forest-dark)" />
        <circle cx="24" cy="10" r="5" fill="var(--color-ochre)" opacity="0.85" />
        <circle cx="36" cy="11" r="5" fill="var(--color-terracotta-light)" opacity="0.8" />
        <circle cx="30" cy="6" r="4" fill="var(--color-forest-light)" />
      </g>

      {/* Tiny figures in canopy */}
      <g fill="white" opacity="0.85">
        <circle cx="26" cy="14" r="1.2" />
        <circle cx="34" cy="13" r="1.2" />
        <circle cx="30" cy="18" r="1.1" />
      </g>
    </svg>
  );
}

/**
 * Adinkra-inspired rosette used as ambient decor in card backgrounds. Soft
 * opacity so it sits as a watermark behind content. Six-fold radial symmetry.
 */
export function AdinkraRosette({
  size = 200,
  color = 'var(--color-forest-dark)',
  opacity = 0.18,
  className,
}: {
  size?: number;
  color?: string;
  opacity?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      style={{ color, opacity }}
      className={className}
      aria-hidden
    >
      <g fill="currentColor" stroke="currentColor" strokeWidth="0.5">
        <circle cx="50" cy="50" r="3" />
        {[0, 60, 120, 180, 240, 300].map((a, i) => (
          <g key={i} transform={`rotate(${a} 50 50)`}>
            <path d="M50 14 Q56 28 50 38 Q44 28 50 14 Z" fill="currentColor" />
            <circle cx="50" cy="22" r="2" fill="white" />
          </g>
        ))}
        <circle cx="50" cy="50" r="42" fill="none" strokeDasharray="2 4" />
        <circle cx="50" cy="50" r="28" fill="none" strokeDasharray="1 3" />
      </g>
    </svg>
  );
}
