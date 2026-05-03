'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  TreePine,
  ScrollText,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import { AccountRole } from '@origin/shared-types';
import { cn } from '@/lib/utils';
import { useUiStore } from '@/stores/ui-store';
import { useAuthStore } from '@/stores/auth-store';
import { isRoleAtLeast } from '@/lib/utils/role';
import { useT } from '@/i18n';
import { OriginMark } from '@/components/branding/origin-mark';

interface NavItem {
  href: string;
  icon: LucideIcon;
  key: string;
  minRole?: AccountRole;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', icon: LayoutDashboard, key: 'admin.nav.dashboard' },
  { href: '/accounts', icon: Users, key: 'admin.nav.accounts' },
  { href: '/moderation', icon: ShieldCheck, key: 'admin.nav.moderation' },
  { href: '/persons', icon: TreePine, key: 'admin.nav.persons' },
  { href: '/audit', icon: ScrollText, key: 'admin.nav.audit', minRole: AccountRole.ADMIN },
  { href: '/settings', icon: Settings, key: 'admin.nav.settings' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen } = useUiStore();
  const { account } = useAuthStore();
  const t = useT();

  const userRole = (account?.role as AccountRole | undefined) ?? AccountRole.USER;

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 hidden h-full border-r bg-white transition-all duration-200 lg:block',
        sidebarOpen ? 'w-64' : 'w-16',
      )}
    >
      <div className="flex h-16 items-center border-b px-4">
        <Link href="/dashboard" className="flex items-center gap-2 transition-opacity hover:opacity-80">
          <OriginMark size={28} withText={sidebarOpen} />
        </Link>
      </div>

      <nav className="flex flex-col gap-1 p-3">
        {NAV_ITEMS.filter((item) => !item.minRole || isRoleAtLeast(userRole, item.minRole)).map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-deep-blue/10 text-deep-blue'
                  : 'text-charcoal/70 hover:bg-sand hover:text-charcoal',
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {sidebarOpen && <span>{t(item.key)}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
