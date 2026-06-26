'use client';

import { Check, Loader2, MessageSquare, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/shared/empty-state';
import type { PendingSuggestion } from '@/lib/api/moderation';
import {
  usePendingSuggestions,
  useModerateSuggestion,
} from '@/lib/hooks/use-moderation';
import {
  useModerationT,
  useModerationLocale,
  useFieldLabel,
} from './moderation-i18n';

export function PendingSuggestions() {
  const t = useModerationT();
  const { data, isLoading } = usePendingSuggestions();
  const moderate = useModerateSuggestion();
  const suggestions = data ?? [];

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (suggestions.length === 0) {
    return <EmptyState icon={MessageSquare} title={t('noSuggestions')} />;
  }

  return (
    <div className="space-y-3">
      {suggestions.map((suggestion) => (
        <SuggestionCard
          key={suggestion.id}
          suggestion={suggestion}
          isPending={moderate.isPending && moderate.variables?.id === suggestion.id}
          onDecide={(decision) => moderate.mutate({ id: suggestion.id, decision })}
        />
      ))}
    </div>
  );
}

function SuggestionCard({
  suggestion,
  isPending,
  onDecide,
}: {
  suggestion: PendingSuggestion;
  isPending: boolean;
  onDecide: (decision: 'APPROVE' | 'REJECT') => void;
}) {
  const t = useModerationT();
  const locale = useModerationLocale();
  const fieldLabel = useFieldLabel();
  const isPlace = suggestion.targetType === 'TOURISM_PLACE';

  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">
            {isPlace ? t('targetPlace') : t('targetContent')}
          </Badge>
          <Badge variant="outline">{fieldLabel(suggestion.field)}</Badge>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-charcoal/55">
            {t('proposedValue')}
          </p>
          <blockquote className="mt-1 border-l-4 border-forest/40 bg-sand/50 px-3 py-2 text-sm text-charcoal">
            {suggestion.proposedValue}
          </blockquote>
        </div>

        {suggestion.note && (
          <p className="rounded-md bg-sand/40 px-3 py-2 text-sm text-charcoal/75">
            <span className="font-medium">{t('note')} : </span>
            {suggestion.note}
          </p>
        )}

        <p className="text-xs text-charcoal/55">
          {t('by')} {suggestion.authorDisplayName ?? t('unknownAuthor')} ·{' '}
          {new Date(suggestion.createdAt).toLocaleDateString(locale)}
        </p>

        <div className="flex flex-wrap gap-2 pt-1">
          <Button
            size="sm"
            disabled={isPending}
            onClick={() => onDecide('APPROVE')}
            className="bg-green-600 text-white hover:bg-green-700"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            {t('approve')}
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={isPending}
            onClick={() => onDecide('REJECT')}
          >
            <X className="h-4 w-4" />
            {t('reject')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
