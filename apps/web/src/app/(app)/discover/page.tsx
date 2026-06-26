'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DiscoverFeed } from '@/components/discover/discover-feed';
import { useDiscoverT } from '@/components/discover/discover-i18n';

export default function DiscoverPage() {
  const t = useDiscoverT();

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <header className="mb-2 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-charcoal">{t('title')}</h1>
          <p className="text-sm text-charcoal/60">{t('subtitle')}</p>
        </div>
        <Button asChild size="sm" className="shrink-0">
          <Link href="/discover/new">
            <Plus className="h-4 w-4" />
            {t('share')}
          </Link>
        </Button>
      </header>

      <DiscoverFeed />
    </div>
  );
}
