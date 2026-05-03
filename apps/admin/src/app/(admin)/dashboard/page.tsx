'use client';

import { PageHeader } from '@/components/layout/page-header';
import { KpiGrid } from '@/components/dashboard/kpi-grid';
import { GrowthChart } from '@/components/dashboard/growth-chart';
import { ModerationSummaryCard } from '@/components/dashboard/moderation-summary-card';
import { RecentActivityFeed } from '@/components/dashboard/recent-activity-feed';
import { TopContributorsList } from '@/components/dashboard/top-contributors-list';
import { GeoDistributionCard } from '@/components/dashboard/geo-distribution-card';
import { HealthPill } from '@/components/dashboard/health-pill';
import { useT } from '@/i18n';

export default function DashboardPage() {
  const t = useT();

  return (
    <>
      <PageHeader
        title={t('admin.dashboard.title')}
        subtitle={t('admin.dashboard.subtitle')}
      />

      <KpiGrid />

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <GrowthChart />
        </div>
        <div className="space-y-6">
          <HealthPill />
          <ModerationSummaryCard />
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RecentActivityFeed />
        </div>
        <div>
          <TopContributorsList />
        </div>
      </div>

      <div className="mt-6">
        <GeoDistributionCard />
      </div>
    </>
  );
}
