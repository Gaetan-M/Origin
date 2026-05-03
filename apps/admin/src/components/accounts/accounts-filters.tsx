'use client';

import { useEffect, useState } from 'react';
import { AccountRole } from '@origin/shared-types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useT } from '@/i18n';

export type TriState = 'all' | 'yes' | 'no';

export interface AccountsFilterValue {
  search: string;
  role: AccountRole | 'ALL';
  isBanned: TriState;
  hasClaim: TriState;
  includeDeleted: boolean;
}

export const DEFAULT_ACCOUNTS_FILTERS: AccountsFilterValue = {
  search: '',
  role: 'ALL',
  isBanned: 'all',
  hasClaim: 'all',
  includeDeleted: false,
};

interface AccountsFiltersProps {
  value: AccountsFilterValue;
  onChange: (value: AccountsFilterValue) => void;
}

export function AccountsFilters({ value, onChange }: AccountsFiltersProps) {
  const t = useT();
  const [searchLocal, setSearchLocal] = useState(value.search);

  useEffect(() => {
    setSearchLocal(value.search);
  }, [value.search]);

  useEffect(() => {
    if (searchLocal === value.search) return;
    const handle = window.setTimeout(() => {
      onChange({ ...value, search: searchLocal });
    }, 300);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchLocal]);

  const reset = (): void => {
    setSearchLocal('');
    onChange({ ...DEFAULT_ACCOUNTS_FILTERS });
  };

  return (
    <div className="grid gap-3 rounded-lg border bg-card p-4 md:grid-cols-2 lg:grid-cols-6">
      <div className="lg:col-span-2">
        <Label htmlFor="accounts-search" className="text-xs text-muted-foreground">
          {t('admin.accounts.filters.search')}
        </Label>
        <Input
          id="accounts-search"
          value={searchLocal}
          placeholder={t('admin.accounts.filters.search')}
          onChange={(e) => setSearchLocal(e.target.value)}
        />
      </div>

      <div>
        <Label className="text-xs text-muted-foreground">
          {t('admin.accounts.filters.role')}
        </Label>
        <Select
          value={value.role}
          onValueChange={(v) =>
            onChange({ ...value, role: v as AccountRole | 'ALL' })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t('admin.common.all')}</SelectItem>
            <SelectItem value={AccountRole.USER}>USER</SelectItem>
            <SelectItem value={AccountRole.MODERATOR}>MODERATOR</SelectItem>
            <SelectItem value={AccountRole.ADMIN}>ADMIN</SelectItem>
            <SelectItem value={AccountRole.SUPER_ADMIN}>SUPER_ADMIN</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-xs text-muted-foreground">
          {t('admin.accounts.filters.banned')}
        </Label>
        <Select
          value={value.isBanned}
          onValueChange={(v) => onChange({ ...value, isBanned: v as TriState })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('admin.common.all')}</SelectItem>
            <SelectItem value="yes">{t('admin.common.yes')}</SelectItem>
            <SelectItem value="no">{t('admin.common.no')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-xs text-muted-foreground">
          {t('admin.accounts.filters.hasClaim')}
        </Label>
        <Select
          value={value.hasClaim}
          onValueChange={(v) => onChange({ ...value, hasClaim: v as TriState })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('admin.common.all')}</SelectItem>
            <SelectItem value="yes">{t('admin.common.yes')}</SelectItem>
            <SelectItem value="no">{t('admin.common.no')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-end justify-between gap-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-input"
            checked={value.includeDeleted}
            onChange={(e) =>
              onChange({ ...value, includeDeleted: e.target.checked })
            }
          />
          {t('admin.accounts.filters.deleted')}
        </label>
        <Button variant="ghost" size="sm" onClick={reset} type="button">
          {t('admin.accounts.filters.reset')}
        </Button>
      </div>
    </div>
  );
}
