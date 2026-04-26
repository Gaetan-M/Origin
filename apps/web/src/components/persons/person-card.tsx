'use client';

import Link from 'next/link';
import type { Person } from '@origin/shared-types';
import { Card, CardContent } from '@/components/ui/card';
import { PersonAvatar } from '@/components/shared/person-avatar';
import { getLifeStatusLabel } from '@/lib/utils/life-status';
import { formatDate } from '@/lib/utils/format-date';

interface PersonCardProps {
  person: Person;
  subtitle?: string;
}

export function PersonCard({ person, subtitle }: PersonCardProps) {
  const birthDisplay = formatDate(person.birthDate, person.birthDatePrecision, person.birthYearApproximate, person.birthDateText);

  return (
    <Link href={`/persons/${person.id}`}>
      <Card className="transition-shadow hover:shadow-elevated">
        <CardContent className="flex items-center gap-4 p-4">
          <PersonAvatar
            id={person.id}
            displayName={person.displayName}
            lifeStatus={person.lifeStatus}
            size="sm"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-charcoal">{person.displayName}</p>
            <div className="flex items-center gap-2 text-xs text-charcoal/60">
              {subtitle && (
                <>
                  <span className="font-medium text-forest">{subtitle}</span>
                  <span>·</span>
                </>
              )}
              <span>{getLifeStatusLabel(person.lifeStatus)}</span>
              {birthDisplay && (
                <>
                  <span>·</span>
                  <span>{birthDisplay}</span>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
