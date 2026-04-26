'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PhoneInput } from '@/components/auth/phone-input';
import { Search } from 'lucide-react';
import { useSubmitKinshipProbe } from '@/lib/hooks/use-kinship-probe';
import { isValidCameroonPhone } from '@/lib/utils/phone';
import { toast } from 'sonner';

export function KinshipProbeForm() {
  const [phone, setPhone] = useState('+237');
  const [relationship, setRelationship] = useState('');
  const [message, setMessage] = useState('');

  const submit = useSubmitKinshipProbe();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidCameroonPhone(phone)) {
      toast.error('Numero invalide. Verifie le format.');
      return;
    }
    submit.mutate(
      {
        targetPhoneNumber: phone,
        claimedRelationship: relationship.trim() || undefined,
        message: message.trim() || undefined,
      },
      {
        onSuccess: () => {
          setPhone('+237');
          setRelationship('');
          setMessage('');
        },
      },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PhoneInput value={phone} onChange={setPhone} disabled={submit.isPending} />

      <div>
        <Label htmlFor="relationship">Lien de parente (optionnel)</Label>
        <Input
          id="relationship"
          value={relationship}
          onChange={(e) => setRelationship(e.target.value)}
          placeholder="oncle, tante, cousin, frere..."
          maxLength={100}
          disabled={submit.isPending}
        />
        <p className="mt-1 text-xs text-charcoal/55">
          Cela aidera la personne a te reconnaitre.
        </p>
      </div>

      <div>
        <Label htmlFor="message">Message court (optionnel)</Label>
        <textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Salut tonton, je suis le fils de Marie..."
          maxLength={280}
          rows={3}
          disabled={submit.isPending}
          className="w-full rounded-md border border-[var(--input)] bg-white p-2 text-sm"
        />
        <p className="mt-1 text-xs text-charcoal/55">{message.length}/280</p>
      </div>

      <Button type="submit" disabled={submit.isPending} className="w-full">
        <Search className="mr-2 h-4 w-4" />
        {submit.isPending ? 'Envoi...' : 'Envoyer la demande'}
      </Button>
    </form>
  );
}
