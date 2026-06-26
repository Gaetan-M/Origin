'use client';

import { useState } from 'react';
import { Plus, Compass } from 'lucide-react';
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
    <div className="mx-auto max-w-3xl space-y-5">
      {/* Welcoming hero */}
      <header className="overflow-hidden rounded-2xl border border-sand bg-gradient-to-br from-forest to-forest-dark p-5 text-white shadow-card">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide">
              <Compass className="h-3.5 w-3.5" />
              {t('title')}
            </span>
            <h1 className="text-2xl font-bold leading-tight">{t('heroTitle')}</h1>
            <p className="max-w-md text-sm text-white/80">{t('heroSubtitle')}</p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            className="shrink-0"
            onClick={() => setFormOpen(true)}
          >
            <Plus className="h-4 w-4" />
            {t('submit')}
          </Button>
        </div>
      </header>

      <PlaceList />

      <Sheet open={formOpen} onOpenChange={setFormOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
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
