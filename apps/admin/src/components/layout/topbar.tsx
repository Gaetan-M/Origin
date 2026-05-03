'use client';

import { LogOut, Menu, Globe, Languages } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useUiStore } from '@/stores/ui-store';
import { useLogout } from '@/lib/hooks/use-auth';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { RoleBadge } from '@/components/shared/role-badge';
import { formatPhone } from '@/lib/format';
import { AccountRole } from '@origin/shared-types';
import { useT } from '@/i18n';

function initialsFromPhone(phone: string | null | undefined): string {
  if (!phone) return '??';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 2) return '??';
  return digits.slice(-2);
}

export function Topbar() {
  const { account } = useAuthStore();
  const { toggleSidebar, locale, setLocale } = useUiStore();
  const logout = useLogout();
  const t = useT();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b bg-white/90 px-4 backdrop-blur lg:px-6">
      <Button variant="ghost" size="icon" onClick={toggleSidebar} aria-label="Basculer la barre latérale" className="lg:flex">
        <Menu className="h-5 w-5" />
      </Button>

      <div className="ml-auto flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Langue">
              <Globe className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{t('admin.common.language')}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setLocale('fr')}>
              <Languages className="h-4 w-4" />
              <span>Français</span>
              {locale === 'fr' && <span className="ml-auto text-deep-blue">●</span>}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setLocale('en')}>
              <Languages className="h-4 w-4" />
              <span>English</span>
              {locale === 'en' && <span className="ml-auto text-deep-blue">●</span>}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-9 gap-2 rounded-full px-2">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-xs">{initialsFromPhone(account?.phoneNumber)}</AvatarFallback>
              </Avatar>
              <span className="hidden text-sm font-medium text-charcoal sm:inline">
                {account?.fullName || (account?.phoneNumber ? formatPhone(account.phoneNumber) : '—')}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel className="flex flex-col gap-1.5">
              <span className="text-xs uppercase tracking-wider text-charcoal/50">{t('admin.common.signedInAs')}</span>
              <span className="text-sm font-medium">{account?.fullName ?? '—'}</span>
              <span className="text-xs text-charcoal/60">{account?.phoneNumber ? formatPhone(account.phoneNumber) : ''}</span>
              {account?.role && (
                <span className="mt-1">
                  <RoleBadge role={account.role as AccountRole} />
                </span>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => logout.mutate()} destructive>
              <LogOut className="h-4 w-4" />
              <span>{t('admin.actions.logout')}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
