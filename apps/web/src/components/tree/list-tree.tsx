'use client';

import { useState } from 'react';
import type { FamilyTree, Person } from '@origin/shared-types';
import { LifeStatus } from '@origin/shared-types';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { PersonAvatar } from '@/components/shared/person-avatar';
import { getLifeStatusLabel } from '@/lib/utils/life-status';
import { getRelationshipLabel } from '@/lib/utils/relationship-labels';

interface ListTreeProps {
  data: FamilyTree;
  onSelectPerson: (person: Person) => void;
}

export function ListTree({ data, onSelectPerson }: ListTreeProps) {
  const [expandedDegrees, setExpandedDegrees] = useState<Set<number>>(new Set([1, 2]));

  // Group by degree
  const byDegree = new Map<number, { person: Person; label: string }[]>();
  for (const n of data.neighbors) {
    const arr = byDegree.get(n.degree) ?? [];
    const person = n.person ?? {
      id: n.personId,
      displayName: n.personId.slice(0, 8),
      lifeStatus: LifeStatus.UNKNOWN,
    } as Person;
    const label = getRelationshipLabel(n.relationshipLabel, person.gender);
    arr.push({ person, label });
    byDegree.set(n.degree, arr);
  }

  function toggleDegree(d: number) {
    setExpandedDegrees((prev) => {
      const next = new Set(prev);
      if (next.has(d)) next.delete(d);
      else next.add(d);
      return next;
    });
  }

  return (
    <div className="space-y-2">
      {/* Center person */}
      <button
        onClick={() => onSelectPerson(data.center)}
        className="flex w-full items-center gap-3 rounded-lg bg-forest/5 p-3 text-left transition-colors hover:bg-forest/10"
      >
        <PersonAvatar id={data.center.id} displayName={data.center.displayName} lifeStatus={data.center.lifeStatus} size="sm" />
        <div>
          <p className="font-medium text-charcoal">{data.center.displayName}</p>
          <p className="text-xs text-charcoal/50">Moi</p>
        </div>
      </button>

      {/* Degrees */}
      {Array.from(byDegree.entries())
        .sort(([a], [b]) => a - b)
        .map(([degree, members]) => {
          const expanded = expandedDegrees.has(degree);
          return (
            <div key={degree}>
              <button
                onClick={() => toggleDegree(degree)}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-charcoal/70 hover:bg-sand"
              >
                {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                Degre {degree} ({members.length})
              </button>
              {expanded && (
                <div className="ml-4 space-y-1">
                  {members.map(({ person, label }) => (
                    <button
                      key={person.id}
                      onClick={() => onSelectPerson(person)}
                      className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-sand"
                    >
                      <PersonAvatar id={person.id} displayName={person.displayName} lifeStatus={person.lifeStatus} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-charcoal">{person.displayName}</p>
                        <p className="text-xs text-charcoal/50">
                          <span className="font-medium text-forest">{label}</span>
                          {' · '}
                          {getLifeStatusLabel(person.lifeStatus)}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
    </div>
  );
}
