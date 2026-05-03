'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { AdminAccount } from '@origin/shared-types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useT } from '@/i18n';
import { useUpdateAccount } from '@/lib/hooks/use-admin-accounts';

const editSchema = z.object({
  fullName: z.string().max(255).optional().or(z.literal('')),
  email: z.string().email().optional().or(z.literal('')),
  notes: z.string().max(2000).optional().or(z.literal('')),
});

type EditFormValues = z.infer<typeof editSchema>;

interface EditAccountDialogProps {
  account: AdminAccount;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditAccountDialog({
  account,
  open,
  onOpenChange,
}: EditAccountDialogProps) {
  const t = useT();
  const update = useUpdateAccount(account.id);

  const form = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      fullName: account.fullName ?? '',
      email: account.email ?? '',
      notes: account.notes ?? '',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        fullName: account.fullName ?? '',
        email: account.email ?? '',
        notes: account.notes ?? '',
      });
    }
  }, [open, account, form]);

  const onSubmit = form.handleSubmit((values) => {
    update.mutate(
      {
        fullName: values.fullName ? values.fullName : null,
        email: values.email ? values.email : null,
        notes: values.notes ? values.notes : null,
      },
      {
        onSuccess: () => onOpenChange(false),
      },
    );
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('admin.accounts.dialogs.editTitle')}</DialogTitle>
          <DialogDescription>
            {t('admin.accounts.dialogs.editTitle')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">{t('admin.accounts.columns.fullName')}</Label>
            <Input id="fullName" {...form.register('fullName')} />
            {form.formState.errors.fullName?.message && (
              <p className="text-xs text-red-600">
                {form.formState.errors.fullName.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...form.register('email')} />
            {form.formState.errors.email?.message && (
              <p className="text-xs text-red-600">
                {form.formState.errors.email.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" rows={4} {...form.register('notes')} />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={update.isPending}
            >
              {t('admin.common.cancel')}
            </Button>
            <Button type="submit" disabled={update.isPending}>
              {update.isPending ? t('admin.common.saving') : t('admin.common.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
