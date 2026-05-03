'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, TreePine, Users, Bell, User, Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUiStore } from '@/stores/ui-store';
import { useT } from '@/i18n';
import { OriginLogo } from '@/components/branding/origin-decor';

// Six top-level destinations matching the redesign brief: Accueil · L'arbre ·
// Personnes · Connecter · Notifications · Profil. Inviter / Code famille /
// Sonde de parenté live as tabs inside /connect, not as separate nav items.
const NAV_KEYS = [
  { href: '/dashboard', icon: Home, key: 'nav.dashboard' },
  { href: '/tree', icon: TreePine, key: 'nav.myTree' },
  { href: '/persons', icon: Users, key: 'nav.myPersons' },
  { href: '/connect', icon: Link2, key: 'nav.connect' },
  { href: '/notifications', icon: Bell, key: 'nav.notifications' },
  { href: '/profile', icon: User, key: 'nav.profile' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen } = useUiStore();
  const t = useT();

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 hidden h-full border-r bg-white transition-all duration-200 lg:block',
        sidebarOpen ? 'w-64' : 'w-16',
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center border-b px-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 transition-opacity hover:opacity-80"
        >
          <OriginLogo size={30} withText={sidebarOpen} />
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1 p-3">
        {NAV_KEYS.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-forest/10 text-forest'
                  : 'text-charcoal/70 hover:bg-sand hover:text-charcoal',
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {sidebarOpen && <span>{t(item.key)}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
