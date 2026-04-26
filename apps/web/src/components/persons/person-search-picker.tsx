'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PersonAvatar } from '@/components/shared/person-avatar';
import { useSearch } from '@/lib/hooks/use-search';
import { Search } from 'lucide-react';
import type { Person } from '@origin/shared-types';

interface PersonSearchPickerProps {
  onSelect: (person: Person) => void;
  excludeIds?: string[];
  filterGender?: string;
}

export function PersonSearchPicker({ onSelect, excludeIds = [], filterGender }: PersonSearchPickerProps) {
  const [query, setQuery] = useState('');
  const search = useSearch();
  const results = (search.data ?? [])
    .filter((p) => !excludeIds.includes(p.id))
    .filter((p) => !filterGender || p.gender === filterGender);

  function handleSearch() {
    if (query.trim().length < 2) return;
    search.mutate({ name: query.trim() });
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Chercher par nom..."
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearch())}
        />
        <Button type="button" size="icon" onClick={handleSearch} disabled={search.isPending}>
          <Search className="h-4 w-4" />
        </Button>
      </div>
      {search.isPending && <p className="text-sm text-charcoal/50">Recherche...</p>}
      {results.length > 0 && (
        <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border p-1">
          {results.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelect(p)}
              className="flex w-full items-center gap-3 rounded-md p-2 text-left hover:bg-sand"
            >
              <PersonAvatar id={p.id} displayName={p.displayName} lifeStatus={p.lifeStatus} size="sm" />
              <span className="truncate text-sm font-medium text-charcoal">{p.displayName}</span>
            </button>
          ))}
        </div>
      )}
      {search.data && results.length === 0 && (
        <p className="text-sm text-charcoal/50">Aucun resultat</p>
      )}
    </div>
  );
}
