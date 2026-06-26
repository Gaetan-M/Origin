'use client';

import { cn } from '@/lib/utils';
import type { EngagementCounts } from '@/lib/api/engagement';

interface EngagementCountsStripProps {
  counts?: EngagementCounts;
  /** Show the star rating chip (tourism places only). */
  showRating?: boolean;
  className?: string;
}

/**
 * A subtle, compact strip of engagement counts shown on list cards to make the
 * surface feel alive: ❤️ reactions · 💬 comments · 📷 photos (· ★ rating).
 * Zero counts are hidden gracefully; renders nothing when there's nothing to show.
 */
export function EngagementCountsStrip({
  counts,
  showRating = false,
  className,
}: EngagementCountsStripProps) {
  if (!counts) return null;

  const hasRating = showRating && counts.ratingCount > 0 && counts.ratingAverage !== null;
  const bits: { key: string; node: React.ReactNode }[] = [];

  if (counts.totalReactions > 0) {
    bits.push({ key: 'r', node: <span>❤️ {counts.totalReactions}</span> });
  }
  if (counts.commentCount > 0) {
    bits.push({ key: 'c', node: <span>💬 {counts.commentCount}</span> });
  }
  if (counts.photoCount > 0) {
    bits.push({ key: 'p', node: <span>📷 {counts.photoCount}</span> });
  }
  if (hasRating) {
    bits.push({
      key: 's',
      node: (
        <span className="font-semibold text-ochre">
          ★ {counts.ratingAverage!.toFixed(1)}{' '}
          <span className="font-normal text-charcoal/40">({counts.ratingCount})</span>
        </span>
      ),
    });
  }

  if (bits.length === 0) return null;

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-charcoal/55',
        className,
      )}
    >
      {bits.map((b) => (
        <span key={b.key} className="inline-flex items-center">
          {b.node}
        </span>
      ))}
    </div>
  );
}
