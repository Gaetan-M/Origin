'use client';

import { useState } from 'react';
import type { AdminAuditLog } from '@origin/shared-types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/empty-state';
import { formatDateTime } from '@/lib/format';
import { useUiStore } from '@/stores/ui-store';
import { useAccountAuditTrail } from '@/lib/hooks/use-admin-accounts';
import { useT } from '@/i18n';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AdminActionSeverity } from '@origin/shared-types';

const SEVERITY_CLASS: Record<AdminActionSeverity, string> = {
  INFO: 'bg-charcoal/5 text-charcoal/70',
  NOTICE: 'bg-info-light text-deep-blue',
  WARNING: 'bg-warning-light text-warning-dark',
  CRITICAL: 'bg-error-light text-error',
};

export function AccountAuditTrail({ accountId }: { accountId: string }) {
  const t = useT();
  const locale = useUiStore((s) => s.locale);
  const [page, setPage] = useState(1);
  const limit = 10;
  const { data, isLoading } = useAccountAuditTrail(accountId, page, limit);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('admin.accounts.tabs.audit')}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && !data ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : !data || data.items.length === 0 ? (
          <EmptyState title={t('admin.common.empty')} />
        ) : (
          <>
            <ul className="divide-y">
              {data.items.map((entry: AdminAuditLog) => (
                <li key={entry.id} className="flex items-start justify-between gap-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-charcoal">{entry.action}</span>
                      <Badge variant="outline" className={cn('text-[10px]', SEVERITY_CLASS[entry.severity])}>
                        {t(`admin.severity.${entry.severity}`)}
                      </Badge>
                      <span className="text-xs text-charcoal/50">{entry.category}</span>
                    </div>
                    {entry.reason && (
                      <p className="mt-1 truncate text-xs text-charcoal/60">{entry.reason}</p>
                    )}
                  </div>
                  <span className="shrink-0 text-xs text-charcoal/50">{formatDateTime(entry.createdAt, locale)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex items-center justify-between text-xs text-charcoal/60">
              <span>
                {(page - 1) * limit + 1}–{Math.min(page * limit, data.total)} / {data.total}
              </span>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  disabled={page * limit >= data.total}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
