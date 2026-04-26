'use client';

import { useState } from 'react';
import type { Person } from '@origin/shared-types';
import { PersonAvatar } from '@/components/shared/person-avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { RelationshipSection } from './relationship-section';
import { AddParentChildDialog } from './add-parent-child-dialog';
import { AddUnionDialog } from './add-union-dialog';
import { PhotoUpload } from './photo-upload';
import { getMediaFileUrl } from '@/lib/api/media';
import { getLifeStatusLabel, getLifeStatusColor } from '@/lib/utils/life-status';
import { getRelationshipLabel } from '@/lib/utils/relationship-labels';
import { formatDate } from '@/lib/utils/format-date';
import { useParents, useChildren, useSiblings, useSpouses } from '@/lib/hooks/use-relationships';
import { MapPin, Briefcase, Globe } from 'lucide-react';
import { useT } from '@/i18n';

interface PersonDetailProps {
  person: Person;
}

type RelDialog =
  | { type: 'parent'; gender: 'M' | 'F' }
  | { type: 'child'; gender: 'M' | 'F' }
  | { type: 'spouse' }
  | null;

export function PersonDetail({ person }: PersonDetailProps) {
  const [openDialog, setOpenDialog] = useState<RelDialog>(null);
  const t = useT();
  const { data: parents = [], isLoading: loadingParents } = useParents(person.id);
  const { data: children = [], isLoading: loadingChildren } = useChildren(person.id);
  const { data: siblings = [], isLoading: loadingSiblings } = useSiblings(person.id);
  const { data: spouses = [], isLoading: loadingSpouses } = useSpouses(person.id);

  const birthDisplay = formatDate(person.birthDate, person.birthDatePrecision, person.birthYearApproximate, person.birthDateText);
  const deathDisplay = formatDate(person.deceasedDate, person.deceasedDatePrecision, person.deceasedYearApproximate, person.deceasedDateText);

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="flex flex-col items-center gap-4 text-center">
        <PersonAvatar
          id={person.id}
          displayName={person.displayName}
          lifeStatus={person.lifeStatus}
          photoUrl={person.primaryPhotoId ? getMediaFileUrl(person.primaryPhotoId) : null}
          size="xl"
        />
        <div>
          <h1 className="text-2xl font-bold text-charcoal">{person.displayName}</h1>
          <Badge variant="secondary" className={getLifeStatusColor(person.lifeStatus)}>
            {getLifeStatusLabel(person.lifeStatus)}
          </Badge>
        </div>
        <PhotoUpload personId={person.id} />
      </div>

      {/* Info cards */}
      <Card>
        <CardContent className="grid gap-4 p-4 sm:grid-cols-2">
          {birthDisplay && (
            <InfoItem label={t('person.birthDate')} value={birthDisplay} sub={person.birthPlace} />
          )}
          {deathDisplay && (
            <InfoItem label={t('person.deceasedDate')} value={deathDisplay} sub={person.deceasedPlace} />
          )}
          {person.villageOrigin && (
            <InfoItem icon={<MapPin className="h-4 w-4" />} label={t('person.village')} value={person.villageOrigin} />
          )}
          {person.ethnicity && (
            <InfoItem icon={<Globe className="h-4 w-4" />} label={t('person.ethnicity')} value={person.ethnicity} />
          )}
          {person.occupation && (
            <InfoItem icon={<Briefcase className="h-4 w-4" />} label={t('person.occupation')} value={person.occupation} />
          )}
          {person.chefferie && (
            <InfoItem label={t('person.chefferie')} value={person.chefferie} />
          )}
        </CardContent>
      </Card>

      {/* Biography */}
      {person.biography && (
        <Card>
          <CardContent className="p-4">
            <h3 className="mb-2 text-sm font-semibold text-charcoal">{t('person.biography')}</h3>
            <p className="whitespace-pre-wrap text-sm text-charcoal/80">{person.biography}</p>
          </CardContent>
        </Card>
      )}

      {/* Relationships */}
      <div className="space-y-4">
        <Separator />
        <RelationshipSection
          title={t('person.parents')}
          persons={parents}
          isLoading={loadingParents}
          getLabel={(p) => getRelationshipLabel('PARENT', p.gender)}
          addChoices={[
            { label: 'Papa', onClick: () => setOpenDialog({ type: 'parent', gender: 'M' }) },
            { label: 'Mama', onClick: () => setOpenDialog({ type: 'parent', gender: 'F' }) },
          ]}
        />
        <RelationshipSection
          title={t('person.spouses')}
          persons={spouses}
          isLoading={loadingSpouses}
          getLabel={(p) => getRelationshipLabel('SPOUSE', p.gender)}
          addChoices={[
            { label: 'Conjoint(e)', onClick: () => setOpenDialog({ type: 'spouse' }) },
          ]}
        />
        <RelationshipSection
          title={t('person.children')}
          persons={children}
          isLoading={loadingChildren}
          getLabel={(p) => getRelationshipLabel('CHILD', p.gender)}
          addChoices={[
            { label: 'Fils', onClick: () => setOpenDialog({ type: 'child', gender: 'M' }) },
            { label: 'Fille', onClick: () => setOpenDialog({ type: 'child', gender: 'F' }) },
          ]}
        />
        <RelationshipSection
          title={t('person.siblings')}
          persons={siblings}
          isLoading={loadingSiblings}
          getLabel={(p) => getRelationshipLabel('SIBLING', p.gender)}
        />
      </div>

      <AddParentChildDialog
        personId={person.id}
        personName={person.displayName}
        direction="parent"
        presetGender={openDialog?.type === 'parent' ? openDialog.gender : undefined}
        open={openDialog?.type === 'parent'}
        onOpenChange={(v) => !v && setOpenDialog(null)}
      />
      <AddParentChildDialog
        personId={person.id}
        personName={person.displayName}
        direction="child"
        presetGender={openDialog?.type === 'child' ? openDialog.gender : undefined}
        open={openDialog?.type === 'child'}
        onOpenChange={(v) => !v && setOpenDialog(null)}
      />
      <AddUnionDialog
        personId={person.id}
        personName={person.displayName}
        open={openDialog?.type === 'spouse'}
        onOpenChange={(v) => !v && setOpenDialog(null)}
      />
    </div>
  );
}

function InfoItem({ icon, label, value, sub }: { icon?: React.ReactNode; label: string; value: string; sub?: string | null }) {
  return (
    <div className="flex items-start gap-2">
      {icon && <div className="mt-0.5 text-charcoal/40">{icon}</div>}
      <div>
        <p className="text-xs text-charcoal/50">{label}</p>
        <p className="text-sm font-medium text-charcoal">{value}</p>
        {sub && <p className="text-xs text-charcoal/50">{sub}</p>}
      </div>
    </div>
  );
}
