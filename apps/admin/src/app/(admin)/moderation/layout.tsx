'use client';

import { useRouter, usePathname } from 'next/navigation';
import { PageHeader } from '@/components/layout/page-header';
import { QueueCounters } from '@/components/moderation/queue-counters';
import { DecisionBanner } from '@/components/moderation/decision-banner';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useT } from '@/i18n';

const TAB_PATH: Record<string, string> = {
  claims: '/moderation/claims',
  merges: '/moderation/merges',
  verifications: '/moderation/verifications',
  documents: '/moderation/identity-documents',
};

function activeTabFromPath(pathname: string): string {
  if (pathname.includes('/merges')) return 'merges';
  if (pathname.includes('/verifications')) return 'verifications';
  if (pathname.includes('/identity-documents')) return 'documents';
  return 'claims';
}

export default function ModerationLayout({ children }: { children: React.ReactNode }) {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const active = activeTabFromPath(pathname);

  const handleTab = (tab: string): void => {
    router.push(TAB_PATH[tab] ?? '/moderation/claims');
  };

  return (
    <>
      <PageHeader title={t('admin.moderation.title')} subtitle={t('admin.moderation.subtitle')} />
      <DecisionBanner />
      <QueueCounters activeTab={active} onTabChange={handleTab} />
      <Tabs value={active} onValueChange={handleTab} className="mt-6">
        <TabsList>
          <TabsTrigger value="claims">{t('admin.moderation.tabs.claims')}</TabsTrigger>
          <TabsTrigger value="merges">{t('admin.moderation.tabs.merges')}</TabsTrigger>
          <TabsTrigger value="verifications">{t('admin.moderation.tabs.verifications')}</TabsTrigger>
          <TabsTrigger value="documents">{t('admin.moderation.tabs.documents')}</TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="mt-4">{children}</div>
    </>
  );
}
