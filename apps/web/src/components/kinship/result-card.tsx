'use client';

import { HeartHandshake, ShieldOff, Lock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { KinshipResult } from '@/lib/api/kinship-check';
import { useKinshipT, useKinshipLocale } from './kinship-i18n';

interface ResultCardProps {
  result: KinshipResult;
  className?: string;
}

/**
 * Respectful display of a kinship result. Renders ONLY { related, degree, label }
 * — by construction it has nothing else to show. No names, no tree, no path.
 */
export function ResultCard({ result, className }: ResultCardProps) {
  const t = useKinshipT();
  const locale = useKinshipLocale();
  const label = locale === 'en' ? result.labelEn : result.labelFr;

  if (!result.related) {
    return (
      <Card className={cn('border-charcoal/10 bg-sand/40', className)}>
        <CardContent className="space-y-3 p-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-charcoal/5 text-charcoal/50">
            <ShieldOff className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-semibold text-charcoal">{t('resultUnrelatedTitle')}</h3>
          <p className="mx-auto max-w-sm text-sm text-charcoal/60">{t('resultUnrelatedBody')}</p>
          <PrivacyFooter label={t('resultPrivacyFooter')} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        'overflow-hidden border-forest/25 bg-gradient-to-br from-forest/[0.06] via-sand/30 to-terracotta/[0.05]',
        className,
      )}
    >
      <CardContent className="space-y-3 p-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-forest/10 text-forest">
          <HeartHandshake className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-semibold text-charcoal">{t('resultRelatedTitle')}</h3>
        {/* The human label is the heart of the reveal — calm and prominent. */}
        <p className="mx-auto max-w-md text-base font-medium text-forest-dark">{label}</p>
        {result.degree !== null && (
          <p className="text-xs uppercase tracking-wide text-charcoal/50">
            {t('resultDegree')}&nbsp;: {result.degree}
          </p>
        )}
        <PrivacyFooter label={t('resultPrivacyFooter')} />
      </CardContent>
    </Card>
  );
}

function PrivacyFooter({ label }: { label: string }) {
  return (
    <p className="mx-auto flex max-w-sm items-center justify-center gap-1.5 pt-1 text-[11px] leading-snug text-charcoal/45">
      <Lock className="h-3 w-3 shrink-0" />
      <span>{label}</span>
    </p>
  );
}
