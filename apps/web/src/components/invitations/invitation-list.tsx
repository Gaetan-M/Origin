'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useMyInvitations, useDeleteInvitation } from '@/lib/hooks/use-invitations';
import type { Invitation } from '@/lib/api/invitations';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import {
  Send,
  X,
  Copy,
  Check,
  CheckCircle2,
  Clock,
  AlertTriangle,
  MessageCircle,
} from 'lucide-react';
import { formatPhoneDisplay } from '@/lib/utils/phone';

type Status = 'pending' | 'consumed' | 'expired';

function statusOf(inv: Invitation): Status {
  if (inv.usedAt) return 'consumed';
  if (new Date(inv.expiresAt) < new Date()) return 'expired';
  return 'pending';
}

const STATUS_CONFIG: Record<
  Status,
  { label: string; icon: typeof Check; className: string }
> = {
  pending: {
    label: 'En attente',
    icon: Clock,
    className: 'bg-ochre/15 text-ochre border-ochre/30',
  },
  consumed: {
    label: 'Acceptee',
    icon: CheckCircle2,
    className: 'bg-forest/15 text-forest border-forest/30',
  },
  expired: {
    label: 'Expiree',
    icon: AlertTriangle,
    className: 'bg-charcoal/10 text-charcoal/55 border-charcoal/20',
  },
};

function buildInviteUrl(token: string): string {
  // Build off window.origin so the share link always lands on whatever host
  // the user is currently on (localhost in dev, prod domain in prod).
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}/join?invite=${token}`;
}

function formatDate(d: string): string {
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(
    new Date(d),
  );
}

export function InvitationList() {
  const { data, isLoading } = useMyInvitations();
  const deleteInvitation = useDeleteInvitation();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <EmptyState
        icon={Send}
        title="Aucune invitation envoyee"
        description="Tes invitations apparaitront ici. Le destinataire recoit un SMS avec un lien et peut accepter en un clic."
      />
    );
  }

  async function handleCopy(token: string, id: string) {
    try {
      await navigator.clipboard.writeText(buildInviteUrl(token));
      setCopiedId(id);
      toast.success('Lien copie dans le presse-papier');
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error('Impossible de copier le lien');
    }
  }

  function handleShareWhatsApp(inv: Invitation) {
    const url = buildInviteUrl(inv.token);
    const message = inv.relationshipHint
      ? `Salut ! Je t'invite a rejoindre Origin pour documenter notre arbre familial (${inv.relationshipHint}). Clique ici : ${url}`
      : `Salut ! Je t'invite a rejoindre Origin pour documenter notre arbre familial. Clique ici : ${url}`;
    const phone = inv.targetPhoneNumber?.replace(/\D/g, '');
    const waUrl = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  }

  return (
    <div className="space-y-2">
      {data.map((inv) => {
        const s = statusOf(inv);
        const cfg = STATUS_CONFIG[s];
        const Icon = cfg.icon;
        const isPending = s === 'pending';

        return (
          <Card key={inv.id}>
            <CardContent className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-charcoal">
                    {inv.targetPhoneNumber
                      ? formatPhoneDisplay(inv.targetPhoneNumber)
                      : "Lien d'invitation"}
                  </p>
                  {inv.relationshipHint && (
                    <p className="mt-0.5 text-xs text-charcoal/60">
                      Lien : {inv.relationshipHint}
                    </p>
                  )}
                  <p className="mt-1 text-[11px] text-charcoal/45">
                    Cree le {formatDate(inv.createdAt)}
                    {s === 'consumed' && inv.usedAt
                      ? ` · Acceptee le ${formatDate(inv.usedAt)}`
                      : s === 'pending'
                        ? ` · Expire le ${formatDate(inv.expiresAt)}`
                        : ''}
                  </p>
                </div>
                <Badge variant="outline" className={cfg.className}>
                  <Icon className="mr-1 h-3 w-3" />
                  {cfg.label}
                </Badge>
              </div>

              {isPending && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(inv.token, inv.id)}
                    className="gap-1.5"
                  >
                    {copiedId === inv.id ? (
                      <Check className="h-3.5 w-3.5 text-forest" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    Copier le lien
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleShareWhatsApp(inv)}
                    className="gap-1.5"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    WhatsApp
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteInvitation.mutate(inv.id)}
                    disabled={deleteInvitation.isPending}
                    className="ml-auto gap-1.5 text-error hover:bg-error/10 hover:text-error"
                  >
                    <X className="h-3.5 w-3.5" />
                    Annuler
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
