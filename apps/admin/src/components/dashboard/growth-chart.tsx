'use client';

import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useT } from '@/i18n';
import { useGrowth } from '@/lib/hooks/use-admin-stats';

type Range = 7 | 30 | 90;

interface ChartPoint {
  date: string;
  label: string;
  accounts: number;
  persons: number;
  contributions: number;
}

const COLOR_ACCOUNTS = '#1B3A57'; // deep-blue
const COLOR_PERSONS = '#2F5D3A'; // forest
const COLOR_CONTRIB = '#C9A227'; // ochre

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: '2-digit' });
  } catch {
    return iso;
  }
}

const ChartTooltip: React.FC<TooltipProps<number, string> & { labels: { accounts: string; persons: string; contributions: string } }> = ({
  active,
  payload,
  label,
  labels,
}) => {
  if (!active || !payload || payload.length === 0) return null;
  const map = new Map(payload.map((p) => [p.dataKey as string, p.value as number]));
  return (
    <div className="rounded-md border border-charcoal/10 bg-white p-3 shadow-md text-xs">
      <p className="font-medium text-charcoal mb-1">{label}</p>
      <div className="space-y-0.5">
        <p className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: COLOR_ACCOUNTS }} />
          <span className="text-charcoal/70">{labels.accounts}:</span>
          <span className="font-medium text-charcoal tabular-nums">{map.get('accounts') ?? 0}</span>
        </p>
        <p className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: COLOR_PERSONS }} />
          <span className="text-charcoal/70">{labels.persons}:</span>
          <span className="font-medium text-charcoal tabular-nums">{map.get('persons') ?? 0}</span>
        </p>
        <p className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: COLOR_CONTRIB }} />
          <span className="text-charcoal/70">{labels.contributions}:</span>
          <span className="font-medium text-charcoal tabular-nums">{map.get('contributions') ?? 0}</span>
        </p>
      </div>
    </div>
  );
};

export const GrowthChart: React.FC = () => {
  const t = useT();
  const [range, setRange] = useState<Range>(30);
  const { data, isLoading, isError } = useGrowth(range);

  const chartData = useMemo<ChartPoint[]>(() => {
    if (!data) return [];
    return data.map((p) => ({
      date: p.date,
      label: formatDate(p.date),
      accounts: p.accounts,
      persons: p.persons,
      contributions: p.contributions,
    }));
  }, [data]);

  const tooltipLabels = {
    accounts: t('admin.dashboard.kpi.accounts'),
    persons: t('admin.dashboard.kpi.persons'),
    contributions: t('admin.dashboard.growth.contributions'),
  };

  const ranges: { value: Range; label: string }[] = [
    { value: 7, label: t('admin.dashboard.growth.range7') },
    { value: 30, label: t('admin.dashboard.growth.range30') },
    { value: 90, label: t('admin.dashboard.growth.range90') },
  ];

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base font-semibold text-charcoal">
          {t('admin.dashboard.growth.title')}
        </CardTitle>
        <div className="inline-flex rounded-md border border-charcoal/10 bg-off-white p-0.5">
          {ranges.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setRange(r.value)}
              className={cn(
                'rounded px-2.5 py-1 text-xs font-medium transition',
                range === r.value
                  ? 'bg-deep-blue text-white shadow-sm'
                  : 'text-charcoal/70 hover:text-charcoal',
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-72 w-full" />
        ) : isError ? (
          <div className="flex h-72 items-center justify-center rounded-md border border-red-200 bg-red-50 text-sm text-red-700">
            {t('admin.dashboard.growth.error')}
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex h-72 items-center justify-center text-sm text-charcoal/60">
            {t('admin.dashboard.growth.empty')}
          </div>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 8, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="grad-accounts" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLOR_ACCOUNTS} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={COLOR_ACCOUNTS} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="grad-persons" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLOR_PERSONS} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={COLOR_PERSONS} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="grad-contrib" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLOR_CONTRIB} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={COLOR_CONTRIB} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} width={32} />
                <Tooltip content={<ChartTooltip labels={tooltipLabels} />} />
                <Area
                  type="monotone"
                  dataKey="accounts"
                  stroke={COLOR_ACCOUNTS}
                  strokeWidth={2}
                  fill="url(#grad-accounts)"
                />
                <Area
                  type="monotone"
                  dataKey="persons"
                  stroke={COLOR_PERSONS}
                  strokeWidth={2}
                  fill="url(#grad-persons)"
                />
                <Area
                  type="monotone"
                  dataKey="contributions"
                  stroke={COLOR_CONTRIB}
                  strokeWidth={2}
                  fill="url(#grad-contrib)"
                />
              </AreaChart>
            </ResponsiveContainer>
            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-charcoal/70">
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: COLOR_ACCOUNTS }} />
                {tooltipLabels.accounts}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: COLOR_PERSONS }} />
                {tooltipLabels.persons}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: COLOR_CONTRIB }} />
                {tooltipLabels.contributions}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
