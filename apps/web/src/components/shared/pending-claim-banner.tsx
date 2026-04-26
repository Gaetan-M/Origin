'use client';

import { ClaimStatus } from '@origin/shared-types';
import { useMyClaims } from '@/lib/hooks/use-claims';
import { Clock } from 'lucide-react';

/**
 * Shown across the app whenever the current account has a claim that is
 * still pending (PENDING or PENDING_VERIFICATION). Lets the user know
 * they are temporarily attached to someone else's person record and that
 * their claim is awaiting family validation. Renders nothing in the
 * common case where the user owns a verified claim.
 */
export function PendingClaimBanner() {
  const { data: claims } = useMyClaims();

  if (!claims || claims.length === 0) return null;

  const hasVerified = claims.some((c) => c.status === ClaimStatus.VERIFIED);
  if (hasVerified) return null;

  const pending = claims.find(
    (c) =>
      c.status === ClaimStatus.PENDING ||
      c.status === ClaimStatus.PENDING_VERIFICATION,
  );
  if (!pending) return null;

  const validationCount = pending.validationCount ?? 0;

  return (
    <div className="mb-4 flex items-start gap-3 rounded-xl border border-ochre/40 bg-ochre/10 px-4 py-3 text-sm">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ochre/25 text-[var(--color-ochre-dark)]">
        <Clock className="h-4 w-4" />
      </div>
      <div className="flex-1 text-charcoal/80">
        <p className="font-semibold text-charcoal">
          Ta revendication est en attente
        </p>
        <p className="mt-0.5 text-xs text-charcoal/65">
          Tu as revendique un profil existant. Il faut{' '}
          <span className="font-medium">
            {Math.max(0, 3 - validationCount)} validation
            {3 - validationCount > 1 ? 's' : ''}
          </span>{' '}
          de la famille avant que le rattachement soit officiel.
        </p>
      </div>
    </div>
  );
}
