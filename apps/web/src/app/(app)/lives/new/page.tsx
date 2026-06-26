'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/shared/page-header';
import {
  ScheduleLiveForm,
  type ScheduleSubmitExtras,
} from '@/components/lives/schedule-live-form';
import { useLivesT } from '@/components/lives/lives-i18n';
import { useCreateLiveSession } from '@/lib/hooks/use-lives';
import { inviteToLive, LIVE_SESSION_KINDS } from '@/lib/api/live';
import type { CreateLiveSessionInput, LiveSessionKind } from '@/lib/api/live';

export default function NewLivePage() {
  const t = useLivesT();
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={t('formTitle')} showBack />
      <p className="-mt-3 mb-6 text-sm text-charcoal/60">{t('formSubtitle')}</p>
      <Suspense fallback={null}>
        <NewLiveForm />
      </Suspense>
    </div>
  );
}

function isLiveKind(value: string | null): value is LiveSessionKind {
  return !!value && (LIVE_SESSION_KINDS as readonly string[]).includes(value);
}

function NewLiveForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const createLive = useCreateLiveSession();

  const kindParam = searchParams.get('kind');
  const initialKind = isLiveKind(kindParam) ? kindParam : undefined;

  async function handleSubmit(
    input: CreateLiveSessionInput,
    extras: ScheduleSubmitExtras,
  ) {
    const session = await createLive.mutateAsync(input);
    if (extras.invitePersonIds.length > 0) {
      // Best-effort: a failed invite must not block navigation to the room.
      try {
        await inviteToLive(session.id, { personIds: extras.invitePersonIds });
      } catch {
        /* ignore — host can re-invite from inside the room */
      }
    }
    router.push(`/lives/${session.id}`);
  }

  return (
    <ScheduleLiveForm
      onSubmit={handleSubmit}
      isPending={createLive.isPending}
      onCancel={() => router.push('/lives')}
      initialKind={initialKind}
    />
  );
}
