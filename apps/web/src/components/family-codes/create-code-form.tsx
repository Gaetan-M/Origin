'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';
import { useCreateFamilyCode } from '@/lib/hooks/use-family-codes';

export function CreateCodeForm() {
  const [label, setLabel] = useState('');
  const [maxUses, setMaxUses] = useState('50');
  const [expiryDays, setExpiryDays] = useState('90');

  const create = useCreateFamilyCode();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    create.mutate(
      {
        label: label.trim() || undefined,
        maxUses: Number(maxUses) || 50,
        expiryDays: Number(expiryDays) || 90,
      },
      {
        onSuccess: () => setLabel(''),
      },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="label">Etiquette (optionnel)</Label>
        <Input
          id="label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Famille Mballa"
          maxLength={100}
          disabled={create.isPending}
        />
        <p className="mt-1 text-xs text-charcoal/55">
          Pour t'aider a reconnaitre ce code parmi tes codes.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="maxUses">Utilisations max</Label>
          <Input
            id="maxUses"
            type="number"
            min={1}
            max={500}
            value={maxUses}
            onChange={(e) => setMaxUses(e.target.value)}
            disabled={create.isPending}
          />
        </div>
        <div>
          <Label htmlFor="expiryDays">Validite (jours)</Label>
          <Input
            id="expiryDays"
            type="number"
            min={1}
            max={365}
            value={expiryDays}
            onChange={(e) => setExpiryDays(e.target.value)}
            disabled={create.isPending}
          />
        </div>
      </div>

      <Button type="submit" disabled={create.isPending} className="w-full">
        <Plus className="mr-2 h-4 w-4" />
        {create.isPending ? 'Generation...' : 'Generer un code famille'}
      </Button>
    </form>
  );
}
