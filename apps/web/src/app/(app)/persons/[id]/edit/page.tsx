'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { usePerson, useUpdatePerson } from '@/lib/hooks/use-persons';
import {
  PersonEditForm,
  type EditPersonPayload,
} from '@/components/persons/person-edit-form';
import { PageHeader } from '@/components/shared/page-header';
import { FullPageSpinner } from '@/components/shared/loading-spinner';
import type { CreatePersonDto, UpdatePersonDto } from '@origin/shared-types';

export default function EditPersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: person, isLoading } = usePerson(id);
  const updatePerson = useUpdatePerson(id);

  if (isLoading || !person) return <FullPageSpinner />;

  // Map the loaded Person into form-friendly defaults — null → undefined so
  // react-hook-form treats inputs as empty rather than rendering "null".
  const defaults: Partial<CreatePersonDto> = {
    displayName: person.displayName,
    lifeStatus: person.lifeStatus,
    gender: (person.gender as CreatePersonDto['gender']) ?? undefined,
    birthDate: person.birthDate ?? undefined,
    birthDatePrecision: person.birthDatePrecision,
    birthYearApproximate: person.birthYearApproximate ?? undefined,
    birthDateText: person.birthDateText ?? undefined,
    deceasedDate: person.deceasedDate ?? undefined,
    deceasedDatePrecision: person.deceasedDatePrecision,
    deceasedYearApproximate: person.deceasedYearApproximate ?? undefined,
    deceasedDateText: person.deceasedDateText ?? undefined,
    deceasedAssumed: person.deceasedAssumed ?? undefined,
    birthPlace: person.birthPlace ?? undefined,
    birthRegion: person.birthRegion ?? undefined,
    birthCountry: person.birthCountry ?? undefined,
    deceasedPlace: person.deceasedPlace ?? undefined,
    currentResidencePlace: person.currentResidencePlace ?? undefined,
    currentResidenceCountry: person.currentResidenceCountry ?? undefined,
    ethnicity: person.ethnicity ?? undefined,
    villageOrigin: person.villageOrigin ?? undefined,
    chefferie: person.chefferie ?? undefined,
    biography: person.biography ?? undefined,
    occupation: person.occupation ?? undefined,
    phoneNumber: person.phoneNumber ?? undefined,
    isPublic: person.isPublic,
  };

  async function handleSubmit(data: EditPersonPayload) {
    await updatePerson.mutateAsync(data as UpdatePersonDto);
    router.push(`/persons/${id}`);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={`Modifier ${person.displayName}`} showBack />
      <PersonEditForm
        defaultValues={defaults}
        onSubmit={handleSubmit}
        isPending={updatePerson.isPending}
      />
    </div>
  );
}
