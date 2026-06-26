'use client';

import { AlertCircle, Inbox, Send, User2, Phone, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import {
  useKinshipChecks,
  useConsentKinshipCheck,
  useDeclineKinshipCheck,
  useCancelKinshipCheck,
} from '@/lib/hooks/use-kinship-check';
import type { KinshipCheckView, KinshipCheckStatus } from '@/lib/api/kinship-check';
import { ResultCard } from './result-card';
import { useKinshipT, type KinshipStringKey } from './kinship-i18n';

export function ChecksList() {
  const t = useKinshipT();
  const { data, isLoading, isError, refetch } = useKinshipChecks();

  if (isLoading) return <ChecksSkeleton />;

  if (isError || !data) {
    return (
      <EmptyState
        icon={AlertCircle}
        title={t('listError')}
        actionLabel={t('retry')}
        onAction={() => refetch()}
      />
    );
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-charcoal/55">
          <Inbox className="h-3.5 w-3.5" />
          {t('incomingTitle')}
        </h2>
        {data.incoming.length === 0 ? (
          <p className="rounded-lg border border-dashed border-sand-dark/60 px-4 py-6 text-center text-sm text-charcoal/50">
            {t('incomingEmpty')}
          </p>
        ) : (
          data.incoming.map((check) => <CheckRow key={check.id} check={check} />)
        )}
      </section>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-charcoal/55">
          <Send className="h-3.5 w-3.5" />
          {t('outgoingTitle')}
        </h2>
        {data.outgoing.length === 0 ? (
          <p className="rounded-lg border border-dashed border-sand-dark/60 px-4 py-6 text-center text-sm text-charcoal/50">
            {t('outgoingEmpty')}
          </p>
        ) : (
          data.outgoing.map((check) => <CheckRow key={check.id} check={check} />)
        )}
      </section>
    </div>
  );
}

const STATUS_STRING: Record<
  KinshipCheckStatus,
  { incoming: KinshipStringKey; outgoing: KinshipStringKey }
> = {
  PENDING_CONSENT: { incoming: 'statusPendingIncoming', outgoing: 'statusPendingOutgoing' },
  CONSENTED: { incoming: 'statusConsented', outgoing: 'statusConsented' },
  DECLINED: { incoming: 'statusDeclined', outgoing: 'statusDeclined' },
  COMPUTED: { incoming: 'statusComputed', outgoing: 'statusComputed' },
  EXPIRED: { incoming: 'statusExpired', outgoing: 'statusExpired' },
  CANCELLED: { incoming: 'statusCancelled', outgoing: 'statusCancelled' },
};

function statusVariant(status: KinshipCheckStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'COMPUTED':
      return 'default';
    case 'DECLINED':
    case 'EXPIRED':
    case 'CANCELLED':
      return 'destructive';
    case 'CONSENTED':
      return 'secondary';
    default:
      return 'outline';
  }
}

function CheckRow({ check }: { check: KinshipCheckView }) {
  const t = useKinshipT();
  const consent = useConsentKinshipCheck();
  const decline = useDeclineKinshipCheck();
  const cancel = useCancelKinshipCheck();

  const isIncoming = check.direction === 'incoming';
  const counterparty = check.counterpartyName
    ? check.counterpartyName
    : check.invitedByPhone
      ? t('invitedByPhoneLabel')
      : t('someone');

  const statusKey = STATUS_STRING[check.status][isIncoming ? 'incoming' : 'outgoing'];
  const busy = consent.isPending || decline.isPending || cancel.isPending;

  const showConsentActions = isIncoming && check.status === 'PENDING_CONSENT';
  const showCancelAction = !isIncoming && check.status === 'PENDING_CONSENT';

  return (
    <Card className="border-sand">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sand text-charcoal/55">
              {check.invitedByPhone && !check.counterpartyName ? (
                <Phone className="h-4 w-4" />
              ) : (
                <User2 className="h-4 w-4" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs text-charcoal/45">
                {isIncoming ? t('requestedBy') : t('sentTo')}
              </p>
              <p className="truncate text-sm font-medium text-charcoal">{counterparty}</p>
            </div>
          </div>
          <Badge variant={statusVariant(check.status)} className="shrink-0">
            {t(statusKey)}
          </Badge>
        </div>

        {check.status === 'CONSENTED' && (
          <p className="flex items-center gap-1.5 text-xs text-charcoal/50">
            <Clock className="h-3 w-3" />
            {t('statusConsented')}
          </p>
        )}

        {showConsentActions && (
          <>
            <p className="text-xs leading-relaxed text-charcoal/55">{t('consentBody')}</p>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1"
                disabled={busy}
                onClick={() => consent.mutate(check.id)}
              >
                {consent.isPending ? t('consenting') : t('consent')}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                disabled={busy}
                onClick={() => decline.mutate(check.id)}
              >
                {decline.isPending ? t('declining') : t('decline')}
              </Button>
            </div>
          </>
        )}

        {showCancelAction && (
          <Button
            size="sm"
            variant="ghost"
            className="text-charcoal/60"
            disabled={busy}
            onClick={() => cancel.mutate(check.id)}
          >
            {cancel.isPending ? t('cancelling') : t('cancel')}
          </Button>
        )}

        {check.status === 'COMPUTED' && check.result && <ResultCard result={check.result} />}
      </CardContent>
    </Card>
  );
}

function ChecksSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-lg border border-sand bg-white p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3 w-1/4" />
              <Skeleton className="h-4 w-1/3" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
