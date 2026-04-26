'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePerson, useDeletePerson } from '@/lib/hooks/use-persons';
import { PersonDetail } from '@/components/persons/person-detail';
import { ClaimDialog } from '@/components/persons/claim-dialog';
import { PageHeader } from '@/components/shared/page-header';
import { FullPageSpinner } from '@/components/shared/loading-spinner';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Trash2, UserX, UserCheck } from 'lucide-react';
import { useT } from '@/i18n';

export default function PersonDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: person, isLoading, error } = usePerson(id);
  const deletePerson = useDeletePerson();
  const [showDelete, setShowDelete] = useState(false);
  const [showClaim, setShowClaim] = useState(false);
  const t = useT();

  if (isLoading) return <FullPageSpinner />;
  if (error || !person) {
    return <EmptyState icon={UserX} title="Personne introuvable" actionLabel={t('common.back')} onAction={() => router.back()} />;
  }

  async function handleDelete() {
    await deletePerson.mutateAsync(id);
    router.push('/dashboard');
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title=""
        showBack
        action={{ label: t('common.edit'), onClick: () => router.push(`/persons/${id}/edit`) }}
      />

      <PersonDetail person={person} />

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {!person.claimedByAccountId ? (
          <Button variant="outline" onClick={() => setShowClaim(true)}>
            <UserCheck className="mr-2 h-4 w-4" />
            C&apos;est moi
          </Button>
        ) : (
          <div className="flex items-center gap-2 rounded-lg bg-forest/10 px-3 py-1.5 text-sm text-forest">
            <UserCheck className="h-4 w-4" />
            Profil revendique
          </div>
        )}
        <Button variant="ghost" className="text-error" onClick={() => setShowDelete(true)}>
          <Trash2 className="mr-2 h-4 w-4" />
          {t('common.delete')}
        </Button>
      </div>

      <ClaimDialog
        personId={id}
        personName={person.displayName}
        open={showClaim}
        onOpenChange={setShowClaim}
      />

      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('person.deleteConfirm')}</DialogTitle>
            <DialogDescription>
              {t('person.deleteConfirm')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">{t('common.cancel')}</Button>
            </DialogClose>
            <Button variant="destructive" onClick={handleDelete} disabled={deletePerson.isPending}>
              {deletePerson.isPending ? 'Suppression...' : t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
