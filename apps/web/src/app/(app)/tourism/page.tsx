'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { PlaceList } from '@/components/tourism/place-list';
import { SubmitPlaceForm } from '@/components/tourism/submit-place-form';
import { useSubmitTourismPlace } from '@/lib/hooks/use-tourism';
import { useTourismT } from '@/components/tourism/tourism-i18n';
import type { SubmitTourismPlaceInput } from '@/lib/api/tourism';

export default function TourismPage() {
  const t = useTourismT();
  const [formOpen, setFormOpen] = useState(false);
  const submitPlace = useSubmitTourismPlace();

  async function handleSubmit(input: SubmitTourismPlaceInput) {
    await submitPlace.mutateAsync(input);
    // Submitted place is unverified + PENDING moderation; close the sheet.
    setFormOpen(false);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <header className="mb-2 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-charcoal">{t('title')}</h1>
          <p className="text-sm text-charcoal/60">{t('subtitle')}</p>
        </div>
        <Button size="sm" className="shrink-0" onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" />
          {t('submit')}
        </Button>
      </header>

      <PlaceList />

      <Sheet open={formOpen} onOpenChange={setFormOpen}>
        <SheetContent
          side="right"
          className="w-full overflow-y-auto sm:max-w-md"
        >
          <SheetHeader>
            <SheetTitle>{t('formTitle')}</SheetTitle>
            <SheetDescription>{t('formSubtitle')}</SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <SubmitPlaceForm
              onSubmit={handleSubmit}
              isPending={submitPlace.isPending}
              onCancel={() => setFormOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
