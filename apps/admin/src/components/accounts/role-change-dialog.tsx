'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertTriangle } from 'lucide-react';
import { AccountRole, isRoleAtLeast, type AdminAccount } from '@origin/shared-types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useChangeRole } from '@/lib/hooks/use-admin-accounts';
import { useT } from '@/i18n';

const schema = z.object({
  role: z.nativeEnum(AccountRole),
  reason: z.string().min(10, '10').max(1000),
});
type FormValues = z.infer<typeof schema>;

interface Props {
  account: AdminAccount;
  currentUserId: string;
  currentUserRole: AccountRole;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Selectable target roles depend on the actor's own role:
 *  - ADMIN can grant up to MODERATOR.
 *  - SUPER_ADMIN can grant any role.
 * Self-demotion is blocked client-side; the API enforces the same rule.
 */
function selectableRoles(actor: AccountRole, target: AdminAccount, isSelf: boolean): AccountRole[] {
  const all = [AccountRole.USER, AccountRole.MODERATOR, AccountRole.ADMIN, AccountRole.SUPER_ADMIN];
  return all.filter((r) => {
    if (isSelf && r === target.role) return true;
    if (isSelf) return false; // cannot change own role
    if (r === AccountRole.SUPER_ADMIN || r === AccountRole.ADMIN) {
      return isRoleAtLeast(actor, AccountRole.SUPER_ADMIN);
    }
    return isRoleAtLeast(actor, AccountRole.ADMIN);
  });
}

export function RoleChangeDialog({ account, currentUserId, currentUserRole, open, onOpenChange }: Props) {
  const t = useT();
  const isSelf = account.id === currentUserId;
  const change = useChangeRole(account.id);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { role: account.role, reason: '' },
  });

  useEffect(() => {
    if (open) form.reset({ role: account.role, reason: '' });
  }, [open, account, form]);

  const role = form.watch('role');
  const isCritical = role === AccountRole.ADMIN || role === AccountRole.SUPER_ADMIN;
  const allowed = selectableRoles(currentUserRole, account, isSelf);

  const onSubmit = form.handleSubmit((values) => {
    change.mutate(
      { role: values.role, reason: values.reason },
      { onSuccess: () => onOpenChange(false) },
    );
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('admin.accounts.role.title')}</DialogTitle>
          <DialogDescription>{t('admin.accounts.role.warning')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          {isSelf && (
            <Alert variant="warning">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>{t('admin.accounts.role.selfWarn')}</AlertTitle>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="role">{t('admin.accounts.role.newRole')}</Label>
            <Select
              value={role}
              onValueChange={(v) => form.setValue('role', v as AccountRole, { shouldValidate: true })}
              disabled={isSelf}
            >
              <SelectTrigger id="role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {allowed.map((r) => (
                  <SelectItem key={r} value={r}>
                    {t(`admin.roles.${r}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isCritical && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>{t('admin.common.criticalAction')}</AlertTitle>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="reason">{t('admin.common.reason')}</Label>
            <Textarea
              id="reason"
              rows={4}
              placeholder={t('admin.common.reasonPlaceholder')}
              {...form.register('reason')}
            />
            {form.formState.errors.reason && (
              <p className="text-xs text-error">{t('admin.common.reasonPlaceholder')}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={change.isPending}>
              {t('admin.common.cancel')}
            </Button>
            <Button type="submit" disabled={change.isPending || isSelf}>
              {change.isPending ? t('admin.common.saving') : t('admin.common.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
