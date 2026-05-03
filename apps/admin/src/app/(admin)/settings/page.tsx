'use client';

import { Wrench } from 'lucide-react';
import { AccountRole, isRoleAtLeast } from '@origin/shared-types';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AdminProfileCard } from '@/components/settings/admin-profile-card';
import { SystemInfoCard } from '@/components/settings/system-info-card';
import { LocaleSwitcher } from '@/components/settings/locale-switcher';
import { useAuthStore } from '@/stores/auth-store';
import { useT } from '@/i18n';

export default function SettingsPage() {
  const t = useT();
  const { account } = useAuthStore();
  const isSuperAdmin = isRoleAtLeast((account?.role as AccountRole) ?? AccountRole.USER, AccountRole.SUPER_ADMIN);

  return (
    <>
      <PageHeader title={t('admin.settings.title')} subtitle={t('admin.settings.subtitle')} />

      <div className="grid gap-6 lg:grid-cols-2">
        <AdminProfileCard />
        <div className="space-y-6">
          <SystemInfoCard />
          <LocaleSwitcher />
        </div>
      </div>

      {isSuperAdmin && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              {t('admin.settings.maintenance')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-charcoal/60">{t('admin.settings.maintenanceSoon')}</p>
          </CardContent>
        </Card>
      )}
    </>
  );
}
