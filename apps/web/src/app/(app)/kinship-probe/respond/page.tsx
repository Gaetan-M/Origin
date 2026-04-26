'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { UserSearch, Phone, MapPin, ArrowLeft, UserPlus } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FullPageSpinner } from '@/components/shared/loading-spinner';
import { getIncomingProbe } from '@/lib/api/kinship-probe';
import { ApiError } from '@/lib/api/client';
import { formatPhoneDisplay } from '@/lib/utils/phone';

function RespondContent() {
  const params = useSearchParams();
  const from = params.get('from');
  const router = useRouter();

  const { data, isLoading, error } = useQuery({
    queryKey: ['kinship-probe', 'incoming', from],
    queryFn: () => getIncomingProbe(from!),
    enabled: !!from,
    retry: false,
  });

  if (!from) {
    return (
      <div className="mx-auto max-w-xl">
        <PageHeader title="Demande de mise en relation" />
        <Card>
          <CardContent className="p-6 text-center text-charcoal/70">
            Lien invalide. Reviens depuis tes notifications.
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) return <FullPageSpinner />;

  if (error) {
    const msg =
      error instanceof ApiError ? error.message : 'Demande introuvable ou expiree';
    return (
      <div className="mx-auto max-w-xl">
        <PageHeader title="Demande de mise en relation" />
        <Card>
          <CardContent className="p-6 text-center text-charcoal/70">{msg}</CardContent>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  // Pre-fill add-person form with the requester's phone & name to make it easy
  // to add them to the responder's tree.
  const addPersonHref = `/persons/new?prefillName=${encodeURIComponent(
    data.requester.displayName ?? '',
  )}&prefillPhone=${encodeURIComponent(data.requester.phoneNumber)}`;

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageHeader title="Demande de mise en relation" />

      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ochre/15 text-ochre">
              <UserSearch className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-charcoal/55">
                {new Date(data.receivedAt).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
              <p className="mt-1 text-base font-semibold text-charcoal">
                {data.requester.displayName ?? 'Personne inscrite'}
              </p>
            </div>
          </div>

          <div className="space-y-2 rounded-lg bg-sand/40 p-3 text-sm">
            <div className="flex items-center gap-2 text-charcoal/75">
              <Phone className="h-4 w-4 shrink-0" />
              <span className="font-mono">{formatPhoneDisplay(data.requester.phoneNumber)}</span>
            </div>
            {data.requester.villageOrigin && (
              <div className="flex items-center gap-2 text-charcoal/75">
                <MapPin className="h-4 w-4 shrink-0" />
                <span>{data.requester.villageOrigin}</span>
              </div>
            )}
          </div>

          {data.message && (
            <div className="rounded-lg border border-forest/20 bg-forest/[0.04] p-3 text-sm text-charcoal/85">
              {data.message}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button asChild className="gap-2">
          <Link href={addPersonHref}>
            <UserPlus className="h-4 w-4" />
            Ajouter dans mon arbre
          </Link>
        </Button>
        <Button variant="ghost" onClick={() => router.push('/notifications')} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Plus tard
        </Button>
      </div>

      <p className="text-xs text-charcoal/55">
        Si tu reconnais cette personne, ajoute-la a ton arbre. Le numero etant verifie,
        votre arbre sera automatiquement relie a son compte.
      </p>
    </div>
  );
}

export default function KinshipProbeRespondPage() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <RespondContent />
    </Suspense>
  );
}
