'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  useVerifyInvitation,
  useConsumeInvitation,
} from '@/lib/hooks/use-invitations';
import { useAuthStore } from '@/stores/auth-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FullPageSpinner } from '@/components/shared/loading-spinner';
import { EmptyState } from '@/components/shared/empty-state';
import {
  TreePine,
  UserPlus,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';

function JoinContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('invite') ?? undefined;
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  const { data: invitation, isLoading, error } = useVerifyInvitation(token);
  const consume = useConsumeInvitation();

  // Once-per-mount guard so we don't trigger consume() twice on re-renders.
  const [autoConsumed, setAutoConsumed] = useState(false);

  useEffect(() => {
    if (
      isAuthenticated &&
      token &&
      invitation &&
      !consume.isPending &&
      !autoConsumed
    ) {
      setAutoConsumed(true);
      consume
        .mutateAsync(token)
        .then(() => {
          toast.success('Invitation acceptee !');
          // Targeted redirect when the invitation was attached to a Person —
          // otherwise dump on the dashboard which knows how to onboard.
          if (invitation.targetPerson?.id) {
            router.replace(`/persons/${invitation.targetPerson.id}`);
          } else {
            router.replace('/dashboard');
          }
        })
        .catch(() => {
          // Error toast is handled inside the hook; we still want to stay on
          // this page so the user can see what's wrong.
          setAutoConsumed(false);
        });
    }
  }, [isAuthenticated, token, invitation, consume, autoConsumed, router]);

  if (!token) {
    return (
      <CenteredCard>
        <EmptyState
          icon={AlertTriangle}
          title="Lien invalide"
          description="Ce lien d'invitation n'est pas valide."
          actionLabel="Retour"
          onAction={() => router.push('/')}
        />
      </CenteredCard>
    );
  }

  if (isLoading) return <FullPageSpinner />;

  if (error || !invitation) {
    return (
      <CenteredCard>
        <EmptyState
          icon={AlertTriangle}
          title="Invitation introuvable"
          description="Cette invitation a peut-etre expire ou a deja ete utilisee."
          actionLabel="Retour"
          onAction={() => router.push('/')}
        />
      </CenteredCard>
    );
  }

  // Already-logged-in path: useEffect above is consuming silently. Show a
  // friendly transitional state so the user has feedback while we redirect.
  if (isAuthenticated) {
    return (
      <CenteredCard>
        <Card className="w-full max-w-md border-0 shadow-elevated">
          <CardContent className="space-y-4 p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-forest/15">
              {consume.isPending || autoConsumed ? (
                <CheckCircle2 className="h-7 w-7 text-forest" />
              ) : (
                <ArrowRight className="h-7 w-7 text-forest" />
              )}
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-charcoal">
                {consume.isPending
                  ? 'Acceptation en cours...'
                  : 'Te voila ajoute !'}
              </h2>
              <p className="text-sm text-charcoal/70">
                {consume.isPending
                  ? "On finalise la mise en relation."
                  : 'Redirection vers ton compte...'}
              </p>
            </div>
          </CardContent>
        </Card>
      </CenteredCard>
    );
  }

  // Not-logged-in path: show invitation context + CTA to sign up / log in.
  return (
    <CenteredCard>
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-forest/10">
        <TreePine className="h-8 w-8 text-forest" />
      </div>

      <Card className="w-full max-w-md border-0 shadow-elevated">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Tu es invite sur Origin</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 text-center">
          <div className="flex items-center justify-center gap-2 text-charcoal/80">
            <UserPlus className="h-5 w-5 text-forest" />
            <span>
              <span className="font-medium">{invitation.inviterPhone}</span> t'invite
              a documenter votre arbre familial.
            </span>
          </div>

          {invitation.relationshipHint && (
            <div className="rounded-lg bg-sand/50 p-3 text-sm text-charcoal/85">
              <span className="font-medium">Lien indique : </span>
              {invitation.relationshipHint}
            </div>
          )}

          <p className="text-xs text-charcoal/60">
            En continuant, tu vas creer ton compte (ou te connecter si tu en as
            deja un) et l'invitation sera automatiquement acceptee.
          </p>

          <Link href={`/auth/login?invite=${token}`}>
            <Button size="lg" className="w-full">
              Continuer
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>

          <p className="text-[11px] text-charcoal/45">
            Expire le{' '}
            {new Intl.DateTimeFormat('fr-FR', {
              day: 'numeric',
              month: 'long',
            }).format(new Date(invitation.expiresAt))}
          </p>
        </CardContent>
      </Card>
    </CenteredCard>
  );
}

function CenteredCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-sand px-4">
      {children}
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <JoinContent />
    </Suspense>
  );
}
