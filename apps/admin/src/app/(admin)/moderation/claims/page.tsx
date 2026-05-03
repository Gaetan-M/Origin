'use client';

import { useState } from 'react';
import { useClaims } from '@/lib/hooks/use-admin-moderation';
import { ClaimRowCard } from '@/components/moderation/claim-row';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { EmptyState } from '@/components/shared/empty-state';
import { useT } from '@/i18n';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const PAGE_SIZE = 20;

export default function ClaimsModerationPage() {
  const t = useT();
  const [status, setStatus] = useState<'PENDING' | 'DISPUTED' | 'PENDING,DISPUTED'>('PENDING,DISPUTED');
  const [page, setPage] = useState(1);
  const { data, isLoading } = useClaims(status, page, PAGE_SIZE);

  return (
    <>
      <div className="mb-3 flex items-center justify-between gap-3">
        <Select value={status} onValueChange={(v) => { setStatus(v as typeof status); setPage(1); }}>
          <SelectTrigger className="max-w-[260px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PENDING,DISPUTED">{t('admin.common.all')}</SelectItem>
            <SelectItem value="PENDING">PENDING</SelectItem>
            <SelectItem value="DISPUTED">DISPUTED</SelectItem>
          </SelectContent>
        </Select>
        {data && (
          <span className="text-xs text-charcoal/60">
            {data.total} {t('admin.common.total')}
          </span>
        )}
      </div>

      {isLoading && !data ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : !data || data.items.length === 0 ? (
        <EmptyState title={t('admin.common.empty')} />
      ) : (
        <div className="space-y-3">
          {data.items.map((claim) => (
            <ClaimRowCard key={claim.id} claim={claim} />
          ))}
        </div>
      )}

      {data && data.total > PAGE_SIZE && (
        <div className="mt-4 flex items-center justify-end gap-2 text-xs text-charcoal/60">
          <span>
            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, data.total)} / {data.total}
          </span>
          <Button variant="outline" size="icon" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" disabled={page * PAGE_SIZE >= data.total} onClick={() => setPage((p) => p + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </>
  );
}
