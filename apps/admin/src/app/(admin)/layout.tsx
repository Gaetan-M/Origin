'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AccountRole } from '@origin/shared-types';
import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { ErrorBoundary } from '@/components/shared/error-boundary';
import { useUiStore } from '@/stores/ui-store';
import { useAuthStore } from '@/stores/auth-store';
import { isRoleAtLeast } from '@/lib/utils/role';
import { cn } from '@/lib/utils';

/**
 * Admin chrome guard. The middleware already blocks anonymous visitors,
 * but only the client knows the role (the cookie is just a presence
 * flag). Anything below MODERATOR is bounced to /forbidden so we never
 * render admin chrome around an unprivileged session.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { sidebarOpen } = useUiStore();
  const { isAuthenticated, account } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace(`/auth/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }
    if (account && !isRoleAtLeast(account.role as AccountRole, AccountRole.MODERATOR)) {
      router.replace('/forbidden');
    }
  }, [isAuthenticated, account, router, pathname]);

  // Avoid flashing protected content while we figure out the role.
  if (!isAuthenticated || !account) {
    return null;
  }
  if (!isRoleAtLeast(account.role as AccountRole, AccountRole.MODERATOR)) {
    return null;
  }

  return (
    <div className="min-h-screen bg-off-white">
      <Sidebar />
      <div className={cn('flex min-h-screen flex-col transition-all duration-200', sidebarOpen ? 'lg:ml-64' : 'lg:ml-16')}>
        <Topbar />
        <main className="flex-1 px-4 py-6 lg:px-8">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
