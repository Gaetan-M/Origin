'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDateTime, formatPhone } from '@/lib/format';
import { useUiStore } from '@/stores/ui-store';
import { useT } from '@/i18n';
import type { VerificationRow as Row } from '@/lib/api/admin-moderation';
import { useAssignVerification } from '@/lib/hooks/use-admin-moderation';
import { VerificationResolveDialog } from './verification-resolve-dialog';

function priorityVariant(priority: number): 'destructive' | 'warning' | 'info' | 'secondary' {
  if (priority <= 2) return 'destructive';
  if (priority <= 4) return 'warning';
  if (priority <= 7) return 'info';
  return 'secondary';
}

export function VerificationRowCard({ row }: { row: Row }) {
  const t = useT();
  const locale = useUiStore((s) => s.locale);
  const [resolveOpen, setResolveOpen] = useState(false);
  const assign = useAssignVerification();

  const isPending = row.status === 'PENDING';
  const isInReview = row.status === 'IN_REVIEW';

  return (
    <>
      <Card>
        <CardContent className="grid gap-3 p-4 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-charcoal">{row.requestType}</span>
              <Badge variant={priorityVariant(row.priority)}>
                {t('admin.moderation.verification.priority')} {row.priority}
              </Badge>
              <Badge variant="outline" className="text-[10px] uppercase">
                {row.status}
              </Badge>
              {row.relatedEntityType && (
                <span className="text-xs text-charcoal/60">{row.relatedEntityType}</span>
              )}
            </div>
            <p className="text-xs text-charcoal/70">
              {row.submittedByAccount && (
                <>
                  <span className="font-medium">{t('admin.moderation.verification.submittedBy')}:</span>{' '}
                  <span className="font-mono">{formatPhone(row.submittedByAccount.phoneNumber)}</span>
                  <span className="mx-2 text-charcoal/40">·</span>
                </>
              )}
              {formatDateTime(row.submittedAt, locale)}
            </p>
          </div>
          <div className="flex items-center gap-2 lg:justify-end">
            {isPending && (
              <Button size="sm" variant="outline" onClick={() => assign.mutate(row.id)} disabled={assign.isPending}>
                {t('admin.moderation.verification.takeOver')}
              </Button>
            )}
            {isInReview && (
              <Button size="sm" onClick={() => setResolveOpen(true)}>
                {t('admin.moderation.verification.resolve')}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      <VerificationResolveDialog
        verificationId={row.id}
        open={resolveOpen}
        onOpenChange={setResolveOpen}
      />
    </>
  );
}
