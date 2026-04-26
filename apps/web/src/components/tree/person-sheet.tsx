'use client';

import Link from 'next/link';
import type { Person } from '@origin/shared-types';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { PersonAvatar } from '@/components/shared/person-avatar';
import { PersonPhotoGallery } from '@/components/persons/person-photo-gallery';
import { getMediaFileUrl } from '@/lib/api/media';
import { getLifeStatusLabel } from '@/lib/utils/life-status';
import { formatDate } from '@/lib/utils/format-date';
import { ExternalLink } from 'lucide-react';

interface PersonSheetProps {
  person: Person | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PersonSheet({ person, open, onOpenChange }: PersonSheetProps) {
  if (!person) return null;

  const birthDisplay = formatDate(
    person.birthDate,
    person.birthDatePrecision,
    person.birthYearApproximate,
    person.birthDateText,
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="sr-only">{person.displayName}</SheetTitle>
        </SheetHeader>

        <div className="space-y-5">
          {/* Identity header */}
          <div className="flex items-start gap-4">
            <PersonAvatar
              id={person.id}
              displayName={person.displayName}
              lifeStatus={person.lifeStatus}
              photoUrl={person.primaryPhotoId ? getMediaFileUrl(person.primaryPhotoId) : null}
              size="lg"
            />
            <div className="flex-1 space-y-1">
              <h3 className="text-lg font-semibold text-charcoal">{person.displayName}</h3>
              <p className="text-sm text-charcoal/60">{getLifeStatusLabel(person.lifeStatus)}</p>
              {birthDisplay && <p className="text-sm text-charcoal/60">{birthDisplay}</p>}
              {person.villageOrigin && (
                <p className="text-sm text-charcoal/60">{person.villageOrigin}</p>
              )}
              <div className="pt-2">
                <Link href={`/persons/${person.id}`} onClick={() => onOpenChange(false)}>
                  <Button size="sm">
                    <ExternalLink className="mr-1 h-3.5 w-3.5" />
                    Voir le profil
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Photo gallery (current photo + historical shots with editable years) */}
          <PersonPhotoGallery
            personId={person.id}
            personName={person.displayName}
            enabled={open}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
