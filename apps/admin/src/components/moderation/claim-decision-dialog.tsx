'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useApproveClaim, useRejectClaim, useDisputeClaim } from '@/lib/hooks/use-admin-moderation';
import { useT } from '@/i18n';

type Mode = 'approve' | 'reject' | 'dispute';

const reasonSchema = z.object({ reason: z.string().min(10).max(1000) });
const noteSchema = z.object({ note: z.string().max(1000).optional() });

interface Props {
  claimId: string;
  mode: Mode;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export function ClaimDecisionDialog({ claimId, mode, open, onOpenChange }: Props) {
  const t = useT();
  const approve = useApproveClaim();
  const reject = useRejectClaim();
  const dispute = useDisputeClaim();

  const isApprove = mode === 'approve';
  const schema = isApprove ? noteSchema : reasonSchema;
  type FormValues = { reason?: string; note?: string };

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: isApprove ? { note: '' } : { reason: '' },
  });

  useEffect(() => {
    if (open) form.reset(isApprove ? { note: '' } : { reason: '' });
  }, [open, mode, form, isApprove]);

  const isPending = approve.isPending || reject.isPending || dispute.isPending;

  const onSubmit = form.handleSubmit((values) => {
    if (mode === 'approve') {
      approve.mutate({ id: claimId, note: values.note }, { onSuccess: () => onOpenChange(false) });
    } else if (mode === 'reject') {
      reject.mutate({ id: claimId, reason: values.reason ?? '' }, { onSuccess: () => onOpenChange(false) });
    } else {
      dispute.mutate({ id: claimId, reason: values.reason ?? '' }, { onSuccess: () => onOpenChange(false) });
    }
  });

  const titles: Record<Mode, string> = {
    approve: t('admin.moderation.claim.approve'),
    reject: t('admin.moderation.claim.reject'),
    dispute: t('admin.moderation.claim.dispute'),
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{titles[mode]}</DialogTitle>
          <DialogDescription>{t('admin.common.auditedAction')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="text">{isApprove ? `${t('admin.common.reason')} (${t('admin.common.optional')})` : t('admin.common.reason')}</Label>
            <Textarea
              id="text"
              rows={4}
              placeholder={t('admin.common.reasonPlaceholder')}
              {...(isApprove ? form.register('note') : form.register('reason'))}
            />
            {!isApprove && form.formState.errors.reason && (
              <p className="text-xs text-error">{t('admin.common.reasonPlaceholder')}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              {t('admin.common.cancel')}
            </Button>
            <Button type="submit" variant={mode === 'approve' ? 'success' : 'destructive'} disabled={isPending}>
              {isPending ? t('admin.common.saving') : t('admin.actions.confirm')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
