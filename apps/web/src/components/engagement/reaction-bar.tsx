'use client';

import { cn } from '@/lib/utils';
import { useEngagementSummary, useToggleReaction } from '@/lib/hooks/use-engagement';
import type { EngagementReactionType, EngagementTarget } from '@/lib/api/engagement';
import { useEngagementT, type EngagementStringKey } from './engagement-i18n';

/** Fixed reaction palette — emoji keep it low-data (no icon fonts/images). */
const REACTIONS: { type: EngagementReactionType; emoji: string; labelKey: EngagementStringKey }[] = [
  { type: 'LIKE', emoji: '❤️', labelKey: 'reactionLike' },
  { type: 'LOVE', emoji: '😍', labelKey: 'reactionLove' },
  { type: 'WOW', emoji: '😮', labelKey: 'reactionWow' },
  { type: 'VISITED', emoji: '📍', labelKey: 'reactionVisited' },
];

interface ReactionBarProps {
  target: EngagementTarget;
  id: string;
}

export function ReactionBar({ target, id }: ReactionBarProps) {
  const t = useEngagementT();
  const { data: summary } = useEngagementSummary(target, id);
  const toggle = useToggleReaction(target, id);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {REACTIONS.map(({ type, emoji, labelKey }) => {
        const active = summary?.myReaction === type;
        const count = summary?.reactions[type] ?? 0;
        return (
          <button
            key={type}
            type="button"
            disabled={toggle.isPending || !summary}
            onClick={() => toggle.mutate(type)}
            aria-pressed={active}
            aria-label={t(labelKey)}
            title={t(labelKey)}
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50',
              active
                ? 'border-forest bg-forest/10 text-forest'
                : 'border-transparent bg-sand text-charcoal/70 hover:bg-sand-dark',
            )}
          >
            <span aria-hidden>{emoji}</span>
            <span className="hidden sm:inline">{t(labelKey)}</span>
            {count > 0 && <span className="font-semibold">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
