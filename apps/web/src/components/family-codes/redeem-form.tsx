'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LogIn } from 'lucide-react';
import { useRedeemFamilyCode } from '@/lib/hooks/use-family-codes';

const CODE_REGEX = /^[A-Za-z]{4,8}-[0-9]{3,5}$/;

export function RedeemForm() {
  const [code, setCode] = useState('');
  const redeem = useRedeemFamilyCode();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    redeem.mutate(code.toUpperCase().trim(), {
      onSuccess: () => setCode(''),
    });
  }

  const isValid = CODE_REGEX.test(code.trim());

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="code">Code famille</Label>
        <Input
          id="code"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="MBALLA-2847"
          maxLength={20}
          disabled={redeem.isPending}
          className="font-mono text-lg tracking-wider"
        />
        <p className="mt-1 text-xs text-charcoal/55">
          Format : 4 a 8 lettres, tiret, 3 a 5 chiffres.
        </p>
      </div>

      <Button type="submit" disabled={!isValid || redeem.isPending} className="w-full">
        <LogIn className="mr-2 h-4 w-4" />
        {redeem.isPending ? 'Verification...' : 'Rejoindre'}
      </Button>
    </form>
  );
}
