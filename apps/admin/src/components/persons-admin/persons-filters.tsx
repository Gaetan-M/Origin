'use client';

import { useEffect, useState } from 'react';
import { LifeStatus } from '@origin/shared-types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useT } from '@/i18n';

export type Tri = 'all' | 'yes' | 'no';

export interface PersonsFilterValue {
  search: string;
  lifeStatus: LifeStatus | 'ALL';
  hasPhoto: Tri;
  hasClaim: Tri;
  villageOrigin: string;
  region: string;
  country: string;
  includeDeleted: boolean;
}

export const DEFAULT_PERSONS_FILTERS: PersonsFilterValue = {
  search: '',
  lifeStatus: 'ALL',
  hasPhoto: 'all',
  hasClaim: 'all',
  villageOrigin: '',
  region: '',
  country: '',
  includeDeleted: false,
};

export function PersonsFilters({ value, onChange }: { value: PersonsFilterValue; onChange: (v: PersonsFilterValue) => void }) {
  const t = useT();
  const [searchLocal, setSearchLocal] = useState(value.search);

  useEffect(() => setSearchLocal(value.search), [value.search]);

  useEffect(() => {
    if (searchLocal === value.search) return;
    const handle = window.setTimeout(() => onChange({ ...value, search: searchLocal }), 300);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchLocal]);

  const reset = (): void => {
    setSearchLocal('');
    onChange({ ...DEFAULT_PERSONS_FILTERS });
  };

  return (
    <div className="grid gap-3 rounded-lg border bg-card p-4 lg:grid-cols-6">
      <div className="lg:col-span-2">
        <Label className="text-xs text-muted-foreground">{t('admin.persons.filters.search')}</Label>
        <Input value={searchLocal} placeholder={t('admin.persons.filters.search')} onChange={(e) => setSearchLocal(e.target.value)} />
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">{t('admin.persons.filters.lifeStatus')}</Label>
        <Select value={value.lifeStatus} onValueChange={(v) => onChange({ ...value, lifeStatus: v as LifeStatus | 'ALL' })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t('admin.common.all')}</SelectItem>
            <SelectItem value={LifeStatus.ALIVE}>{t('admin.persons.lifeStatus.ALIVE')}</SelectItem>
            <SelectItem value={LifeStatus.DECEASED}>{t('admin.persons.lifeStatus.DECEASED')}</SelectItem>
            <SelectItem value={LifeStatus.UNKNOWN}>{t('admin.persons.lifeStatus.UNKNOWN')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">{t('admin.persons.filters.hasPhoto')}</Label>
        <Select value={value.hasPhoto} onValueChange={(v) => onChange({ ...value, hasPhoto: v as Tri })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('admin.common.all')}</SelectItem>
            <SelectItem value="yes">{t('admin.common.yes')}</SelectItem>
            <SelectItem value="no">{t('admin.common.no')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">{t('admin.persons.filters.hasClaim')}</Label>
        <Select value={value.hasClaim} onValueChange={(v) => onChange({ ...value, hasClaim: v as Tri })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('admin.common.all')}</SelectItem>
            <SelectItem value="yes">{t('admin.common.yes')}</SelectItem>
            <SelectItem value="no">{t('admin.common.no')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">{t('admin.persons.filters.village')}</Label>
        <Input value={value.villageOrigin} onChange={(e) => onChange({ ...value, villageOrigin: e.target.value })} />
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">{t('admin.persons.filters.region')}</Label>
        <Input value={value.region} onChange={(e) => onChange({ ...value, region: e.target.value })} />
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">{t('admin.persons.filters.country')}</Label>
        <Input value={value.country} onChange={(e) => onChange({ ...value, country: e.target.value })} />
      </div>
      <div className="flex items-end justify-between gap-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-input"
            checked={value.includeDeleted}
            onChange={(e) => onChange({ ...value, includeDeleted: e.target.checked })}
          />
          {t('admin.persons.filters.deleted')}
        </label>
        <Button variant="ghost" size="sm" onClick={reset} type="button">
          {t('admin.actions.reset')}
        </Button>
      </div>
    </div>
  );
}
