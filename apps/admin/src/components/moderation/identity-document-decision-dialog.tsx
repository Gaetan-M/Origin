'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useVerifyDocument, useRejectDocument } from '@/lib/hooks/use-admin-moderation';
import { useT } from '@/i18n';

const verifySchema = z.object({ note: z.string().max(1000).optional() });
const rejectSchema = z.object({ reason: z.string().min(10).max(1000) });

interface Props {
  documentId: string;
  mode: 'verify' | 'reject';
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export function IdentityDocumentDecisionDialog({ documentId, mode, open, onOpenChange }: Props) {
  const t = useT();
  const verify = useVerifyDocument();
  const reject = useRejectDocument();
  const isVerify = mode === 'verify';

  const form = useForm<{ note?: string; reason?: string }>({
    resolver: zodResolver(isVerify ? verifySchema : rejectSchema),
    defaultValues: isVerify ? { note: '' } : { reason: '' },
  });

  useEffect(() => {
    if (open) form.reset(isVerify ? { note: '' } : { reason: '' });
  }, [open, mode, form, isVerify]);

  const onSubmit = form.handleSubmit((values) => {
    if (isVerify) {
      verify.mutate({ id: documentId, note: values.note }, { onSuccess: () => onOpenChange(false) });
    } else {
      reject.mutate({ id: documentId, reason: values.reason ?? '' }, { onSuccess: () => onOpenChange(false) });
    }
  });

  const isPending = verify.isPending || reject.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isVerify ? t('admin.moderation.document.verify') : t('admin.moderation.document.reject')}</DialogTitle>
          <DialogDescription>{t('admin.common.auditedAction')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="text">
              {isVerify ? `${t('admin.common.reason')} (${t('admin.common.optional')})` : t('admin.common.reason')}
            </Label>
            <Textarea
              id="text"
              rows={4}
              placeholder={t('admin.common.reasonPlaceholder')}
              {...(isVerify ? form.register('note') : form.register('reason'))}
            />
            {!isVerify && form.formState.errors.reason && (
              <p className="text-xs text-error">{t('admin.common.reasonPlaceholder')}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              {t('admin.common.cancel')}
            </Button>
            <Button type="submit" variant={isVerify ? 'success' : 'destructive'} disabled={isPending}>
              {isPending ? t('admin.common.saving') : t('admin.actions.confirm')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
