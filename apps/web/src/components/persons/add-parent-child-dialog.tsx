'use client';

import { useState } from 'react';
import type { Person } from '@origin/shared-types';
import { ParentRelationshipType } from '@origin/shared-types';
import { useCreateParentChild } from '@/lib/hooks/use-relationships';
import { PersonSearchPicker } from './person-search-picker';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { PersonAvatar } from '@/components/shared/person-avatar';
import { X } from 'lucide-react';

interface AddParentChildDialogProps {
  personId: string;
  personName: string;
  direction: 'parent' | 'child';
  presetGender?: 'M' | 'F';
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const RELATIONSHIP_TYPES = [
  { value: ParentRelationshipType.BIOLOGICAL, label: 'Biologique' },
  { value: ParentRelationshipType.CUSTOMARY_ADOPTIVE, label: 'Adoption coutumiere' },
  { value: ParentRelationshipType.LEGAL_ADOPTIVE, label: 'Adoption legale' },
  { value: ParentRelationshipType.PRESUMED, label: 'Presume' },
  { value: ParentRelationshipType.STEP, label: 'Beau-parent / Bel-enfant' },
];

function getDialogTitle(direction: 'parent' | 'child', gender?: 'M' | 'F'): string {
  if (direction === 'parent') {
    if (gender === 'M') return 'Ajouter le papa';
    if (gender === 'F') return 'Ajouter la mama';
    return 'Ajouter un parent';
  }
  if (gender === 'M') return 'Ajouter un fils';
  if (gender === 'F') return 'Ajouter une fille';
  return 'Ajouter un enfant';
}

export function AddParentChildDialog({ personId, personName, direction, presetGender, open, onOpenChange }: AddParentChildDialogProps) {
  const [selected, setSelected] = useState<Person | null>(null);
  const [relType, setRelType] = useState<ParentRelationshipType>(ParentRelationshipType.BIOLOGICAL);
  const createParentChild = useCreateParentChild();

  function handleSubmit() {
    if (!selected) return;
    const dto = direction === 'parent'
      ? { parentId: selected.id, childId: personId, relationshipType: relType }
      : { parentId: personId, childId: selected.id, relationshipType: relType };

    createParentChild.mutate(dto, {
      onSuccess: () => {
        onOpenChange(false);
        setSelected(null);
      },
    });
  }

  const title = `${getDialogTitle(direction, presetGender)} de ${personName}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Cherche la personne dans la base ou cree-la d&apos;abord.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {selected ? (
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-3">
                <PersonAvatar id={selected.id} displayName={selected.displayName} lifeStatus={selected.lifeStatus} size="sm" />
                <span className="text-sm font-medium">{selected.displayName}</span>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelected(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <PersonSearchPicker
              onSelect={setSelected}
              excludeIds={[personId]}
              filterGender={presetGender}
            />
          )}

          <div>
            <Label>Type de lien</Label>
            <Select value={relType} onValueChange={(v) => setRelType(v as ParentRelationshipType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RELATIONSHIP_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Annuler</Button>
          </DialogClose>
          <Button onClick={handleSubmit} disabled={!selected || createParentChild.isPending}>
            {createParentChild.isPending ? 'Ajout...' : 'Ajouter'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
