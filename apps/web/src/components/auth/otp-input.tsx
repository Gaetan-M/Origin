'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';

interface OtpInputProps {
  onComplete: (code: string) => void;
  onResend: (channel: 'SMS' | 'WHATSAPP') => void;
  disabled?: boolean;
  phone: string;
}

export function OtpInput({ onComplete, onResend, disabled, phone }: OtpInputProps) {
  const [digits, setDigits] = useState<string[]>(Array(6).fill(''));
  const [countdown, setCountdown] = useState(60);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleChange = useCallback(
    (index: number, value: string) => {
      const digit = value.replace(/\D/g, '').slice(-1);
      const next = [...digits];
      next[index] = digit;
      setDigits(next);

      if (digit && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }

      if (next.every((d) => d !== '')) {
        onComplete(next.join(''));
      }
    },
    [digits, onComplete],
  );

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      const next = pasted.split('');
      setDigits(next);
      onComplete(pasted);
    }
  }

  function handleResend(channel: 'SMS' | 'WHATSAPP') {
    setCountdown(60);
    onResend(channel);
  }

  return (
    <div className="space-y-6">
      <p className="text-center text-sm text-charcoal/70">
        On a envoye un code au <span className="font-medium text-charcoal">{phone}</span>
      </p>

      <div className="flex justify-center gap-2" onPaste={handlePaste}>
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => { inputRefs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={d}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            disabled={disabled}
            className="h-12 w-10 rounded-lg border border-[var(--input)] bg-[var(--background)] text-center text-lg font-semibold focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/30"
          />
        ))}
      </div>

      <div className="flex flex-col items-center gap-2 text-sm">
        {countdown > 0 ? (
          <span className="text-charcoal/50">Renvoyer dans {countdown}s</span>
        ) : (
          <div className="flex gap-3">
            <Button variant="ghost" size="sm" onClick={() => handleResend('SMS')}>
              Renvoyer par SMS
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handleResend('WHATSAPP')}>
              Renvoyer par WhatsApp
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
