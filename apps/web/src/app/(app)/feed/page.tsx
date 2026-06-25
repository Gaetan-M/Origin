'use client';

import { FeedList } from '@/components/feed/feed-list';
import { useFeedT } from '@/components/feed/feed-i18n';

export default function FeedPage() {
  const t = useFeedT();

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <header className="mb-2">
        <h1 className="text-2xl font-bold text-charcoal">{t('title')}</h1>
        <p className="text-sm text-charcoal/60">{t('subtitle')}</p>
      </header>

      <FeedList />
    </div>
  );
}
