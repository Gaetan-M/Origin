'use client';

import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shared/page-header';
import { CulturalContentForm } from '@/components/discover/cultural-content-form';
import { useCreateCulturalContent } from '@/lib/hooks/use-cultural';
import { useDiscoverT } from '@/components/discover/discover-i18n';
import type { CreateCulturalContentInput } from '@/lib/api/cultural';

export default function NewCulturalContentPage() {
  const router = useRouter();
  const t = useDiscoverT();
  const createContent = useCreateCulturalContent();

  async function handleSubmit(input: CreateCulturalContentInput) {
    await createContent.mutateAsync(input);
    // Submitted content is PENDING moderation; return to the feed.
    router.push('/discover');
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={t('formTitle')} showBack />
      <p className="mb-6 -mt-3 text-sm text-charcoal/60">{t('formSubtitle')}</p>
      <CulturalContentForm
        onSubmit={handleSubmit}
        isPending={createContent.isPending}
        onCancel={() => router.push('/discover')}
      />
    </div>
  );
}
