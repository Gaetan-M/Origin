'use client';

import { useState } from 'react';
import type { Person } from '@origin/shared-types';
import { UnionType, UnionStatus } from '@origin/shared-types';
import { useCreateUnion } from '@/lib/hooks/use-relationships';
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

interface AddUnionDialogProps {
  personId: string;
  personName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const UNION_TYPES = [
  { value: UnionType.CUSTOMARY, label: 'Mariage coutumier' },
  { value: UnionType.CIVIL, label: 'Mariage civil' },
  { value: UnionType.RELIGIOUS, label: 'Mariage religieux' },
  { value: UnionType.FREE_UNION, label: 'Union libre' },
  { value: UnionType.UNKNOWN, label: 'Ne sait pas' },
];

export function AddUnionDialog({ personId, personName, open, onOpenChange }: AddUnionDialogProps) {
  const [partner, setPartner] = useState<Person | null>(null);
  const [unionType, setUnionType] = useState<UnionType>(UnionType.UNKNOWN);
  const createUnion = useCreateUnion();

  function handleSubmit() {
    if (!partner) return;
    createUnion.mutate(
      {
        unionType,
        status: UnionStatus.UNKNOWN,
        partners: [
          { personId },
          { personId: partner.id },
        ],
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setPartner(null);
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ajouter un(e) conjoint(e) de {personName}</DialogTitle>
          <DialogDescription>
            Cherche le/la conjoint(e) dans la base ou cree-le/la d&apos;abord.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {partner ? (
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-3">
                <PersonAvatar id={partner.id} displayName={partner.displayName} lifeStatus={partner.lifeStatus} size="sm" />
                <span className="text-sm font-medium">{partner.displayName}</span>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPartner(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <PersonSearchPicker onSelect={setPartner} excludeIds={[personId]} />
          )}

          <div>
            <Label>Type d&apos;union</Label>
            <Select value={unionType} onValueChange={(v) => setUnionType(v as UnionType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {UNION_TYPES.map((t) => (
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
          <Button onClick={handleSubmit} disabled={!partner || createUnion.isPending}>
            {createUnion.isPending ? 'Ajout...' : 'Ajouter'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
