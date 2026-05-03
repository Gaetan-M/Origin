'use client';

import type { AuditLogDetail } from '@/lib/api/admin-audit';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CopyButton } from '@/components/shared/copy-button';
import { SeverityBadge } from './severity-badge';
import { AuditDiffView } from './audit-diff-view';
import { formatDateTime } from '@/lib/format';
import { useUiStore } from '@/stores/ui-store';
import { useT } from '@/i18n';

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <span className="text-xs uppercase tracking-wide text-charcoal/50">{label}</span>
      <span className="text-sm text-charcoal text-right break-all">{value}</span>
    </div>
  );
}

export function AuditDetailCard({ entry }: { entry: AuditLogDetail }) {
  const t = useT();
  const locale = useUiStore((s) => s.locale);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex flex-wrap items-center gap-2">
            <span>{entry.action}</span>
            <SeverityBadge severity={entry.severity} />
            <Badge variant="outline" className="font-mono text-[10px]">{entry.category}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          <Row label={t('admin.audit.columns.createdAt')} value={formatDateTime(entry.createdAt, locale)} />
          <Row
            label={t('admin.audit.columns.actor')}
            value={
              <span className="font-mono">
                {entry.actor?.phoneNumberMasked ?? entry.actorAccountId}
                {entry.actor?.fullName && <span className="ml-2 text-charcoal/60">{entry.actor.fullName}</span>}
              </span>
            }
          />
          <Row
            label={t('admin.audit.columns.target')}
            value={
              entry.targetAccountId
                ? <span className="font-mono">{entry.targetAccountId}</span>
                : entry.targetEntityType
                  ? <><Badge variant="outline" className="text-[10px]">{entry.targetEntityType}</Badge> <span className="font-mono text-xs">{entry.targetEntityId}</span></>
                  : '—'
            }
          />
          {entry.reason && <Row label={t('admin.common.reason')} value={entry.reason} />}
          <Row label={t('admin.audit.detail.ip')} value={<span className="font-mono">{entry.ipAddress ?? '—'}</span>} />
          <Row label={t('admin.audit.detail.userAgent')} value={<span className="font-mono text-xs">{entry.userAgent ?? '—'}</span>} />
          <Row
            label={t('admin.audit.detail.requestId')}
            value={entry.requestId ? <span className="font-mono">{entry.requestId} <CopyButton value={entry.requestId} /></span> : '—'}
          />
        </CardContent>
      </Card>

      {(entry.beforeState || entry.afterState) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">État avant / après</CardTitle>
          </CardHeader>
          <CardContent>
            <AuditDiffView before={entry.beforeState} after={entry.afterState} />
          </CardContent>
        </Card>
      )}

      {entry.metadata && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('admin.audit.detail.metadata')}</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="overflow-x-auto rounded-md bg-sand p-3 text-xs">
              {JSON.stringify(entry.metadata, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
