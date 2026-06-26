'use client';

import { ShieldCheck } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { PendingPhotos } from '@/components/moderation/pending-photos';
import { PendingSuggestions } from '@/components/moderation/pending-suggestions';
import { useModerationT } from '@/components/moderation/moderation-i18n';
import {
  useIsModerator,
  usePendingPhotos,
  usePendingSuggestions,
} from '@/lib/hooks/use-moderation';

export default function ModerationPage() {
  const t = useModerationT();
  const isModerator = useIsModerator();
  const { data: photos } = usePendingPhotos();
  const { data: suggestions } = usePendingSuggestions();

  if (!isModerator) {
    return (
      <div className="mx-auto max-w-3xl">
        <EmptyState
          icon={ShieldCheck}
          title={t('accessDenied')}
          description={t('accessDeniedDesc')}
        />
      </div>
    );
  }

  const photoCount = photos?.length ?? 0;
  const suggestionCount = suggestions?.length ?? 0;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title={t('title')} />
      <p className="-mt-2 mb-6 text-sm text-charcoal/60">{t('subtitle')}</p>

      <Tabs defaultValue="photos">
        <TabsList>
          <TabsTrigger value="photos" className="gap-2">
            {t('tabPhotos')}
            {photoCount > 0 && (
              <Badge variant="secondary" className="px-1.5">
                {photoCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="suggestions" className="gap-2">
            {t('tabSuggestions')}
            {suggestionCount > 0 && (
              <Badge variant="secondary" className="px-1.5">
                {suggestionCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="photos" className="mt-6">
          <PendingPhotos />
        </TabsContent>
        <TabsContent value="suggestions" className="mt-6">
          <PendingSuggestions />
        </TabsContent>
      </Tabs>
    </div>
  );
}
