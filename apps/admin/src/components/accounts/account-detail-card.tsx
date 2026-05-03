'use client';

import { Mail, Phone, Hash, Calendar, ShieldOff, CheckCircle2, Globe } from 'lucide-react';
import type { AdminAccountDetail } from '@/lib/api/admin-accounts';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { RoleBadge } from '@/components/shared/role-badge';
import { CopyButton } from '@/components/shared/copy-button';
import { formatDate, formatDateTime, formatPhone } from '@/lib/format';
import { useT } from '@/i18n';

function initials(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 2 ? digits.slice(-2) : '??';
}

function InfoRow({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <span className="text-xs uppercase tracking-wide text-charcoal/50">{label}</span>
      <span className={mono ? 'font-mono text-sm text-charcoal' : 'text-sm text-charcoal'}>{value}</span>
    </div>
  );
}

export function AccountDetailCard({ detail }: { detail: AdminAccountDetail }) {
  const t = useT();
  const { account, stats, lastLogins } = detail;
  const status = account.deletedAt
    ? { variant: 'secondary' as const, label: t('admin.accounts.status.deleted') }
    : account.isBanned
      ? { variant: 'destructive' as const, label: t('admin.accounts.status.banned') }
      : { variant: 'success' as const, label: t('admin.accounts.status.active') };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
          <Avatar className="h-14 w-14">
            <AvatarFallback className="text-lg font-semibold">{initials(account.phoneNumber)}</AvatarFallback>
          </Avatar>
          <div className="flex flex-1 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold tracking-tight text-charcoal">
                {account.fullName?.trim() || formatPhone(account.phoneNumber)}
              </h2>
              <RoleBadge role={account.role} />
              <Badge variant={status.variant}>{status.label}</Badge>
            </div>
            <p className="text-sm text-charcoal/60 font-mono">{formatPhone(account.phoneNumber)}</p>
          </div>
          <div className="flex items-center gap-2">
            <CopyButton value={account.id} label="ID" />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-wide text-charcoal/50">{t('admin.accounts.stats.claims')}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{stats.claimCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-wide text-charcoal/50">{t('admin.accounts.stats.persons')}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{stats.personCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-wide text-charcoal/50">{t('admin.accounts.stats.contributions')}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{stats.contributionCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('admin.accounts.tabs.profile')}</CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          <InfoRow label="Phone" value={formatPhone(account.phoneNumber)} mono />
          <InfoRow label="Country code" value={account.phoneCountryCode} />
          <InfoRow label="Operator" value={account.phoneOperator ?? '—'} />
          <InfoRow label="Email" value={account.email ?? '—'} />
          <InfoRow label="Language" value={account.languagePreference} />
          <InfoRow label="WhatsApp" value={account.whatsappEnabled ? t('admin.common.yes') : t('admin.common.no')} />
          <InfoRow label={t('admin.common.createdAt')} value={formatDate(account.createdAt)} />
          <InfoRow label={t('admin.common.updatedAt')} value={formatDate(account.updatedAt)} />
          <InfoRow label={t('admin.common.lastLogin')} value={account.lastLoginAt ? formatDateTime(account.lastLoginAt) : '—'} />
          <InfoRow label="Last IP" value={account.lastLoginIp ?? '—'} mono />
        </CardContent>
      </Card>

      {account.isBanned && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-error">Bannissement</CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            <InfoRow label="Banni le" value={account.bannedAt ? formatDateTime(account.bannedAt) : '—'} />
            <InfoRow label="Banni par" value={account.bannedByAccountId ?? '—'} mono />
            <InfoRow label="Motif" value={account.bannedReason ?? '—'} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Attribution du rôle</CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          <InfoRow label="Rôle actuel" value={<RoleBadge role={account.role} />} />
          <InfoRow label="Attribué le" value={account.roleAssignedAt ? formatDateTime(account.roleAssignedAt) : '—'} />
          <InfoRow label="Attribué par" value={account.roleAssignedByAccountId ?? '—'} mono />
        </CardContent>
      </Card>

      {account.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes administrateur</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap text-sm text-charcoal/80">{account.notes}</pre>
          </CardContent>
        </Card>
      )}

      {lastLogins.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dernières connexions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {lastLogins.slice(0, 5).map((l, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-charcoal/70">{l.lastLoginAt ? formatDateTime(l.lastLoginAt) : '—'}</span>
                <span className="font-mono text-xs text-charcoal/60">{l.lastLoginIp ?? '—'}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
