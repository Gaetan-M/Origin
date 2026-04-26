'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { Copy, Check, Ban, Tag } from 'lucide-react';
import { useMyFamilyCodes, useRevokeFamilyCode } from '@/lib/hooks/use-family-codes';
import { cn } from '@/lib/utils';

export function CodeList() {
  const { data, isLoading } = useMyFamilyCodes();
  const revoke = useRevokeFamilyCode();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <EmptyState
        icon={Tag}
        title="Aucun code famille"
        description="Genere un code et partage-le a ta famille pour qu'ils te rejoignent en un clic."
      />
    );
  }

  async function handleCopy(code: string, id: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(id);
      toast.success('Code copie !');
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error('Impossible de copier.');
    }
  }

  return (
    <div className="space-y-3">
      {data.map((c) => {
        const isExpired = new Date(c.expiresAt) < new Date();
        const isRevoked = !!c.revokedAt;
        const isExhausted = c.usedCount >= c.maxUses;
        const isInactive = isExpired || isRevoked || isExhausted;

        return (
          <Card key={c.id} className={cn(isInactive && 'opacity-60')}>
            <CardContent className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  {c.label && (
                    <p className="text-xs font-semibold uppercase tracking-wide text-charcoal/55">
                      {c.label}
                    </p>
                  )}
                  <p className="mt-1 font-mono text-2xl font-bold tracking-wider text-forest">
                    {c.code}
                  </p>
                  <p className="mt-1 text-xs text-charcoal/55">
                    {c.usedCount} / {c.maxUses} utilisations · expire le{' '}
                    {new Date(c.expiresAt).toLocaleDateString('fr-FR')}
                  </p>
                  {isRevoked && (
                    <p className="mt-1 text-xs font-medium text-error">Revoque</p>
                  )}
                  {isExpired && !isRevoked && (
                    <p className="mt-1 text-xs font-medium text-charcoal/60">Expire</p>
                  )}
                  {isExhausted && !isExpired && !isRevoked && (
                    <p className="mt-1 text-xs font-medium text-charcoal/60">
                      Plus d'utilisations disponibles
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(c.code, c.id)}
                    disabled={isInactive}
                    aria-label="Copier le code"
                  >
                    {copiedId === c.id ? (
                      <Check className="h-4 w-4 text-forest" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                  {!isInactive && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => revoke.mutate(c.id)}
                      disabled={revoke.isPending}
                      className="border-error/40 text-error hover:bg-error/10"
                      aria-label="Revoquer le code"
                    >
                      <Ban className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
