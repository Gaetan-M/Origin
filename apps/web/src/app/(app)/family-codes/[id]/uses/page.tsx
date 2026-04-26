'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, KeyRound, UserCheck } from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FullPageSpinner } from '@/components/shared/loading-spinner';
import { EmptyState } from '@/components/shared/empty-state';
import { getFamilyCodeUses } from '@/lib/api/family-codes';
import { ApiError } from '@/lib/api/client';

export default function FamilyCodeUsesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data, isLoading, error } = useQuery({
    queryKey: ['family-code-uses', id],
    queryFn: () => getFamilyCodeUses(id),
    retry: false,
  });

  if (isLoading) return <FullPageSpinner />;

  if (error) {
    const msg =
      error instanceof ApiError ? error.message : 'Code introuvable ou non autorise';
    return (
      <div className="mx-auto max-w-xl">
        <PageHeader title="Utilisations du code" />
        <Card>
          <CardContent className="p-6 text-center text-charcoal/70">{msg}</CardContent>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Utilisations du code" />

      <Card className="border-forest/30 bg-forest/[0.04]">
        <CardContent className="flex items-center gap-3 p-4">
          <KeyRound className="h-5 w-5 text-forest" />
          <div className="min-w-0">
            {data.code.label && (
              <p className="text-xs font-semibold uppercase tracking-wide text-charcoal/55">
                {data.code.label}
              </p>
            )}
            <p className="font-mono text-xl font-bold tracking-wider text-forest">
              {data.code.code}
            </p>
          </div>
        </CardContent>
      </Card>

      {data.uses.length === 0 ? (
        <EmptyState
          icon={UserCheck}
          title="Personne n'a encore utilise ce code"
          description="Quand un proche le saisit dans Origin, tu le verras ici."
        />
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-charcoal/60">
            {data.uses.length} personne{data.uses.length > 1 ? 's' : ''} ont rejoint via ce
            code.
          </p>
          <div className="space-y-2">
            {data.uses.map((u) => (
              <Card key={u.id}>
                <CardContent className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-charcoal">
                      {u.account.displayName ?? 'Compte sans fiche'}
                    </p>
                    <p className="font-mono text-xs text-charcoal/55">
                      {u.account.phoneNumber}
                    </p>
                  </div>
                  <span className="text-xs text-charcoal/50">
                    {new Date(u.usedAt).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <Button asChild variant="ghost" className="gap-2">
        <Link href="/family-codes">
          <ArrowLeft className="h-4 w-4" />
          Retour aux codes
        </Link>
      </Button>
    </div>
  );
}
