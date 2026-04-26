'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, TreePine, Bell, User, Users, UserSearch, KeyRound } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUnreadCount } from '@/lib/hooks/use-notifications';

const TABS = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Accueil' },
  { href: '/tree', icon: TreePine, label: 'Arbre' },
  { href: '/persons', icon: Users, label: 'Personnes' },
  { href: '/kinship-probe', icon: UserSearch, label: 'Proche' },
  { href: '/family-codes', icon: KeyRound, label: 'Code' },
  { href: '/notifications', icon: Bell, label: 'Notifs' },
  { href: '/profile', icon: User, label: 'Profil' },
];

export function MobileNav() {
  const pathname = usePathname();
  const { data: unreadCount } = useUnreadCount();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-white lg:hidden">
      <div className="flex items-center justify-around py-2">
        {TABS.map((tab) => {
          const isActive = pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'relative flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-medium transition-colors',
                isActive ? 'text-forest' : 'text-charcoal/50',
              )}
            >
              <div className="relative">
                <tab.icon className="h-5 w-5" />
                {tab.href === '/notifications' && unreadCount && unreadCount > 0 ? (
                  <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-0.5 text-[9px] font-bold text-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                ) : null}
              </div>
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
