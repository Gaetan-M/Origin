'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, Menu, LogOut, User } from 'lucide-react';
import { OriginLogo } from '@/components/branding/origin-decor';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MobileMenu } from '@/components/layout/mobile-menu';
import { useUiStore } from '@/stores/ui-store';
import { useAuthStore } from '@/stores/auth-store';
import { useUnreadCount } from '@/lib/hooks/use-notifications';
import { useLogout } from '@/lib/hooks/use-auth';
import { getInitials } from '@/lib/utils/format-name';
import { useT } from '@/i18n';

export function Navbar() {
  const router = useRouter();
  const { toggleSidebar } = useUiStore();
  const { account } = useAuthStore();
  const { data: unreadCount } = useUnreadCount();
  const logout = useLogout();
  const t = useT();

  const displayName = account?.phoneNumber ?? 'Utilisateur';

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-white px-4 lg:px-6">
      <div className="flex items-center gap-2">
        {/* Desktop: toggle the sidebar. Mobile: open the full-features drawer. */}
        <Button variant="ghost" size="icon" onClick={toggleSidebar} className="hidden lg:flex">
          <Menu className="h-5 w-5" />
        </Button>
        <MobileMenu />
        <Link
          href="/dashboard"
          className="flex items-center gap-2 lg:hidden transition-opacity hover:opacity-80"
        >
          <OriginLogo size={28} />
        </Link>
      </div>

      <div className="flex items-center gap-2">
        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative" onClick={() => router.push('/notifications')}>
          <Bell className="h-5 w-5" />
          {unreadCount && unreadCount > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-error px-1 text-[10px] font-bold text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          ) : null}
        </Button>

        {/* Profile dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-forest text-xs text-white">
                  {getInitials(displayName)}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => router.push('/profile')}>
              <User className="mr-2 h-4 w-4" />
              {t('nav.profile')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => logout.mutate()} className="text-error">
              <LogOut className="mr-2 h-4 w-4" />
              {t('auth.logoutSuccess')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
