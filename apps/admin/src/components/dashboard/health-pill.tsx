'use client';

import { CheckCircle2, AlertTriangle, XCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useT } from '@/i18n';
import { useHealth } from '@/lib/hooks/use-admin-stats';
import type { HealthStatus } from '@/lib/api/admin-stats';

const STATUS_CLASSES: Record<HealthStatus, string> = {
  ok: 'bg-forest/10 text-forest border-forest/30',
  degraded: 'bg-ochre/10 text-ochre border-ochre/30',
  down: 'bg-red-100 text-red-700 border-red-300',
};

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

interface CheckRowProps {
  label: string;
  status: HealthStatus;
}

const CheckRow: React.FC<CheckRowProps> = ({ label, status }) => {
  const dotClass =
    status === 'ok' ? 'bg-forest' : status === 'degraded' ? 'bg-ochre' : 'bg-red-600';
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-charcoal/70">{label}</span>
      <span className="inline-flex items-center gap-1.5 font-medium text-charcoal">
        <span className={cn('inline-block h-2 w-2 rounded-full', dotClass)} aria-hidden />
        {status}
      </span>
    </div>
  );
};

export const HealthPill: React.FC = () => {
  const t = useT();
  const { data, isLoading, isError } = useHealth();

  const status: HealthStatus = isError ? 'down' : (data?.status ?? 'ok');
  const Icon =
    status === 'ok' ? CheckCircle2 : status === 'degraded' ? AlertTriangle : XCircle;

  const statusLabel =
    status === 'ok'
      ? t('admin.dashboard.health.ok')
      : status === 'degraded'
        ? t('admin.dashboard.health.degraded')
        : t('admin.dashboard.health.down');

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-charcoal">
          {t('admin.dashboard.health.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div
          className={cn(
            'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium',
            STATUS_CLASSES[status],
          )}
        >
          {isLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <Icon className="h-3.5 w-3.5" aria-hidden />
          )}
          <span>{statusLabel}</span>
        </div>
        {data ? (
          <div className="space-y-1.5 pt-1">
            <CheckRow label={t('admin.dashboard.health.database')} status={data.checks.database} />
            <CheckRow label={t('admin.dashboard.health.media')} status={data.checks.mediaStorage} />
            <div className="flex items-center justify-between pt-1 text-xs">
              <span className="text-charcoal/70">{t('admin.dashboard.health.uptime')}</span>
              <span className="font-medium text-charcoal tabular-nums">
                {formatUptime(data.checks.uptimeSeconds)}
              </span>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};
