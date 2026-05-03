'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { EmptyState } from '@/components/shared/empty-state';
import { useOrphans } from '@/lib/hooks/use-admin-persons';
import { useT } from '@/i18n';

const PAGE_SIZE = 20;

export default function OrphansPage() {
  const t = useT();
  const [page, setPage] = useState(1);
  const { data, isLoading } = useOrphans(page, PAGE_SIZE);

  return (
    <>
      <PageHeader
        title={t('admin.persons.orphans.title')}
        subtitle={t('admin.persons.orphans.subtitle')}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/persons">
              <ChevronLeft className="h-4 w-4" />
              {t('admin.actions.back')}
            </Link>
          </Button>
        }
      />
      <Alert variant="info" className="mb-4">
        <AlertDescription>
          Liste des personnes sans parents, enfants, partenaires ni réclamation. Vérifiez avant suppression.
        </AlertDescription>
      </Alert>

      {isLoading && !data ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : !data || data.items.length === 0 ? (
        <EmptyState title={t('admin.persons.orphans.empty')} />
      ) : (
        <Card>
          <CardContent className="divide-y p-0">
            {data.items.map((p) => (
              <Link
                key={p.id}
                href={`/persons/${p.id}`}
                className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-off-white"
              >
                <div>
                  <p className="text-sm font-medium text-charcoal">{p.displayName}</p>
                  <p className="text-xs text-charcoal/60">
                    {p.gender ?? '—'} · {p.birthYearApproximate ?? '—'} · {p.villageOrigin ?? '—'}
                  </p>
                </div>
                <span className="text-xs text-charcoal/50">{p.lifeStatus}</span>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
      {data && data.total > PAGE_SIZE && (
        <div className="mt-4 flex items-center justify-end gap-2 text-xs text-charcoal/60">
          <span>{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, data.total)} / {data.total}</span>
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
