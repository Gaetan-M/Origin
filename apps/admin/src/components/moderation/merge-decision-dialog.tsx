'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useApproveMerge, useRejectMerge } from '@/lib/hooks/use-admin-moderation';
import { useT } from '@/i18n';

interface Props {
  mergeId: string;
  mode: 'approve' | 'reject';
  keeperPersonId: string | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

const approveSchema = z.object({ reason: z.string().max(1000).optional() });
const rejectSchema = z.object({ reason: z.string().min(10).max(1000) });

export function MergeDecisionDialog({ mergeId, mode, keeperPersonId, open, onOpenChange }: Props) {
  const t = useT();
  const approve = useApproveMerge();
  const reject = useRejectMerge();
  const isApprove = mode === 'approve';

  const form = useForm<{ reason?: string }>({
    resolver: zodResolver(isApprove ? approveSchema : rejectSchema),
    defaultValues: { reason: '' },
  });

  useEffect(() => {
    if (open) form.reset({ reason: '' });
  }, [open, mode, form]);

  const onSubmit = form.handleSubmit((values) => {
    if (isApprove) {
      if (!keeperPersonId) return;
      approve.mutate(
        { id: mergeId, keeperPersonId, reason: values.reason },
        { onSuccess: () => onOpenChange(false) },
      );
    } else {
      reject.mutate({ id: mergeId, reason: values.reason ?? '' }, { onSuccess: () => onOpenChange(false) });
    }
  });

  const isPending = approve.isPending || reject.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isApprove ? t('admin.moderation.merge.approve') : t('admin.moderation.merge.reject')}
          </DialogTitle>
          <DialogDescription>{t('admin.moderation.merge.consequence')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <Alert variant={isApprove ? 'warning' : 'destructive'}>
            <AlertDescription>{t('admin.common.auditedAction')}</AlertDescription>
          </Alert>
          <div className="space-y-2">
            <Label htmlFor="reason">
              {t('admin.common.reason')} {isApprove && `(${t('admin.common.optional')})`}
            </Label>
            <Textarea id="reason" rows={4} placeholder={t('admin.common.reasonPlaceholder')} {...form.register('reason')} />
            {!isApprove && form.formState.errors.reason && (
              <p className="text-xs text-error">{t('admin.common.reasonPlaceholder')}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              {t('admin.common.cancel')}
            </Button>
            <Button type="submit" variant={isApprove ? 'success' : 'destructive'} disabled={isPending}>
              {isPending ? t('admin.common.saving') : t('admin.actions.confirm')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
