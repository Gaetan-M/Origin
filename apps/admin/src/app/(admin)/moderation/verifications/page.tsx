'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useVerifications } from '@/lib/hooks/use-admin-moderation';
import { VerificationRowCard } from '@/components/moderation/verification-row';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/empty-state';
import { useT } from '@/i18n';

const PAGE_SIZE = 20;

export default function VerificationsModerationPage() {
  const t = useT();
  const [page, setPage] = useState(1);
  const { data, isLoading } = useVerifications(page, PAGE_SIZE);

  if (isLoading && !data) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (!data || data.items.length === 0) {
    return <EmptyState title={t('admin.common.empty')} />;
  }

  return (
    <>
      <div className="space-y-3">
        {data.items.map((row) => (
          <VerificationRowCard key={row.id} row={row} />
        ))}
      </div>
      {data.total > PAGE_SIZE && (
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
