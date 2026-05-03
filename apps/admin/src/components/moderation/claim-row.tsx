'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, X, AlertCircle, ExternalLink } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDateTime, formatPhone } from '@/lib/format';
import { useT } from '@/i18n';
import type { ClaimRow as Row } from '@/lib/api/admin-moderation';
import { ClaimDecisionDialog } from './claim-decision-dialog';
import { useUiStore } from '@/stores/ui-store';

export function ClaimRowCard({ claim }: { claim: Row }) {
  const t = useT();
  const locale = useUiStore((s) => s.locale);
  const [mode, setMode] = useState<'approve' | 'reject' | 'dispute' | null>(null);

  return (
    <>
      <Card>
        <CardContent className="grid gap-3 p-4 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/persons/${claim.person.id}`}
                className="text-sm font-semibold text-deep-blue hover:underline inline-flex items-center gap-1"
              >
                {claim.person.displayName}
                <ExternalLink className="h-3 w-3" />
              </Link>
              {claim.person.birthYearApproximate && (
                <span className="text-xs text-charcoal/60">· {claim.person.birthYearApproximate}</span>
              )}
              {claim.person.villageOrigin && (
                <Badge variant="outline" className="text-[10px]">
                  {claim.person.villageOrigin}
                </Badge>
              )}
              <Badge variant="outline" className="text-[10px] uppercase">
                {claim.status}
              </Badge>
            </div>
            <p className="text-xs text-charcoal/70">
              <span className="font-medium">{t('admin.moderation.claim.requestedBy')}:</span>{' '}
              <span className="font-mono">{formatPhone(claim.account.phoneNumber)}</span>
              <span className="mx-2 text-charcoal/40">·</span>
              {formatDateTime(claim.createdAt, locale)}
            </p>
            {claim.evidence && (
              <div className="rounded-md bg-sand p-2.5 text-xs text-charcoal/80">
                <span className="font-medium">{t('admin.moderation.claim.evidence')}:</span> {claim.evidence}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 lg:justify-end">
            <Button size="sm" variant="success" onClick={() => setMode('approve')}>
              <Check className="h-3.5 w-3.5" />
              {t('admin.actions.approve')}
            </Button>
            <Button size="sm" variant="destructive" onClick={() => setMode('reject')}>
              <X className="h-3.5 w-3.5" />
              {t('admin.actions.reject')}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setMode('dispute')}>
              <AlertCircle className="h-3.5 w-3.5" />
              {t('admin.moderation.claim.dispute')}
            </Button>
          </div>
        </CardContent>
      </Card>
      {mode && (
        <ClaimDecisionDialog
          claimId={claim.id}
          mode={mode}
          open={mode !== null}
          onOpenChange={(o) => !o && setMode(null)}
        />
      )}
    </>
  );
}
