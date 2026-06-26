'use client';

import { useState } from 'react';
import { Phone, KeyRound, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useInitiateKinshipCheck } from '@/lib/hooks/use-kinship-check';
import { useKinshipT } from './kinship-i18n';

type Method = 'phone' | 'code';

// E.164: leading + then 8–15 digits, first digit non-zero.
const E164 = /^\+[1-9]\d{7,14}$/;

/**
 * Lets a user open a kinship check by phone number or family code. Only the
 * minimum is collected; the other party must explicitly consent before any
 * computation runs.
 */
export function InitiateCheckForm() {
  const t = useKinshipT();
  const initiate = useInitiateKinshipCheck();

  const [method, setMethod] = useState<Method>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (method === 'phone') {
      const value = phone.replace(/\s+/g, '');
      if (!E164.test(value)) {
        toast.error(t('invalidPhone'));
        return;
      }
      initiate.mutate(
        { targetPhone: value },
        {
          onSuccess: () => {
            toast.success(t('initiateSuccess'));
            setPhone('');
          },
        },
      );
      return;
    }

    const value = code.trim();
    if (value.length < 3) {
      toast.error(t('invalidCode'));
      return;
    }
    initiate.mutate(
      { familyCode: value },
      {
        onSuccess: () => {
          toast.success(t('initiateSuccess'));
          setCode('');
        },
      },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Method switch */}
      <div className="inline-flex w-full gap-1 rounded-xl bg-sand p-1">
        <MethodButton
          active={method === 'phone'}
          onClick={() => setMethod('phone')}
          icon={<Phone className="h-4 w-4" />}
          label={t('methodPhone')}
        />
        <MethodButton
          active={method === 'code'}
          onClick={() => setMethod('code')}
          icon={<KeyRound className="h-4 w-4" />}
          label={t('methodCode')}
        />
      </div>

      {method === 'phone' ? (
        <div className="space-y-1.5">
          <Label htmlFor="kinship-phone">{t('phoneLabel')}</Label>
          <Input
            id="kinship-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder={t('phonePlaceholder')}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
      ) : (
        <div className="space-y-1.5">
          <Label htmlFor="kinship-code">{t('codeLabel')}</Label>
          <Input
            id="kinship-code"
            type="text"
            autoCapitalize="characters"
            placeholder={t('codePlaceholder')}
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </div>
      )}

      <p className="text-xs leading-relaxed text-charcoal/55">{t('consentNote')}</p>

      <Button type="submit" className="w-full" disabled={initiate.isPending}>
        <Send className="h-4 w-4" />
        {initiate.isPending ? t('submitting') : t('submit')}
      </Button>
    </form>
  );
}

function MethodButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors',
        active ? 'bg-white text-charcoal shadow-card' : 'text-charcoal/60 hover:text-charcoal',
      )}
    >
      {icon}
      {label}
    </button>
  );
}
