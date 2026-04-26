'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { setPin, removePin } from '@/lib/api/accounts';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth-store';

export function PinForm() {
  const { account, setAccount } = useAuthStore();
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const hasPinSet = account?.pinEnabled ?? false;

  const setPinMutation = useMutation({
    mutationFn: () => setPin(newPin, hasPinSet ? currentPin : undefined),
    onSuccess: () => {
      if (account) setAccount({ ...account, pinEnabled: true });
      setCurrentPin('');
      setNewPin('');
      toast.success('PIN defini !');
    },
  });

  const removePinMutation = useMutation({
    mutationFn: () => removePin(currentPin),
    onSuccess: () => {
      if (account) setAccount({ ...account, pinEnabled: false });
      setCurrentPin('');
      setNewPin('');
      toast.success('PIN supprime');
    },
  });

  const canSubmit = newPin.length >= 4 && (!hasPinSet || currentPin.length >= 4);
  const canRemove = hasPinSet && currentPin.length >= 4;

  return (
    <div className="space-y-4">
      {hasPinSet && (
        <div>
          <Label htmlFor="currentPin">Code PIN actuel</Label>
          <Input
            id="currentPin"
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={currentPin}
            onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="4-6 chiffres"
          />
        </div>
      )}
      <div>
        <Label htmlFor="newPin">Nouveau code PIN</Label>
        <Input
          id="newPin"
          type="password"
          inputMode="numeric"
          maxLength={6}
          value={newPin}
          onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="4-6 chiffres"
        />
      </div>
      <div className="flex gap-2">
        <Button
          onClick={() => setPinMutation.mutate()}
          disabled={!canSubmit || setPinMutation.isPending}
        >
          {hasPinSet ? 'Modifier le PIN' : 'Definir un PIN'}
        </Button>
        {hasPinSet && (
          <Button
            variant="outline"
            onClick={() => removePinMutation.mutate()}
            disabled={!canRemove || removePinMutation.isPending}
          >
            Supprimer le PIN
          </Button>
        )}
      </div>
    </div>
  );
}
