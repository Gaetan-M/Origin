'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MoreHorizontal } from 'lucide-react';
import { AccountRole, type AdminAccount, isRoleAtLeast } from '@origin/shared-types';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useT } from '@/i18n';
import { useUnbanAccount, useRestoreAccount } from '@/lib/hooks/use-admin-accounts';
import { EditAccountDialog } from './edit-account-dialog';
import { RoleChangeDialog } from './role-change-dialog';
import { BanDialog } from './ban-dialog';
import { DeleteAccountDialog } from './delete-account-dialog';

interface AccountActionsMenuProps {
  account: AdminAccount;
  currentUserRole: AccountRole;
  currentUserId: string;
  triggerSize?: 'sm' | 'icon';
}

export function AccountActionsMenu({
  account,
  currentUserRole,
  currentUserId,
  triggerSize = 'icon',
}: AccountActionsMenuProps) {
  const t = useT();
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);
  const [banOpen, setBanOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const isAdmin = isRoleAtLeast(currentUserRole, AccountRole.ADMIN);
  const isSelf = account.id === currentUserId;
  const unban = useUnbanAccount(account.id);
  const restore = useRestoreAccount(account.id);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size={triggerSize === 'icon' ? 'icon' : 'sm'}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => router.push(`/accounts/${account.id}`)}>
            {t('admin.accounts.actions.viewDetails')}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            {t('admin.accounts.actions.edit')}
          </DropdownMenuItem>
          {isAdmin && (
            <DropdownMenuItem onSelect={() => setRoleOpen(true)}>
              {t('admin.accounts.actions.changeRole')}
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          {account.isBanned ? (
            <DropdownMenuItem
              onSelect={() => unban.mutate()}
              disabled={unban.isPending || isSelf}
            >
              {t('admin.accounts.actions.unban')}
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              onSelect={() => setBanOpen(true)}
              disabled={isSelf}
              className="text-red-600 focus:text-red-600"
            >
              {t('admin.accounts.actions.ban')}
            </DropdownMenuItem>
          )}
          {isAdmin && (
            <>
              <DropdownMenuSeparator />
              {account.deletedAt ? (
                <DropdownMenuItem
                  onSelect={() => restore.mutate()}
                  disabled={restore.isPending}
                >
                  {t('admin.accounts.actions.restore')}
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onSelect={() => setDeleteOpen(true)}
                  disabled={isSelf}
                  className="text-red-600 focus:text-red-600"
                >
                  {t('admin.accounts.actions.delete')}
                </DropdownMenuItem>
              )}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <EditAccountDialog
        account={account}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <RoleChangeDialog
        account={account}
        currentUserId={currentUserId}
        currentUserRole={currentUserRole}
        open={roleOpen}
        onOpenChange={setRoleOpen}
      />
      <BanDialog account={account} open={banOpen} onOpenChange={setBanOpen} />
      <DeleteAccountDialog
        account={account}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </>
  );
}
