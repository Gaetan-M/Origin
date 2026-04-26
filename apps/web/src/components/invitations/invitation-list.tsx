'use client';

import { useMyInvitations, useDeleteInvitation } from '@/lib/hooks/use-invitations';
import type { Invitation } from '@/lib/api/invitations';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { Send, X } from 'lucide-react';
import { formatPhoneDisplay } from '@/lib/utils/phone';
import { useT } from '@/i18n';

function getStatus(inv: Invitation, t: (key: string) => string): { label: string; variant: 'default' | 'secondary' | 'destructive' } {
  if (inv.consumedAt) return { label: t('invitations.consumed'), variant: 'default' };
  if (new Date(inv.expiresAt) < new Date()) return { label: t('invitations.expired'), variant: 'destructive' };
  return { label: t('invitations.pending'), variant: 'secondary' };
}

export function InvitationList() {
  const { data: invitations, isLoading } = useMyInvitations();
  const deleteInvitation = useDeleteInvitation();
  const t = useT();

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
      </div>
    );
  }

  if (!invitations || invitations.length === 0) {
    return <EmptyState icon={Send} title={t('invitations.empty')} />;
  }

  return (
    <div className="space-y-2">
      {invitations.map((inv) => {
        const status = getStatus(inv, t);
        const canCancel = !inv.consumedAt && new Date(inv.expiresAt) > new Date();

        return (
          <Card key={inv.id}>
            <CardContent className="flex items-center justify-between p-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-charcoal">
                  {inv.targetPhoneNumber ? formatPhoneDisplay(inv.targetPhoneNumber) : 'Invitation'}
                </p>
                {inv.relationshipHint && (
                  <p className="text-xs text-charcoal/50">{inv.relationshipHint}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={status.variant}>{status.label}</Badge>
                {canCancel && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => deleteInvitation.mutate(inv.id)}
                    disabled={deleteInvitation.isPending}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
