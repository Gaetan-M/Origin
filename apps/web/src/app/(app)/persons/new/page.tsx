'use client';

import { Suspense, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/shared/page-header';
import { PersonFormWizard } from '@/components/persons/person-form-wizard';
import { FullPageSpinner } from '@/components/shared/loading-spinner';
import { useCreatePerson } from '@/lib/hooks/use-persons';
import type { CreatePersonDto } from '@origin/shared-types';
import { LifeStatus } from '@origin/shared-types';

function NewPersonContent() {
  const router = useRouter();
  const params = useSearchParams();
  const createPerson = useCreatePerson();

  // Pre-fill the form when arriving from a kinship-probe response: the
  // responder is adding the requester to their tree, so we want the name and
  // phone already populated to minimise friction.
  const defaults = useMemo<Partial<CreatePersonDto>>(() => {
    const prefillName = params.get('prefillName');
    const prefillPhone = params.get('prefillPhone');
    const out: Partial<CreatePersonDto> = { lifeStatus: LifeStatus.ALIVE };
    if (prefillName) out.displayName = prefillName;
    if (prefillPhone) out.phoneNumber = prefillPhone;
    return out;
  }, [params]);

  async function handleSubmit(data: CreatePersonDto) {
    const person = await createPerson.mutateAsync(data);
    router.push(`/persons/${person.id}`);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Ajouter une personne" showBack />
      <PersonFormWizard
        onSubmit={handleSubmit}
        isPending={createPerson.isPending}
        defaultValues={defaults}
      />
    </div>
  );
}

export default function NewPersonPage() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <NewPersonContent />
    </Suspense>
  );
}
