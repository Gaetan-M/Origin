'use client';

import { useEffect, useState } from 'react';
import { AdminActionSeverity } from '@origin/shared-types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useT } from '@/i18n';
import { useAuditCategories } from '@/lib/hooks/use-admin-audit';

export interface AuditFilterValue {
  actorAccountId: string;
  targetAccountId: string;
  category: string;
  severity: AdminActionSeverity | 'ALL';
  search: string;
  dateFrom: string;
  dateTo: string;
}

export const DEFAULT_AUDIT_FILTERS: AuditFilterValue = {
  actorAccountId: '',
  targetAccountId: '',
  category: 'ALL',
  severity: 'ALL',
  search: '',
  dateFrom: '',
  dateTo: '',
};

export function AuditFilters({ value, onChange }: { value: AuditFilterValue; onChange: (v: AuditFilterValue) => void }) {
  const t = useT();
  const { data: categories } = useAuditCategories();
  const [searchLocal, setSearchLocal] = useState(value.search);

  useEffect(() => setSearchLocal(value.search), [value.search]);

  useEffect(() => {
    if (searchLocal === value.search) return;
    const handle = window.setTimeout(() => onChange({ ...value, search: searchLocal }), 300);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchLocal]);

  return (
    <div className="grid gap-3 rounded-lg border bg-card p-4 lg:grid-cols-4">
      <div>
        <Label className="text-xs text-muted-foreground">{t('admin.audit.filters.search')}</Label>
        <Input value={searchLocal} placeholder={t('admin.audit.filters.search')} onChange={(e) => setSearchLocal(e.target.value)} />
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">{t('admin.audit.filters.category')}</Label>
        <Select value={value.category} onValueChange={(v) => onChange({ ...value, category: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t('admin.common.all')}</SelectItem>
            {(categories ?? []).map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">{t('admin.audit.filters.severity')}</Label>
        <Select value={value.severity} onValueChange={(v) => onChange({ ...value, severity: v as AdminActionSeverity | 'ALL' })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t('admin.common.all')}</SelectItem>
            <SelectItem value={AdminActionSeverity.INFO}>{t('admin.severity.INFO')}</SelectItem>
            <SelectItem value={AdminActionSeverity.NOTICE}>{t('admin.severity.NOTICE')}</SelectItem>
            <SelectItem value={AdminActionSeverity.WARNING}>{t('admin.severity.WARNING')}</SelectItem>
            <SelectItem value={AdminActionSeverity.CRITICAL}>{t('admin.severity.CRITICAL')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">{t('admin.audit.filters.actor')}</Label>
        <Input value={value.actorAccountId} onChange={(e) => onChange({ ...value, actorAccountId: e.target.value })} placeholder="UUID" className="font-mono text-xs" />
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">{t('admin.audit.filters.target')}</Label>
        <Input value={value.targetAccountId} onChange={(e) => onChange({ ...value, targetAccountId: e.target.value })} placeholder="UUID" className="font-mono text-xs" />
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">{t('admin.audit.filters.dateFrom')}</Label>
        <Input type="datetime-local" value={value.dateFrom} onChange={(e) => onChange({ ...value, dateFrom: e.target.value })} />
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">{t('admin.audit.filters.dateTo')}</Label>
        <Input type="datetime-local" value={value.dateTo} onChange={(e) => onChange({ ...value, dateTo: e.target.value })} />
      </div>
      <div className="flex items-end">
        <Button variant="ghost" size="sm" onClick={() => { setSearchLocal(''); onChange(DEFAULT_AUDIT_FILTERS); }}>
          {t('admin.actions.reset')}
        </Button>
      </div>
    </div>
  );
}
