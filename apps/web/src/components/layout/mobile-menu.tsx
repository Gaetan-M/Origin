'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Newspaper,
  Compass,
  GraduationCap,
  MapPin,
  Images,
  Radio,
  TreePine,
  Users,
  HeartHandshake,
  Link2,
  Bell,
  User,
  Menu,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useT } from '@/i18n';

// The FULL navigation, mirroring the desktop sidebar. The bottom tab bar only
// holds a handful of primary destinations, so on mobile this drawer is the way
// to reach every feature (Découvrir, Apprendre, Tourisme, Albums, En direct…).
const NAV_KEYS = [
  { href: '/dashboard', icon: Home, key: 'nav.dashboard' },
  { href: '/feed', icon: Newspaper, key: 'nav.feed' },
  { href: '/discover', icon: Compass, key: 'nav.discover' },
  { href: '/learn', icon: GraduationCap, key: 'nav.learn' },
  { href: '/tourism', icon: MapPin, key: 'nav.tourism' },
  { href: '/albums', icon: Images, key: 'nav.albums' },
  { href: '/lives', icon: Radio, key: 'nav.lives' },
  { href: '/tree', icon: TreePine, key: 'nav.myTree' },
  { href: '/persons', icon: Users, key: 'nav.myPersons' },
  { href: '/are-we-related', icon: HeartHandshake, key: 'nav.areWeRelated' },
  { href: '/connect', icon: Link2, key: 'nav.connect' },
  { href: '/notifications', icon: Bell, key: 'nav.notifications' },
  { href: '/profile', icon: User, key: 'nav.profile' },
];

/**
 * Mobile "all features" menu — a hamburger that opens a slide-in drawer with
 * every navigation destination. Visible only below the `lg` breakpoint (the
 * desktop sidebar covers large screens).
 */
export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const t = useT();

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-label="Menu"
        onClick={() => setOpen(true)}
        className="flex h-10 w-10 items-center justify-center rounded-lg text-charcoal/70 transition-colors hover:bg-sand"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <button
            type="button"
            aria-label="Fermer le menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-charcoal/40"
          />
          {/* Panel */}
          <div className="absolute left-0 top-0 flex h-full w-72 max-w-[80%] flex-col bg-white shadow-elevated">
            <div className="flex h-16 items-center justify-between border-b px-4">
              <span className="text-base font-bold text-forest">Origin</span>
              <button
                type="button"
                aria-label="Fermer"
                onClick={() => setOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-charcoal/60 hover:bg-sand"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
              {NAV_KEYS.map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-forest/10 text-forest'
                        : 'text-charcoal/70 hover:bg-sand hover:text-charcoal',
                    )}
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    <span>{t(item.key)}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}
