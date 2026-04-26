'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';
import { useVerifyInvitation } from '@/lib/hooks/use-invitations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FullPageSpinner } from '@/components/shared/loading-spinner';
import { EmptyState } from '@/components/shared/empty-state';
import { TreePine, UserPlus, AlertTriangle } from 'lucide-react';
import { useT } from '@/i18n';

function JoinContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('invite') ?? undefined;
  const { data: invitation, isLoading, error } = useVerifyInvitation(token);
  const t = useT();

  if (!token) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Lien invalide"
        description="Ce lien d'invitation n'est pas valide."
        actionLabel={t('common.back')}
        onAction={() => window.location.href = '/'}
      />
    );
  }

  if (isLoading) return <FullPageSpinner />;

  if (error || !invitation) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Invitation introuvable"
        description="Cette invitation a peut-etre expire ou a deja ete utilisee."
        actionLabel={t('common.back')}
        onAction={() => window.location.href = '/'}
      />
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-sand px-4">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-forest/10">
        <TreePine className="h-8 w-8 text-forest" />
      </div>

      <Card className="w-full max-w-md border-0 shadow-elevated">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">{t('join.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <div className="flex items-center justify-center gap-2 text-charcoal/70">
            <UserPlus className="h-5 w-5" />
            <span>{t('join.invitedBy')}</span>
          </div>

          {invitation.relationshipHint && (
            <p className="text-sm text-charcoal/60">
              {t('join.hint', { hint: invitation.relationshipHint })}
            </p>
          )}

          <Link href={`/auth/login?invite=${token}`}>
            <Button size="lg" className="w-full">
              {t('join.cta')}
            </Button>
          </Link>
        </CardContent>
      </Card>
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
