'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useResolveVerification } from '@/lib/hooks/use-admin-moderation';
import { useT } from '@/i18n';
import { cn } from '@/lib/utils';

interface Props {
  verificationId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export function VerificationResolveDialog({ verificationId, open, onOpenChange }: Props) {
  const t = useT();
  const [decision, setDecision] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [note, setNote] = useState('');
  const resolve = useResolveVerification();

  useEffect(() => {
    if (open) {
      setDecision('APPROVED');
      setNote('');
    }
  }, [open]);

  const onSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    resolve.mutate(
      { id: verificationId, decision, note: note || undefined },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('admin.moderation.verification.resolve')}</DialogTitle>
          <DialogDescription>{t('admin.common.auditedAction')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setDecision('APPROVED')}
              className={cn(
                'rounded-md border p-3 text-sm font-medium transition',
                decision === 'APPROVED'
                  ? 'border-success bg-success-light text-success'
                  : 'border-charcoal/10 text-charcoal/70',
              )}
            >
              {t('admin.actions.approve')}
            </button>
            <button
              type="button"
              onClick={() => setDecision('REJECTED')}
              className={cn(
                'rounded-md border p-3 text-sm font-medium transition',
                decision === 'REJECTED'
                  ? 'border-error bg-error-light text-error'
                  : 'border-charcoal/10 text-charcoal/70',
              )}
            >
              {t('admin.actions.reject')}
            </button>
          </div>
          <div className="space-y-2">
            <Label htmlFor="note">{t('admin.common.reason')} ({t('admin.common.optional')})</Label>
            <Textarea id="note" rows={4} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={resolve.isPending}>
              {t('admin.common.cancel')}
            </Button>
            <Button type="submit" disabled={resolve.isPending}>
              {resolve.isPending ? t('admin.common.saving') : t('admin.actions.confirm')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
