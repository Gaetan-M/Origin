'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  CreateInvitationSchema,
  type CreateInvitationDto,
} from '@origin/shared-types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { PhoneInput } from '@/components/auth/phone-input';
import { Send } from 'lucide-react';
import { isValidE164Phone } from '@/lib/utils/phone';
import { toast } from 'sonner';

const RELATIONSHIP_PRESETS = [
  'Père',
  'Mère',
  'Frère',
  'Sœur',
  'Oncle',
  'Tante',
  'Cousin',
  'Cousine',
  'Grand-père',
  'Grand-mère',
  'Fils',
  'Fille',
  'Neveu',
  'Nièce',
  'Conjoint(e)',
  'Ami(e) proche',
];

interface Props {
  onSubmit: (data: CreateInvitationDto) => Promise<unknown> | void;
  isPending?: boolean;
}

export function CreateInvitationForm({ onSubmit, isPending }: Props) {
  const [phone, setPhone] = useState('');
  const [hint, setHint] = useState('');

  const {
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateInvitationDto>({
    resolver: zodResolver(CreateInvitationSchema),
  });

  function handlePhoneChange(value: string) {
    setPhone(value);
    setValue('targetPhoneNumber', value || undefined, { shouldValidate: true });
  }

  function handleHintChange(value: string) {
    setHint(value);
    setValue('relationshipHint', value || undefined);
  }

  async function submit(data: CreateInvitationDto) {
    if (!data.targetPhoneNumber || !isValidE164Phone(data.targetPhoneNumber)) {
      toast.error('Numero invalide. Verifie le format avec indicatif pays.');
      return;
    }
    await onSubmit(data);
    setPhone('');
    setHint('');
  }

  const canSubmit = isValidE164Phone(phone) && !isPending;

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4">
      <PhoneInput
        label="Numero de telephone"
        value={phone}
        onChange={handlePhoneChange}
        disabled={isPending}
        error={
          errors.targetPhoneNumber?.message ??
          (phone && !isValidE164Phone(phone) ? 'Numero incomplet' : undefined)
        }
      />

      <div>
        <Label htmlFor="hint">Lien de parente (optionnel)</Label>
        <Input
          id="hint"
          list="relationship-presets"
          value={hint}
          onChange={(e) => handleHintChange(e.target.value)}
          placeholder="Ex: tante, cousine, beau-frere..."
          maxLength={100}
          disabled={isPending}
        />
        <datalist id="relationship-presets">
          {RELATIONSHIP_PRESETS.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
        <p className="mt-1 text-xs text-charcoal/55">
          Apparaitra dans le SMS et aidera la personne a comprendre qui l'invite.
        </p>
      </div>

      <Button type="submit" disabled={!canSubmit} className="w-full">
        <Send className="mr-2 h-4 w-4" />
        {isPending ? 'Envoi en cours...' : "Envoyer l'invitation"}
      </Button>

      <p className="text-center text-xs text-charcoal/50">
        Un SMS sera envoye au numero indique avec un lien sur Origin.
      </p>
    </form>
  );
}
