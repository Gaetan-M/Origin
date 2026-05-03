'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Send, KeyRound, Search, Plus, LogIn, Tag } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FullPageSpinner } from '@/components/shared/loading-spinner';

import { CreateInvitationForm } from '@/components/invitations/create-invitation-form';
import { InvitationList } from '@/components/invitations/invitation-list';
import { CreateCodeForm } from '@/components/family-codes/create-code-form';
import { CodeList } from '@/components/family-codes/code-list';
import { RedeemForm } from '@/components/family-codes/redeem-form';
import { useCreateInvitation } from '@/lib/hooks/use-invitations';
import { cn } from '@/lib/utils';

type TabId = 'invite' | 'code' | 'probe';

const TABS: Array<{ id: TabId; label: string; icon: typeof Send }> = [
  { id: 'invite', label: 'Inviter', icon: Send },
  { id: 'code', label: 'Code famille', icon: KeyRound },
  { id: 'probe', label: 'Sonde de parente', icon: Search },
];

function ConnectContent() {
  const router = useRouter();
  const params = useSearchParams();
  const active = (params.get('tab') as TabId) ?? 'invite';

  function setTab(id: TabId) {
    const next = new URLSearchParams(params);
    next.set('tab', id);
    router.replace(`/connect?${next.toString()}`, { scroll: false });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <PageHeader title="Connecter" />
        <p className="-mt-2 text-sm text-charcoal/65">
          Trois manieres de relier les branches de ta famille.
        </p>
      </div>

      {/* Pill tab bar matching the design */}
      <div className="inline-flex w-full max-w-[560px] gap-1 rounded-2xl bg-sand p-1">
        {TABS.map((t) => {
          const isActive = t.id === active;
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                'flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors',
                isActive
                  ? 'bg-white text-charcoal shadow-card'
                  : 'text-charcoal/60 hover:text-charcoal',
              )}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {active === 'invite' && <InviteTab />}
      {active === 'code' && <CodeTab />}
      {active === 'probe' && <ProbeTab />}
    </div>
  );
}

function InviteTab() {
  const createInvitation = useCreateInvitation();
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Send className="h-4 w-4 text-forest" />
            Inviter par telephone
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-charcoal/65">
            Saisis le numero d'un proche. On lui envoie un SMS — il rejoint l'arbre quand il veut.
          </p>
          <CreateInvitationForm
            onSubmit={(data) => createInvitation.mutateAsync(data)}
            isPending={createInvitation.isPending}
          />
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-charcoal/55">
          Mes invitations
        </h2>
        <InvitationList />
      </div>
    </div>
  );
}

function CodeTab() {
  return (
    <div className="space-y-5">
      <Card className="border-terracotta/30 bg-gradient-to-br from-sand to-off-white">
        <CardContent className="p-5">
          <p className="text-sm text-charcoal/75">
            Genere un code court (ex. <span className="font-mono font-bold">MBALLA-2847</span>) et
            partage-le a ta famille — par WhatsApp, oralement ou sur papier. Quand quelqu'un le saisit,
            il rejoint ton arbre directement.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Plus className="h-4 w-4 text-forest" />
            Generer un code
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CreateCodeForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <LogIn className="h-4 w-4 text-forest" />
            J'ai recu un code
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RedeemForm />
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-charcoal/55">
          <Tag className="h-3.5 w-3.5" />
          Mes codes
        </h2>
        <CodeList />
      </div>
    </div>
  );
}

function ProbeTab() {
  return (
    <Card className="overflow-hidden border-deep-blue/20 bg-gradient-to-br from-deep-blue/[0.04] via-sand/30 to-forest/[0.04]">
      <CardContent className="space-y-4 p-8 text-center">
        <div
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-deep-blue/10 text-deep-blue"
          style={{ animation: 'pulse 2.4s ease-in-out infinite' }}
        >
          <Search className="h-7 w-7" />
        </div>
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-deep-blue">
            Bientot disponible
          </p>
          <h2 className="text-xl font-bold text-charcoal">Verifier nos liens de parente</h2>
          <p className="mx-auto max-w-md text-sm text-charcoal/65">
            On finalise une sonde privee qui detecte un ancetre commun avec une autre personne,
            sans reveler ton arbre. Ideal avant de s'engager dans une famille elargie.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ConnectPage() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <ConnectContent />
    </Suspense>
  );
}
