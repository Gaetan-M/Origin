'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, Edit, Trash2, RotateCcw } from 'lucide-react';
import { AccountRole, isRoleAtLeast } from '@origin/shared-types';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { PersonDetailTabs } from '@/components/persons-admin/person-detail-tabs';
import { PersonEditDialog } from '@/components/persons-admin/person-edit-dialog';
import { PersonDeleteDialog } from '@/components/persons-admin/person-delete-dialog';
import { usePerson, useRestorePerson } from '@/lib/hooks/use-admin-persons';
import { useAuthStore } from '@/stores/auth-store';
import { useT } from '@/i18n';

export default function PersonDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useT();
  const { account } = useAuthStore();
  const { data, isLoading } = usePerson(id);
  const restore = useRestorePerson(id);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const isAdmin = isRoleAtLeast((account?.role as AccountRole) ?? AccountRole.USER, AccountRole.ADMIN);

  if (isLoading) {
    return (
      <>
        <PageHeader title={t('admin.persons.title')} />
        <Skeleton className="h-64 w-full" />
      </>
    );
  }
  if (!data) {
    return (
      <>
        <PageHeader title={t('admin.persons.title')} />
        <EmptyState title={t('admin.common.empty')} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={data.person.displayName}
        subtitle={t('admin.persons.title')}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/persons">
                <ChevronLeft className="h-4 w-4" />
                {t('admin.actions.back')}
              </Link>
            </Button>
            <Button size="sm" onClick={() => setEditOpen(true)}>
              <Edit className="h-4 w-4" />
              {t('admin.actions.edit')}
            </Button>
            {isAdmin && (
              data.person.deletedAt ? (
                <Button size="sm" variant="outline" onClick={() => restore.mutate()} disabled={restore.isPending}>
                  <RotateCcw className="h-4 w-4" />
                  {t('admin.actions.restore')}
                </Button>
              ) : (
                <Button size="sm" variant="destructive" onClick={() => setDeleteOpen(true)}>
                  <Trash2 className="h-4 w-4" />
                  {t('admin.actions.delete')}
                </Button>
              )
            )}
          </div>
        }
      />

      <PersonDetailTabs detail={data} />

      <PersonEditDialog detail={data} open={editOpen} onOpenChange={setEditOpen} />
      <PersonDeleteDialog person={data.person} open={deleteOpen} onOpenChange={setDeleteOpen} />
    </>
  );
}
