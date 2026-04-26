'use client';

import { PageHeader } from '@/components/shared/page-header';
import { KinshipProbeForm } from '@/components/kinship-probe/probe-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Search } from 'lucide-react';

export default function KinshipProbePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Trouver un proche" />

      <Card className="border-forest/20 bg-forest/[0.03]">
        <CardContent className="flex items-start gap-3 p-4">
          <Shield className="mt-0.5 h-5 w-5 shrink-0 text-forest" />
          <div className="space-y-1 text-sm text-charcoal/80">
            <p className="font-medium text-charcoal">Comment ca marche</p>
            <p>
              Saisis le numero de telephone d'un proche que tu sais inscrit sur Origin.
              Si la personne existe, elle recevra ta demande et pourra confirmer le lien
              avec toi. Tu n'apprendras rien sur cette personne tant qu'elle n'a pas
              accepte.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Search className="h-5 w-5" />
            Demande de mise en relation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <KinshipProbeForm />
        </CardContent>
      </Card>

      <p className="text-center text-xs text-charcoal/50">
        Limite : 5 demandes par jour, 2 par heure.
      </p>
    </div>
  );
}
