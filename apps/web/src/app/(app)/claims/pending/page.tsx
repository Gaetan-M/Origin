'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getPendingClaims,
  validateClaim,
  disputeClaim,
} from '@/lib/api/claims';
import { ApiError } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/page-header';
import { FullPageSpinner } from '@/components/shared/loading-spinner';
import { EmptyState } from '@/components/shared/empty-state';
import { CheckCircle2, XCircle, Users } from 'lucide-react';
import { formatPhoneDisplay } from '@/lib/utils/phone';

interface PendingClaim {
  id: string;
  status: string;
  validationCount: number;
  evidence: string | null;
  createdAt: string;
  person: { id: string; displayName: string };
  account: { id: string; phoneNumber: string };
}

export default function PendingClaimsPage() {
  const queryClient = useQueryClient();
  const { data: claims, isLoading } = useQuery<PendingClaim[]>({
    queryKey: ['claims', 'pending'],
    queryFn: () => getPendingClaims() as unknown as Promise<PendingClaim[]>,
  });

  const [disputeOpenFor, setDisputeOpenFor] = useState<string | null>(null);
  const [disputeReason, setDisputeReason] = useState('');

  const approve = useMutation({
    mutationFn: (claimId: string) => validateClaim(claimId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claims', 'pending'] });
      toast.success('Revendication validee.');
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : 'Validation refusee.';
      toast.error(msg);
    },
  });

  const reject = useMutation({
    mutationFn: ({ claimId, reason }: { claimId: string; reason: string }) =>
      disputeClaim(claimId, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claims', 'pending'] });
      setDisputeOpenFor(null);
      setDisputeReason('');
      toast.success('Revendication contestee.');
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : 'Impossible de contester.';
      toast.error(msg);
    },
  });

  if (isLoading) return <FullPageSpinner />;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Revendications a valider" />
      <p className="-mt-2 mb-6 text-sm text-charcoal/60">
        Des utilisateurs affirment etre des membres de ta famille. Valide ou
        conteste chaque demande.
      </p>

      {!claims || claims.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Aucune revendication en attente"
          description="Quand un membre de la famille se rattachera a un profil que tu as cree ou revendique, tu le verras ici."
        />
      ) : (
        <div className="space-y-3">
          {claims.map((c) => {
            const remaining = Math.max(0, 3 - c.validationCount);
            const phoneLabel = formatPhoneDisplay(c.account.phoneNumber);
            const isDisputing = disputeOpenFor === c.id;
            return (
              <Card key={c.id}>
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-charcoal/55">
                        Revendication
                      </p>
                      <p className="mt-1 text-base text-charcoal">
                        <span className="font-semibold">{phoneLabel}</span>{' '}
                        affirme etre{' '}
                        <span className="font-semibold">
                          {c.person.displayName}
                        </span>
                      </p>
                      {c.evidence && (
                        <p className="mt-2 rounded-md bg-sand/50 px-3 py-2 text-sm text-charcoal/75">
                          <span className="font-medium">Message : </span>
                          {c.evidence}
                        </p>
                      )}
                      <p className="mt-2 text-xs text-charcoal/50">
                        {remaining} validation{remaining > 1 ? 's' : ''}{' '}
                        {remaining > 0 ? 'restante' : 'restante'}
                        {remaining > 1 ? 's' : ''} avant confirmation
                        officielle ({c.validationCount}/3).
                      </p>
                    </div>
                  </div>

                  {!isDisputing ? (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        onClick={() => approve.mutate(c.id)}
                        disabled={approve.isPending}
                        className="gap-2"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Valider
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDisputeOpenFor(c.id)}
                        disabled={reject.isPending}
                        className="gap-2 border-error/40 text-error hover:bg-error/10"
                      >
                        <XCircle className="h-4 w-4" />
                        Contester
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2 rounded-lg border border-error/30 bg-error/5 p-3">
                      <label
                        htmlFor={`dispute-${c.id}`}
                        className="text-xs font-semibold text-error"
                      >
                        Pourquoi contestes-tu?
                      </label>
                      <textarea
                        id={`dispute-${c.id}`}
                        value={disputeReason}
                        onChange={(e) => setDisputeReason(e.target.value)}
                        placeholder="Explique en quelques mots"
                        className="w-full rounded-md border border-error/30 bg-white p-2 text-sm"
                        rows={3}
                        maxLength={500}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-error/40 text-error hover:bg-error/10"
                          disabled={!disputeReason.trim() || reject.isPending}
                          onClick={() =>
                            reject.mutate({
                              claimId: c.id,
                              reason: disputeReason.trim(),
                            })
                          }
                        >
                          Confirmer la contestation
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setDisputeOpenFor(null);
                            setDisputeReason('');
                          }}
                          disabled={reject.isPending}
                        >
                          Annuler
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
