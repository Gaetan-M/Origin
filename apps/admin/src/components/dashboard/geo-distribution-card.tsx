'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useT } from '@/i18n';
import { useGeoDistribution } from '@/lib/hooks/use-admin-stats';

interface BarRow {
  label: string;
  count: number;
  href?: string;
}

interface BarListProps {
  title: string;
  rows: BarRow[];
  emptyLabel: string;
  isLoading: boolean;
  barColorClass: string;
}

const BarList: React.FC<BarListProps> = ({ title, rows, emptyLabel, isLoading, barColorClass }) => {
  const router = useRouter();
  const max = Math.max(1, ...rows.map((r) => r.count));

  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-charcoal/60">
        {title}
      </h3>
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-full" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="py-4 text-center text-xs text-charcoal/60">{emptyLabel}</p>
      ) : (
        <ul className="space-y-1.5">
          {rows.slice(0, 5).map((row) => {
            const pct = Math.round((row.count / max) * 100);
            const Inner = (
              <div className="relative w-full overflow-hidden rounded-md bg-charcoal/5">
                <div
                  className={cn('absolute inset-y-0 left-0 opacity-25', barColorClass)}
                  style={{ width: `${pct}%` }}
                />
                <div className="relative flex items-center justify-between gap-2 px-2.5 py-1.5">
                  <span className="truncate text-xs font-medium text-charcoal">
                    {row.label}
                  </span>
                  <span className="text-xs font-semibold text-charcoal tabular-nums">
                    {row.count}
                  </span>
                </div>
              </div>
            );
            return (
              <li key={row.label}>
                {row.href ? (
                  <button
                    type="button"
                    onClick={() => router.push(row.href as string)}
                    className="block w-full text-left transition-opacity hover:opacity-80"
                  >
                    {Inner}
                  </button>
                ) : (
                  Inner
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export const GeoDistributionCard: React.FC = () => {
  const t = useT();
  const { data, isLoading, isError } = useGeoDistribution();

  const countries: BarRow[] = (data?.byBirthCountry ?? []).map((row) => ({
    label: row.country,
    count: row.count,
    href: `/persons?country=${encodeURIComponent(row.country)}`,
  }));
  const villages: BarRow[] = (data?.byVillage ?? []).map((row) => ({
    label: row.village,
    count: row.count,
    href: `/persons?village=${encodeURIComponent(row.village)}`,
  }));
  const regions: BarRow[] = (data?.byRegion ?? []).map((row) => ({
    label: row.region,
    count: row.count,
    href: `/persons?region=${encodeURIComponent(row.region)}`,
  }));

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-charcoal">
          {t('admin.dashboard.geo.title')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isError ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {t('admin.dashboard.geo.error')}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <BarList
              title={t('admin.dashboard.geo.country')}
              rows={countries}
              emptyLabel={t('admin.dashboard.geo.empty')}
              isLoading={isLoading}
              barColorClass="bg-deep-blue"
            />
            <BarList
              title={t('admin.dashboard.geo.village')}
              rows={villages}
              emptyLabel={t('admin.dashboard.geo.empty')}
              isLoading={isLoading}
              barColorClass="bg-forest"
            />
            <BarList
              title={t('admin.dashboard.geo.region')}
              rows={regions}
              emptyLabel={t('admin.dashboard.geo.empty')}
              isLoading={isLoading}
              barColorClass="bg-ochre"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};
