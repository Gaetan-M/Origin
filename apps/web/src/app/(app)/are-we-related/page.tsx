'use client';

import { HeartHandshake, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InitiateCheckForm } from '@/components/kinship/initiate-check-form';
import { ChecksList } from '@/components/kinship/checks-list';
import { useKinshipT } from '@/components/kinship/kinship-i18n';

export default function AreWeRelatedPage() {
  const t = useKinshipT();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-charcoal">
          <HeartHandshake className="h-6 w-6 text-forest" />
          {t('title')}
        </h1>
        <p className="text-sm text-charcoal/60">{t('subtitle')}</p>
      </header>

      {/* Privacy reassurance — this is a sensitive, consent-first feature. */}
      <Card className="border-deep-blue/20 bg-gradient-to-br from-deep-blue/[0.04] to-sand/30">
        <CardContent className="flex gap-3 p-4">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-deep-blue" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-charcoal">{t('privacyTitle')}</p>
            <p className="text-xs leading-relaxed text-charcoal/65">{t('privacyBody')}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('initiateTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-charcoal/65">{t('initiateHint')}</p>
          <InitiateCheckForm />
        </CardContent>
      </Card>

      <ChecksList />
    </div>
  );
}
