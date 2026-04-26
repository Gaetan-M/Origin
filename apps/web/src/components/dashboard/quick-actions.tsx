'use client';

import { useRouter } from 'next/navigation';
import { UserPlus, TreePine, Send } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useT } from '@/i18n';

export function QuickActions() {
  const router = useRouter();
  const t = useT();

  const actions = [
    { icon: UserPlus, label: t('dashboard.addPerson'), href: '/persons/new', color: 'bg-forest/10 text-forest' },
    { icon: TreePine, label: t('dashboard.viewTree'), href: '/tree', color: 'bg-terracotta/10 text-terracotta' },
    { icon: Send, label: t('dashboard.inviteRelative'), href: '/invitations', color: 'bg-ochre/10 text-ochre' },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {actions.map((action) => (
        <Card
          key={action.href}
          className="cursor-pointer transition-shadow hover:shadow-elevated"
          onClick={() => router.push(action.href)}
        >
          <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${action.color}`}>
              <action.icon className="h-6 w-6" />
            </div>
            <span className="text-sm font-medium text-charcoal">{action.label}</span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
