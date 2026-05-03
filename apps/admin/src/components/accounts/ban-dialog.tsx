'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { AdminAccount } from '@origin/shared-types';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useBanAccount } from '@/lib/hooks/use-admin-accounts';
import { useT } from '@/i18n';

const schema = z.object({ reason: z.string().min(10).max(1000) });
type FormValues = z.infer<typeof schema>;

export function BanDialog({ account, open, onOpenChange }: { account: AdminAccount; open: boolean; onOpenChange: (o: boolean) => void }) {
  const t = useT();
  const ban = useBanAccount(account.id);

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { reason: '' } });

  useEffect(() => {
    if (open) form.reset({ reason: '' });
  }, [open, form]);

  const onSubmit = form.handleSubmit((values) => {
    ban.mutate(values.reason, { onSuccess: () => onOpenChange(false) });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('admin.accounts.ban.title')}</DialogTitle>
          <DialogDescription>{t('admin.accounts.ban.description')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <Alert variant="warning">
            <AlertDescription>{t('admin.common.auditedAction')}</AlertDescription>
          </Alert>
          <div className="space-y-2">
            <Label htmlFor="reason">{t('admin.accounts.ban.reasonLabel')}</Label>
            <Textarea id="reason" rows={4} placeholder={t('admin.common.reasonPlaceholder')} {...form.register('reason')} />
            {form.formState.errors.reason && (
              <p className="text-xs text-error">{t('admin.common.reasonPlaceholder')}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={ban.isPending}>
              {t('admin.common.cancel')}
            </Button>
            <Button type="submit" variant="destructive" disabled={ban.isPending}>
              {ban.isPending ? t('admin.common.saving') : t('admin.actions.ban')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
