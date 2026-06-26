'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Radio } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/empty-state';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import {
  useLiveKindLabel,
  useLivesT,
} from '@/components/lives/lives-i18n';
import { useLiveByCode } from '@/lib/hooks/use-lives';

/**
 * Invite deep-link target (/lives/join/:code). Resolves the code to a session
 * and forwards LIVE sessions straight into the room; SCHEDULED/ENDED sessions
 * land on their detail page. Visibility is enforced server-side.
 */
export default function JoinByCodePage() {
  const params = useParams<{ code: string }>();
  const code = params?.code ?? null;
  const router = useRouter();
  const t = useLivesT();
  const kindLabel = useLiveKindLabel();

  const { data: session, isLoading, isError } = useLiveByCode(code);

  useEffect(() => {
    if (session && session.status === 'LIVE') {
      router.replace(`/lives/${session.id}`);
    }
  }, [router, session]);

  return (
    <div className="mx-auto max-w-md space-y-4">
      <PageHeader title={t('title')} showBack />

      {isLoading && (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3">
          <LoadingSpinner />
          <p className="text-sm text-charcoal/50">{t('joinResolving')}</p>
        </div>
      )}

      {!isLoading && (isError || !session) && (
        <EmptyState
          icon={Radio}
          title={t('joinNotFound')}
          description={t('joinNotFoundBody')}
          actionLabel={t('backToList')}
          onAction={() => router.push('/lives')}
        />
      )}

      {!isLoading && session && (
        <div className="flex flex-col items-center gap-4 rounded-xl bg-sand/60 p-8 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white">
            <Radio className="h-8 w-8 text-forest" />
          </span>
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2">
              {session.status === 'LIVE' && (
                <Badge variant="destructive" className="gap-1">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
                  {t('live')}
                </Badge>
              )}
              <Badge variant="secondary">{kindLabel(session.kind)}</Badge>
            </div>
            <h2 className="text-lg font-semibold text-charcoal">
              {session.title}
            </h2>
            {session.hostDisplayName && (
              <p className="text-sm text-charcoal/60">
                {t('hostedBy')} {session.hostDisplayName}
              </p>
            )}
          </div>
          <Button onClick={() => router.push(`/lives/${session.id}`)}>
            <Radio className="h-4 w-4" />
            {t('joinOpen')}
          </Button>
        </div>
      )}
    </div>
  );
}
