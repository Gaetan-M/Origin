'use client';

import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { OriginMark } from '@/components/branding/origin-mark';
import { useRequestOtp, useVerifyOtp } from '@/lib/hooks/use-auth';
import { useT } from '@/i18n';

const PHONE_PATTERN = /^\+[1-9]\d{6,14}$/;
const OTP_PATTERN = /^[0-9]{6}$/;

export default function LoginPage() {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const requestOtp = useRequestOtp();
  const verifyOtp = useVerifyOtp();
  const t = useT();

  const onRequestOtp = (e: React.FormEvent): void => {
    e.preventDefault();
    const trimmed = phone.replace(/\s+/g, '');
    if (!PHONE_PATTERN.test(trimmed)) {
      toast.error(t('admin.auth.invalidPhone'));
      return;
    }
    requestOtp.mutate(
      { phoneNumber: trimmed },
      {
        onSuccess: () => {
          toast.success(t('admin.auth.otpSent'));
          setStep('otp');
        },
        onError: (err: Error) => toast.error(err.message),
      },
    );
  };

  const onVerifyOtp = (e: React.FormEvent): void => {
    e.preventDefault();
    if (!OTP_PATTERN.test(code)) {
      toast.error(t('admin.auth.invalidOtp'));
      return;
    }
    verifyOtp.mutate(
      { phoneNumber: phone.replace(/\s+/g, ''), code },
      {
        onError: (err: Error) => toast.error(err.message),
      },
    );
  };

  const isPending = requestOtp.isPending || verifyOtp.isPending;

  return (
    <div className="flex min-h-screen items-center justify-center bg-off-white p-4">
      <Card className="w-full max-w-md shadow-elevated">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto">
            <OriginMark size={48} />
          </div>
          <CardTitle className="text-xl">{t('admin.auth.loginTitle')}</CardTitle>
          <CardDescription className="text-sm">{t('admin.auth.loginSubtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          {step === 'phone' ? (
            <form onSubmit={onRequestOtp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">{t('admin.auth.phoneLabel')}</Label>
                <Input
                  id="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder={t('admin.auth.phonePlaceholder')}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={isPending}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isPending}>
                <ShieldCheck className="h-4 w-4" />
                {requestOtp.isPending ? t('admin.auth.loggingIn') : t('admin.auth.sendOtp')}
              </Button>
            </form>
          ) : (
            <form onSubmit={onVerifyOtp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp">{t('admin.auth.otpLabel')}</Label>
                <Input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  placeholder={t('admin.auth.otpPlaceholder')}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  disabled={isPending}
                  required
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full" disabled={isPending}>
                {verifyOtp.isPending ? t('admin.auth.loggingIn') : t('admin.auth.verifyOtp')}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setStep('phone')}
                disabled={isPending}
              >
                {t('admin.actions.back')}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
