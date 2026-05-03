'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, TreePine, Plus, Link2, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUnreadCount } from '@/lib/hooks/use-notifications';

// 5 items + a floating center action — iOS HIG convention. The "+" is the
// Add-Person fast path; on tap we go to /persons/new (the wizard).
const LEFT_TABS = [
  { href: '/dashboard', icon: Home, label: 'Accueil' },
  { href: '/tree', icon: TreePine, label: 'Arbre' },
];
const RIGHT_TABS = [
  { href: '/connect', icon: Link2, label: 'Connect' },
  { href: '/profile', icon: User, label: 'Profil' },
];

export function MobileNav() {
  const pathname = usePathname();
  const { data: unreadCount } = useUnreadCount();

  function isActive(href: string) {
    return pathname.startsWith(href);
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-sand-dark bg-white px-2 pb-3 pt-2 lg:hidden">
      <div className="flex items-end justify-around">
        {LEFT_TABS.map((tab) => (
          <NavItem
            key={tab.href}
            href={tab.href}
            icon={tab.icon}
            label={tab.label}
            active={isActive(tab.href)}
          />
        ))}

        {/* Center FAB — the highest-impact action: add a person. */}
        <Link
          href="/persons/new"
          aria-label="Ajouter un proche"
          className="relative -mt-5 flex h-13 w-13 items-center justify-center rounded-full bg-forest text-white shadow-elevated ring-4 ring-off-white transition-transform active:scale-95"
          style={{ height: 52, width: 52 }}
        >
          <Plus className="h-6 w-6" strokeWidth={2.4} />
        </Link>

        {RIGHT_TABS.map((tab) => (
          <NavItem
            key={tab.href}
            href={tab.href}
            icon={tab.icon}
            label={tab.label}
            active={isActive(tab.href)}
            badge={tab.href === '/notifications' ? unreadCount : undefined}
          />
        ))}
      </div>
    </nav>
  );
}

function NavItem({
  href,
  icon: Icon,
  label,
  active,
  badge,
}: {
  href: string;
  icon: typeof Home;
  label: string;
  active: boolean;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'relative flex min-w-14 flex-col items-center gap-0.5 px-2 py-1 text-[10px] font-semibold transition-colors',
        active ? 'text-forest-dark' : 'text-charcoal/50',
      )}
    >
      <div className="relative">
        <Icon className="h-5 w-5" />
        {badge && badge > 0 ? (
          <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-terracotta px-0.5 text-[9px] font-bold text-white">
            {badge > 9 ? '9+' : badge}
          </span>
        ) : null}
      </div>
      <span>{label}</span>
    </Link>
  );
}
