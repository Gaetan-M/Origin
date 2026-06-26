'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useEngagementSummary, useRatePlace } from '@/lib/hooks/use-engagement';
import type { EngagementTarget } from '@/lib/api/engagement';
import { useEngagementT } from './engagement-i18n';

interface StarRatingProps {
  target: EngagementTarget;
  id: string;
}

const STARS = [1, 2, 3, 4, 5];

export function StarRating({ target, id }: StarRatingProps) {
  const t = useEngagementT();
  const { data: summary } = useEngagementSummary(target, id);
  const rate = useRatePlace(target, id);
  const [hover, setHover] = useState<number | null>(null);

  const rating = summary?.rating ?? null;
  const mine = rating?.mine ?? null;
  // What to paint: hovered value if hovering, else my own rating.
  const painted = hover ?? mine ?? 0;

  function handleRate(stars: number) {
    rate.mutate(stars, {
      onSuccess: () => toast.success(t('ratingSaved')),
      onError: () => toast.error(t('rateError')),
    });
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-bold uppercase tracking-wide text-charcoal/50">
        {t('ratingTitle')}
      </h3>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-0.5" onMouseLeave={() => setHover(null)}>
          {STARS.map((star) => {
            const filled = star <= painted;
            return (
              <button
                key={star}
                type="button"
                disabled={rate.isPending}
                onClick={() => handleRate(star)}
                onMouseEnter={() => setHover(star)}
                aria-label={`${star} / 5`}
                title={`${star} / 5`}
                className="p-0.5 transition-transform hover:scale-110 disabled:opacity-50"
              >
                <Star
                  className={cn(
                    'h-6 w-6 transition-colors',
                    filled ? 'fill-ochre text-ochre' : 'fill-transparent text-charcoal/30',
                  )}
                />
              </button>
            );
          })}
        </div>

        <div className="text-sm text-charcoal/60">
          {rating && rating.count > 0 ? (
            <span>
              <span className="font-bold text-charcoal">{rating.average.toFixed(1)}</span>
              <span className="text-charcoal/40"> / 5</span>
              <span className="ml-1.5 text-xs text-charcoal/50">
                ({rating.count} {t('reviews')})
              </span>
            </span>
          ) : (
            <span className="text-xs text-charcoal/50">{t('noRatingsYet')}</span>
          )}
        </div>
      </div>
      {mine !== null && (
        <p className="text-[11px] text-charcoal/45">
          {t('yourRating')}: {mine} / 5
        </p>
      )}
    </div>
  );
}
