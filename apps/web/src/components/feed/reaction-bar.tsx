'use client';

import { cn } from '@/lib/utils';
import { useToggleReaction } from '@/lib/hooks/use-family-feed';
import type { FeedReactionSummary } from '@/lib/api/family-feed';
import { useFeedT, type FeedStringKey } from './feed-i18n';

/** The fixed reaction palette. Emoji keep it low-data (no icon fonts/images). */
const REACTIONS: { type: string; emoji: string; labelKey: FeedStringKey }[] = [
  { type: 'LOVE', emoji: '❤️', labelKey: 'reactionLove' },
  { type: 'CELEBRATE', emoji: '🎉', labelKey: 'reactionCelebrate' },
  { type: 'SUPPORT', emoji: '🙌', labelKey: 'reactionSupport' },
  { type: 'PRAY', emoji: '🕊️', labelKey: 'reactionPray' },
];

interface ReactionBarProps {
  postId: string;
  reactions: FeedReactionSummary[];
}

export function ReactionBar({ postId, reactions }: ReactionBarProps) {
  const t = useFeedT();
  const toggle = useToggleReaction();

  function summaryFor(type: string): FeedReactionSummary | undefined {
    return reactions.find((r) => r.reactionType === type);
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {REACTIONS.map(({ type, emoji, labelKey }) => {
        const summary = summaryFor(type);
        const active = summary?.reactedByMe ?? false;
        const count = summary?.count ?? 0;
        return (
          <button
            key={type}
            type="button"
            disabled={toggle.isPending}
            onClick={() => toggle.mutate({ postId, reactionType: type, active })}
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
            {count > 0 && <span>{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
