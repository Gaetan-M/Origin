'use client';

import { useQuery } from '@tanstack/react-query';
import { getMyContributions } from '@/lib/api/accounts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { Clock, Plus, Pencil, Trash2 } from 'lucide-react';
import type { Contribution } from '@origin/shared-types';
import { useT } from '@/i18n';

function getActionIcon(action: string) {
  switch (action) {
    case 'CREATE': return Plus;
    case 'UPDATE': return Pencil;
    case 'DELETE': return Trash2;
    default: return Clock;
  }
}

function getActionLabel(action: string, entityType: string): string {
  const entity = entityType.toLowerCase();
  switch (action) {
    case 'CREATE': return `Ajout d'un(e) ${entity}`;
    case 'UPDATE': return `Modification d'un(e) ${entity}`;
    case 'DELETE': return `Suppression d'un(e) ${entity}`;
    default: return `Action sur ${entity}`;
  }
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "A l'instant";
  if (diffMins < 60) return `Il y a ${diffMins} min`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `Il y a ${diffDays}j`;
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(date);
}

export function RecentActivity() {
  const t = useT();
  const { data, isLoading } = useQuery({
    queryKey: ['contributions', 'recent'],
    queryFn: () => getMyContributions({ page: 1, limit: 10 }),
  });

  const contributions = data?.data ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t('dashboard.recentActivity')}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : contributions.length === 0 ? (
          <EmptyState
            icon={Clock}
            title={t('dashboard.noActivity')}
          />
        ) : (
          <div className="space-y-3">
            {contributions.map((c: Contribution) => {
              const Icon = getActionIcon(c.action);
              return (
                <div key={c.id} className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sand">
                    <Icon className="h-4 w-4 text-charcoal/60" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-charcoal">{getActionLabel(c.action, c.entityType)}</p>
                    <p className="text-xs text-charcoal/50">{formatRelativeDate(c.createdAt)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
