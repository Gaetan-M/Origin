'use client';

import { ShieldOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/lib/hooks/use-auth';
import { useT } from '@/i18n';

/**
 * Shown when an authenticated account exists but has insufficient role
 * to access the admin dashboard (i.e. role === USER). The user can
 * either close the tab or sign out to swap to a different account.
 */
export default function ForbiddenPage() {
  const t = useT();
  const { logout, isLoggingOut } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-sand p-6">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center gap-6 p-10 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-error-light">
            <ShieldOff className="h-8 w-8 text-error" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-charcoal">
              {t('admin.forbidden.title')}
            </h1>
            <p className="text-sm text-charcoal/60">
              {t('admin.forbidden.message')}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => logout()}
            disabled={isLoggingOut}
            className="w-full"
          >
            {t('admin.forbidden.logout')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
