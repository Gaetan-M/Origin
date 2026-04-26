'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { Sidebar } from '@/components/layout/sidebar';
import { Navbar } from '@/components/layout/navbar';
import { MobileNav } from '@/components/layout/mobile-nav';
import { ErrorBoundary } from '@/components/shared/error-boundary';
import { PendingClaimBanner } from '@/components/shared/pending-claim-banner';
import { OriginLogo } from '@/components/branding/origin-decor';
import { useUiStore } from '@/stores/ui-store';
import { useAuthStore } from '@/stores/auth-store';
import { useMyClaims } from '@/lib/hooks/use-claims';
import { useLogout } from '@/lib/hooks/use-auth';
import { cn } from '@/lib/utils';

const ONBOARDING_PATH = '/onboarding';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { sidebarOpen } = useUiStore();
  const { isAuthenticated } = useAuthStore();
  const pathname = usePathname();
  const router = useRouter();
  const logout = useLogout();

  // Mandatory onboarding gate: any authenticated session without a claim
  // is forced to /onboarding. The redirect also fires on navigation so
  // users cannot escape via the sidebar links.
  const { data: claims, isLoading: loadingClaims } = useMyClaims();
  useEffect(() => {
    if (!isAuthenticated) return;
    if (loadingClaims) return;
    const hasClaim = (claims?.length ?? 0) > 0;
    if (!hasClaim && pathname !== ONBOARDING_PATH) {
      router.replace(ONBOARDING_PATH);
    }
    if (hasClaim && pathname === ONBOARDING_PATH) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, loadingClaims, claims, pathname, router]);

  // Render a minimal chrome on the onboarding step — no sidebar, no
  // main navbar, no mobile nav. A slim top bar still exposes the logo
  // and a logout link so the user is never trapped on this screen.
  if (pathname === ONBOARDING_PATH) {
    return (
      <div className="min-h-screen bg-off-white">
        <header className="flex items-center justify-between border-b border-sand bg-white px-5 py-3">
          <OriginLogo size={28} />
          <button
            type="button"
            onClick={() => logout.mutate()}
            className="inline-flex items-center gap-1.5 text-sm text-charcoal/60 transition hover:text-charcoal"
            disabled={logout.isPending}
          >
            <LogOut className="h-3.5 w-3.5" />
            Se deconnecter
          </button>
        </header>
        <main className="mx-auto w-full px-4 py-10 lg:py-14">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-off-white">
      <Sidebar />
      <div className={cn('flex flex-col transition-all duration-200 lg:ml-64', !sidebarOpen && 'lg:ml-16')}>
        <Navbar />
        <main className="flex-1 p-4 pb-20 lg:p-6 lg:pb-6">
          <PendingClaimBanner />
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
