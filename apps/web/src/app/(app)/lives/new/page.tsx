'use client';

import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shared/page-header';
import { ScheduleLiveForm } from '@/components/lives/schedule-live-form';
import { useLivesT } from '@/components/lives/lives-i18n';
import { useCreateLiveSession } from '@/lib/hooks/use-lives';
import type { CreateLiveSessionInput } from '@/lib/api/live';

export default function NewLivePage() {
  const router = useRouter();
  const t = useLivesT();
  const createLive = useCreateLiveSession();

  async function handleSubmit(input: CreateLiveSessionInput) {
    const session = await createLive.mutateAsync(input);
    router.push(`/lives/${session.id}`);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={t('formTitle')} showBack />
      <p className="mb-6 -mt-3 text-sm text-charcoal/60">{t('formSubtitle')}</p>
      <ScheduleLiveForm
        onSubmit={handleSubmit}
        isPending={createLive.isPending}
        onCancel={() => router.push('/lives')}
      />
    </div>
  );
}
