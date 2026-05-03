'use client';

import { LogOut } from 'lucide-react';
import { AccountRole } from '@origin/shared-types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { RoleBadge } from '@/components/shared/role-badge';
import { useAuthStore } from '@/stores/auth-store';
import { useLogout } from '@/lib/hooks/use-auth';
import { formatPhone, formatDateTime } from '@/lib/format';
import { useUiStore } from '@/stores/ui-store';
import { useT } from '@/i18n';

function initials(phone: string | null | undefined): string {
  if (!phone) return '??';
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 2 ? digits.slice(-2) : '??';
}

export function AdminProfileCard() {
  const t = useT();
  const locale = useUiStore((s) => s.locale);
  const { account } = useAuthStore();
  const logout = useLogout();

  if (!account) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('admin.settings.profile')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-12 w-12">
            <AvatarFallback className="text-base">{initials(account.phoneNumber)}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-charcoal">
              {account.fullName?.trim() || formatPhone(account.phoneNumber)}
            </span>
            <span className="text-xs font-mono text-charcoal/60">{formatPhone(account.phoneNumber)}</span>
            <RoleBadge role={account.role as AccountRole} />
          </div>
        </div>
        <Separator />
        <dl className="grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-charcoal/60">{t('admin.common.lastLogin')}</dt>
          <dd>{account.lastLoginAt ? formatDateTime(account.lastLoginAt, locale) : '—'}</dd>
          <dt className="text-charcoal/60">{t('admin.common.createdAt')}</dt>
          <dd>{formatDateTime(account.createdAt, locale)}</dd>
          <dt className="text-charcoal/60">Email</dt>
          <dd>{account.email ?? '—'}</dd>
        </dl>
        <Separator />
        <Button variant="outline" onClick={() => logout.mutate()} disabled={logout.isPending}>
          <LogOut className="h-4 w-4" />
          {t('admin.actions.logout')}
        </Button>
      </CardContent>
    </Card>
  );
}
