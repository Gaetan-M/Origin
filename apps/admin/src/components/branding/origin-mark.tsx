import { cn } from '@/lib/utils';

/**
 * Compact monogram used in the admin chrome — a single letter "O"
 * inside a deep-blue square so the surface looks distinct from the
 * forest-green user app while staying in the same brand family.
 */
export function OriginMark({ size = 28, withText = false, className }: { size?: number; withText?: boolean; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <span
        className="flex items-center justify-center rounded-md bg-deep-blue text-white shadow-sm"
        style={{ width: size, height: size, fontSize: Math.round(size * 0.55) }}
      >
        <span className="font-semibold tracking-tight">O</span>
      </span>
      {withText && (
        <span className="flex flex-col leading-tight">
          <span className="text-sm font-semibold text-charcoal">Origin</span>
          <span className="text-[10px] uppercase tracking-widest text-charcoal/50">Console admin</span>
        </span>
      )}
    </span>
  );
}
