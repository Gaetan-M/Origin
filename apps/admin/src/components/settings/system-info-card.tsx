'use client';

import { Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useHealth } from '@/lib/hooks/use-admin-stats';
import { useT } from '@/i18n';

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}j ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

const VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? 'dev';
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

export function SystemInfoCard() {
  const t = useT();
  const { data, isLoading } = useHealth();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-4 w-4" />
          {t('admin.settings.system')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && !data ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <dl className="grid grid-cols-2 gap-y-2 text-sm">
            <dt className="text-charcoal/60">Statut</dt>
            <dd>
              <Badge variant={data?.status === 'ok' ? 'success' : data?.status === 'degraded' ? 'warning' : 'destructive'}>
                {data?.status ?? '—'}
              </Badge>
            </dd>
            <dt className="text-charcoal/60">{t('admin.dashboard.health.database')}</dt>
            <dd className="font-mono text-xs">{data?.checks.database ?? '—'}</dd>
            <dt className="text-charcoal/60">{t('admin.dashboard.health.media')}</dt>
            <dd className="font-mono text-xs">{data?.checks.mediaStorage ?? '—'}</dd>
            <dt className="text-charcoal/60">{t('admin.dashboard.health.uptime')}</dt>
            <dd>{data ? formatUptime(data.checks.uptimeSeconds) : '—'}</dd>
            <dt className="text-charcoal/60">Version</dt>
            <dd className="font-mono text-xs">{VERSION}</dd>
            <dt className="text-charcoal/60">API</dt>
            <dd className="font-mono text-xs break-all">{API_URL}</dd>
          </dl>
        )}
      </CardContent>
    </Card>
  );
}
