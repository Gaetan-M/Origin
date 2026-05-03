'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { AdminAccount } from '@origin/shared-types';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useDeleteAccount } from '@/lib/hooks/use-admin-accounts';
import { useT } from '@/i18n';

const schema = z.object({ reason: z.string().min(10).max(1000) });
type FormValues = z.infer<typeof schema>;

export function DeleteAccountDialog({ account, open, onOpenChange }: { account: AdminAccount; open: boolean; onOpenChange: (o: boolean) => void }) {
  const t = useT();
  const [ack, setAck] = useState(false);
  const del = useDeleteAccount(account.id);

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { reason: '' } });

  useEffect(() => {
    if (open) {
      form.reset({ reason: '' });
      setAck(false);
    }
  }, [open, form]);

  const onSubmit = form.handleSubmit((values) => {
    if (!ack) return;
    del.mutate(values.reason, { onSuccess: () => onOpenChange(false) });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('admin.accounts.delete.title')}</DialogTitle>
          <DialogDescription>{t('admin.accounts.delete.description')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <Alert variant="destructive">
            <AlertDescription>{t('admin.common.auditedAction')}</AlertDescription>
          </Alert>
          <div className="space-y-2">
            <Label htmlFor="reason">{t('admin.common.reason')}</Label>
            <Textarea id="reason" rows={4} placeholder={t('admin.common.reasonPlaceholder')} {...form.register('reason')} />
            {form.formState.errors.reason && (
              <p className="text-xs text-error">{t('admin.common.reasonPlaceholder')}</p>
            )}
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-input" checked={ack} onChange={(e) => setAck(e.target.checked)} />
            <span>{t('admin.accounts.delete.ack')}</span>
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={del.isPending}>
              {t('admin.common.cancel')}
            </Button>
            <Button type="submit" variant="destructive" disabled={del.isPending || !ack}>
              {del.isPending ? t('admin.common.saving') : t('admin.actions.delete')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
