'use client';

import { Users, UserSquare2, ShieldAlert, ListTodo } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useT } from '@/i18n';
import { useKpis } from '@/lib/hooks/use-admin-stats';
import { KpiCard } from './kpi-card';

function pctTrend(now: number, base: number): { value: number; direction: 'up' | 'down' | 'flat' } | null {
  if (base <= 0) {
    if (now > 0) return { value: 100, direction: 'up' };
    return null;
  }
  const ratio = (now / base) * 100;
  const direction: 'up' | 'down' | 'flat' = now > 0 ? 'up' : 'flat';
  return { value: Math.round(ratio), direction };
}

export const KpiGrid: React.FC = () => {
  const t = useT();
  const router = useRouter();
  const { data, isLoading, isError } = useKpis();

  if (isError) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="col-span-full rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {t('admin.dashboard.kpi.error')}
        </div>
      </div>
    );
  }

  const accountsTotal = data?.accounts.total ?? 0;
  const accountsNew30d = data?.accounts.new30d ?? 0;
  const personsTotal = data?.persons.total ?? 0;
  const personsNew7d = data?.persons.new7d ?? 0;
  const claimsPending = data?.claims.pending ?? 0;
  const moderationTotal =
    (data?.moderation.pendingMerges ?? 0) +
    (data?.moderation.pendingVerifications ?? 0) +
    (data?.moderation.pendingDocuments ?? 0);

  const accountsTrend = pctTrend(accountsNew30d, Math.max(accountsTotal - accountsNew30d, 1));
  const personsTrend = pctTrend(personsNew7d, Math.max(personsTotal - personsNew7d, 1));

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <KpiCard
        label={t('admin.dashboard.kpi.accounts')}
        value={accountsTotal}
        sublabel={`+${accountsNew30d} (30j)`}
        trend={accountsTrend}
        icon={Users}
        accent="deep-blue"
        isLoading={isLoading}
        onClick={() => router.push('/accounts')}
      />
      <KpiCard
        label={t('admin.dashboard.kpi.persons')}
        value={personsTotal}
        sublabel={`+${personsNew7d} (7j)`}
        trend={personsTrend}
        icon={UserSquare2}
        accent="forest"
        isLoading={isLoading}
        onClick={() => router.push('/persons')}
      />
      <KpiCard
        label={t('admin.dashboard.kpi.claims')}
        value={claimsPending}
        icon={ShieldAlert}
        accent={claimsPending > 0 ? 'terracotta' : 'ochre'}
        isLoading={isLoading}
        onClick={() => router.push('/moderation?tab=claims')}
      />
      <KpiCard
        label={t('admin.dashboard.kpi.moderation')}
        value={moderationTotal}
        sublabel={
          data
            ? `${data.moderation.pendingMerges}/${data.moderation.pendingVerifications}/${data.moderation.pendingDocuments}`
            : undefined
        }
        icon={ListTodo}
        accent={moderationTotal > 0 ? 'terracotta' : 'ochre'}
        isLoading={isLoading}
        onClick={() => router.push('/moderation')}
      />
    </div>
  );
};
