'use client';

import { use } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { CheckCircle2, XCircle, Sparkles, ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FullPageSpinner } from '@/components/shared/loading-spinner';
import {
  getMatchSuggestion,
  resolveMatchSuggestion,
} from '@/lib/api/matching';
import { ApiError } from '@/lib/api/client';

export default function MatchSuggestionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['match-suggestion', id],
    queryFn: () => getMatchSuggestion(id),
    retry: false,
  });

  const resolve = useMutation({
    mutationFn: (decision: 'accept' | 'reject') => resolveMatchSuggestion(id, decision),
    onSuccess: (_, decision) => {
      queryClient.invalidateQueries({ queryKey: ['match-suggestion', id] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success(
        decision === 'accept'
          ? 'Suggestion confirmee. Tu peux maintenant inviter cette personne.'
          : 'Suggestion ecartee.',
      );
      router.push('/notifications');
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : 'Action impossible.';
      toast.error(msg);
    },
  });

  if (isLoading) return <FullPageSpinner />;

  if (error) {
    const msg = error instanceof ApiError ? error.message : 'Suggestion introuvable';
    return (
      <div className="mx-auto max-w-xl">
        <PageHeader title="Suggestion" />
        <Card>
          <CardContent className="p-6 text-center text-charcoal/70">{msg}</CardContent>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  const isResolved = data.status !== 'PENDING';
  const score = Math.round(data.matchScore * 100);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Suggestion de correspondance" />

      <Card className="border-ochre/30 bg-ochre/[0.04]">
        <CardContent className="flex items-start gap-3 p-4">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-ochre" />
          <p className="text-sm text-charcoal/80">
            Une nouvelle inscription pourrait correspondre a une fiche que tu as ajoutee.
            Compare et confirme si tu reconnais la personne.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-wide text-charcoal/55">
              Ta fiche
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="text-base font-semibold text-charcoal">{data.ghost.displayName}</p>
            {data.ghost.birthYearApproximate && (
              <p className="text-charcoal/70">Annee : {data.ghost.birthYearApproximate}</p>
            )}
            {data.ghost.villageOrigin && (
              <p className="text-charcoal/70">Village : {data.ghost.villageOrigin}</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-forest/30">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-wide text-forest">
              Nouvel inscrit
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="text-base font-semibold text-charcoal">{data.candidate.displayName}</p>
            {data.candidate.birthYearApproximate && (
              <p className="text-charcoal/70">Annee : {data.candidate.birthYearApproximate}</p>
            )}
            {data.candidate.villageOrigin && (
              <p className="text-charcoal/70">Village : {data.candidate.villageOrigin}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-charcoal/70">Confiance du match :</span>
            <span className="text-lg font-semibold text-forest">{score}%</span>
          </div>
          {data.matchingSignals && (
            <div className="grid grid-cols-2 gap-2 text-xs text-charcoal/60 sm:grid-cols-3">
              {Object.entries(data.matchingSignals).map(([key, val]) => (
                <div key={key} className="rounded bg-sand/40 px-2 py-1">
                  {key}: {Math.round((val as number) * 100)}%
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {isResolved ? (
        <Card className="bg-sand/40">
          <CardContent className="flex items-center gap-3 p-4 text-sm text-charcoal/70">
            <CheckCircle2 className="h-4 w-4" />
            Cette suggestion a deja ete traitee ({data.status.toLowerCase()}).
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => resolve.mutate('accept')}
            disabled={resolve.isPending}
            className="gap-2"
          >
            <CheckCircle2 className="h-4 w-4" />
            Confirmer le match
          </Button>
          <Button
            variant="outline"
            onClick={() => resolve.mutate('reject')}
            disabled={resolve.isPending}
            className="gap-2 border-error/40 text-error hover:bg-error/10"
          >
            <XCircle className="h-4 w-4" />
            Ecarter
          </Button>
          <Button variant="ghost" onClick={() => router.back()} className="gap-2 ml-auto">
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Button>
        </div>
      )}
    </div>
  );
}
