'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreateInvitationSchema, type CreateInvitationDto } from '@origin/shared-types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { PhoneInput } from '@/components/auth/phone-input';
import { Send } from 'lucide-react';
import { useState } from 'react';
import { useT } from '@/i18n';

interface CreateInvitationFormProps {
  onSubmit: (data: CreateInvitationDto) => void;
  isPending?: boolean;
}

export function CreateInvitationForm({ onSubmit, isPending }: CreateInvitationFormProps) {
  const [phone, setPhone] = useState('+237');
  const t = useT();
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<CreateInvitationDto>({
    resolver: zodResolver(CreateInvitationSchema),
  });

  function handlePhoneChange(value: string) {
    setPhone(value);
    setValue('targetPhoneNumber', value);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <PhoneInput value={phone} onChange={handlePhoneChange} disabled={isPending} />
        {errors.targetPhoneNumber && <p className="mt-1 text-sm text-error">{errors.targetPhoneNumber.message}</p>}
      </div>
      <div>
        <Label htmlFor="hint">{t('invitations.hint')}</Label>
        <Input id="hint" {...register('relationshipHint')} placeholder={t('invitations.hintPlaceholder')} />
      </div>
      <Button type="submit" disabled={isPending} className="w-full">
        <Send className="mr-2 h-4 w-4" />
        {isPending ? t('common.loading') : t('invitations.create')}
      </Button>
    </form>
  );
}
