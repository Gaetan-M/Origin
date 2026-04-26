'use client';

import { useCallback, useEffect, useState } from 'react';
import { useFamilyTree } from '@/lib/hooks/use-persons';
import { useMyClaims } from '@/lib/hooks/use-claims';
import { FamilyTreeView } from '@/components/tree/family-tree';
import { PageHeader } from '@/components/shared/page-header';
import { FullPageSpinner } from '@/components/shared/loading-spinner';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { TreePine, Home } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useT } from '@/i18n';

export default function TreePage() {
  const router = useRouter();
  const t = useT();
  const [degrees, setDegrees] = useState(2);

  // The user's own claim is the default "root" of the view. The visible
  // center can be temporarily re-pointed by jumping onto a spouse — that
  // state lives in `navigatedPersonId` and is always restorable via the
  // "back to my tree" button.
  const { data: claims, isLoading: loadingClaims } = useMyClaims();
  const ownPersonId = claims?.[0]?.personId;
  const [navigatedPersonId, setNavigatedPersonId] = useState<string | undefined>(
    undefined,
  );

  // First time the claim resolves, adopt it as the navigated center.
  useEffect(() => {
    if (ownPersonId && !navigatedPersonId) {
      setNavigatedPersonId(ownPersonId);
    }
  }, [ownPersonId, navigatedPersonId]);

  const centerPersonId = navigatedPersonId ?? ownPersonId;
  const isExploringOther = !!(
    ownPersonId && navigatedPersonId && navigatedPersonId !== ownPersonId
  );

  const { data: treeData, isLoading: loadingTree } = useFamilyTree(
    centerPersonId,
    degrees,
  );

  const handleJumpToPerson = useCallback((personId: string) => {
    setNavigatedPersonId(personId);
  }, []);
  const handleBackToOwnTree = useCallback(() => {
    if (ownPersonId) setNavigatedPersonId(ownPersonId);
  }, [ownPersonId]);

  if (loadingClaims || loadingTree) return <FullPageSpinner />;

  if (!centerPersonId || !treeData) {
    return (
      <div className="mx-auto max-w-4xl">
        <PageHeader title={t('tree.title')} />
        <EmptyState
          icon={TreePine}
          title={t('tree.noTree')}
          actionLabel={t('dashboard.addPerson')}
          onAction={() => router.push('/persons/new')}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title={t('tree.title')} />

      {isExploringOther && (
        <div className="mb-3 flex items-center justify-between rounded-lg border border-sand bg-sand/40 px-3 py-2 text-sm">
          <span className="text-charcoal/70">
            Tu explores l&apos;arbre de{' '}
            <span className="font-medium text-charcoal">
              {treeData.center.displayName}
            </span>
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={handleBackToOwnTree}
            className="gap-2"
          >
            <Home className="h-3.5 w-3.5" />
            Mon arbre
          </Button>
        </div>
      )}

      <FamilyTreeView
        data={treeData}
        degrees={degrees}
        onDegreesChange={setDegrees}
        onJumpToPerson={handleJumpToPerson}
      />
    </div>
  );
}
