'use client';

import { PageHeader } from '@/components/shared/page-header';
import { SearchForm } from '@/components/search/search-form';
import { PersonCard } from '@/components/persons/person-card';
import { EmptyState } from '@/components/shared/empty-state';
import { useSearch } from '@/lib/hooks/use-search';
import { Search } from 'lucide-react';
import { useT } from '@/i18n';

export default function SearchPage() {
  const search = useSearch();
  const results = search.data;
  const t = useT();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={t('search.title')} />
      <SearchForm onSearch={(params) => search.mutate(params)} isPending={search.isPending} />

      <div className="mt-6">
        {results !== undefined && (
          <>
            <p className="mb-3 text-sm text-charcoal/60">{t('search.results', { count: results.length })}</p>
            {results.length === 0 ? (
              <EmptyState icon={Search} title={t('common.noResults')} />
            ) : (
              <div className="space-y-2">
                {results.map((person) => (
                  <PersonCard key={person.id} person={person} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
