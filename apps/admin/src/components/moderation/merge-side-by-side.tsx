'use client';

import { useState } from 'react';
import { GitMerge, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useT } from '@/i18n';
import type { MergeRow, PersonPreview } from '@/lib/api/admin-moderation';
import { MergeDecisionDialog } from './merge-decision-dialog';

function PersonColumn({
  person,
  selected,
  onSelect,
  side,
}: {
  person: PersonPreview;
  selected: boolean;
  onSelect: () => void;
  side: 'A' | 'B';
}) {
  const t = useT();
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex flex-col gap-2 rounded-lg border-2 p-4 text-left transition-all',
        selected ? 'border-deep-blue bg-deep-blue/5 ring-1 ring-deep-blue/20' : 'border-charcoal/10 hover:bg-off-white',
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-charcoal/50">Personne {side}</span>
        {selected && <Badge variant="success">{t('admin.moderation.merge.keeper')}</Badge>}
      </div>
      <p className="text-base font-semibold text-charcoal">{person.displayName}</p>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        <dt className="text-charcoal/50">Genre</dt>
        <dd className="text-charcoal">{person.gender ?? '—'}</dd>
        <dt className="text-charcoal/50">Naissance</dt>
        <dd className="text-charcoal">{person.birthYearApproximate ?? '—'}</dd>
        <dt className="text-charcoal/50">Décès</dt>
        <dd className="text-charcoal">{person.deceasedYearApproximate ?? '—'}</dd>
        <dt className="text-charcoal/50">Village</dt>
        <dd className="text-charcoal truncate">{person.villageOrigin ?? '—'}</dd>
        <dt className="text-charcoal/50">Région</dt>
        <dd className="text-charcoal truncate">{person.birthRegion ?? '—'}</dd>
        <dt className="text-charcoal/50">Pays</dt>
        <dd className="text-charcoal truncate">{person.birthCountry ?? '—'}</dd>
      </dl>
    </button>
  );
}

export function MergeSideBySide({ proposal }: { proposal: MergeRow }) {
  const t = useT();
  const [keeper, setKeeper] = useState<string | null>(null);
  const [mode, setMode] = useState<'approve' | 'reject' | null>(null);

  const signals = proposal.matchingSignals ?? {};

  return (
    <>
      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <GitMerge className="h-4 w-4 text-deep-blue" />
              <span className="text-sm font-semibold text-charcoal">{t('admin.moderation.merge.title')}</span>
              <Badge variant="info">
                {t('admin.moderation.merge.score')} {Math.round(Number(proposal.matchScore) * 100)}%
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="success"
                disabled={!keeper}
                onClick={() => setMode('approve')}
              >
                {t('admin.moderation.merge.approve')}
              </Button>
              <Button size="sm" variant="destructive" onClick={() => setMode('reject')}>
                <X className="h-3.5 w-3.5" />
                {t('admin.moderation.merge.reject')}
              </Button>
            </div>
          </div>

          {Object.keys(signals).length > 0 && (
            <div className="rounded-md bg-sand p-2.5 text-xs">
              <span className="font-medium text-charcoal/80">{t('admin.moderation.merge.signals')}:</span>{' '}
              <span className="text-charcoal/70">
                {Object.entries(signals)
                  .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
                  .join(' · ')}
              </span>
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            <PersonColumn
              person={proposal.personA}
              selected={keeper === proposal.personA.id}
              onSelect={() => setKeeper(proposal.personA.id)}
              side="A"
            />
            <PersonColumn
              person={proposal.personB}
              selected={keeper === proposal.personB.id}
              onSelect={() => setKeeper(proposal.personB.id)}
              side="B"
            />
          </div>

          <Separator />
          <p className="text-xs text-charcoal/60">{t('admin.moderation.merge.consequence')}</p>
        </CardContent>
      </Card>
      {mode && (
        <MergeDecisionDialog
          mergeId={proposal.id}
          mode={mode}
          keeperPersonId={keeper}
          open={mode !== null}
          onOpenChange={(o) => !o && setMode(null)}
        />
      )}
    </>
  );
}
