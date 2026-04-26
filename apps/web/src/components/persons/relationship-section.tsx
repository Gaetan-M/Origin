'use client';

import { Plus } from 'lucide-react';
import type { Person } from '@origin/shared-types';
import { Button } from '@/components/ui/button';
import { PersonCard } from './person-card';
import { useT } from '@/i18n';

interface AddChoice {
  label: string;
  onClick: () => void;
}

interface RelationshipSectionProps {
  title: string;
  persons: Person[];
  isLoading?: boolean;
  getLabel?: (person: Person) => string;
  addChoices?: AddChoice[];
  /** @deprecated Use addChoices instead */
  onAdd?: () => void;
}

export function RelationshipSection({ title, persons, isLoading, getLabel, addChoices, onAdd }: RelationshipSectionProps) {
  const t = useT();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-charcoal">{title}</h3>
        <div className="flex gap-1">
          {addChoices ? (
            addChoices.map((choice) => (
              <Button key={choice.label} variant="ghost" size="sm" onClick={choice.onClick}>
                <Plus className="mr-1 h-4 w-4" />
                {choice.label}
              </Button>
            ))
          ) : onAdd ? (
            <Button variant="ghost" size="sm" onClick={onAdd}>
              <Plus className="mr-1 h-4 w-4" />
              {t('common.add')}
            </Button>
          ) : null}
        </div>
      </div>
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-sand" />
          ))}
        </div>
      ) : persons.length === 0 ? (
        <p className="py-2 text-sm text-charcoal/50">{t('person.noRelatives')}</p>
      ) : (
        <div className="space-y-2">
          {persons.map((p) => (
            <PersonCard key={p.id} person={p} subtitle={getLabel?.(p)} />
          ))}
        </div>
      )}
    </div>
  );
}
