'use client';

import { useEffect, useState, Suspense } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PhoneInput } from '@/components/auth/phone-input';
import { OtpInput } from '@/components/auth/otp-input';
import { useRequestOtp, useVerifyOtp } from '@/lib/hooks/use-auth';
import {
  useVerifyInvitation,
  useConsumeInvitation,
} from '@/lib/hooks/use-invitations';
import { isValidCameroonPhone, formatPhoneDisplay } from '@/lib/utils/phone';
import { OtpChannel } from '@origin/shared-types';
import { FullPageSpinner } from '@/components/shared/loading-spinner';
import {
  KenteBorder,
  AdinkraMotif,
  FloatingLeaves,
} from '@/components/branding/origin-decor';

type Step = 'phone' | 'otp';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get('invite') ?? undefined;

  // When the user lands here via /auth/login?invite=TOKEN we pre-load the
  // invitation context so we can (1) prefill the phone field and (2) consume
  // the invitation right after a successful OTP verify.
  const invitation = useVerifyInvitation(inviteToken);
  const consumeInvitation = useConsumeInvitation();

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('+237');

  // Prefill the phone field when the invitation we landed on already targets
  // a specific phone number — saves the user from typing it twice. Guarded
  // against re-runs by checking the field was still on its default '+237'.
  useEffect(() => {
    const targetPhone = invitation.data?.targetPhoneNumber;
    if (targetPhone && phone === '+237') {
      setPhone(targetPhone);
    }
  }, [invitation.data, phone]);

  const requestOtp = useRequestOtp();
  const verifyOtp = useVerifyOtp();

  async function handleSendOtp() {
    if (!isValidCameroonPhone(phone)) {
      toast.error('Numero invalide. Verifie le format.');
      return;
    }
    try {
      await requestOtp.mutateAsync({ phoneNumber: phone, channel: OtpChannel.SMS });
      setStep('otp');
    } catch {
      toast.error("Impossible d'envoyer le code. Reessaie.");
    }
  }

  async function handleVerifyOtp(code: string) {
    try {
      await verifyOtp.mutateAsync({ phoneNumber: phone, code });
      toast.success('Te voila connecte !');

      // Right after auth: if an invite token came in via the URL, consume it
      // so the new user is immediately wired up to the inviter's tree.
      if (inviteToken) {
        try {
          await consumeInvitation.mutateAsync(inviteToken);
          toast.success('Invitation acceptee !');
        } catch {
          // Don't break the login flow — toast already surfaces the cause.
        }
        const targetPersonId = invitation.data?.targetPerson?.id;
        router.replace(targetPersonId ? `/persons/${targetPersonId}` : '/dashboard');
      }
    } catch {
      toast.error('Code incorrect. Reessaie.');
    }
  }

  async function handleResend(channel: 'SMS' | 'WHATSAPP') {
    try {
      await requestOtp.mutateAsync({
        phoneNumber: phone,
        channel: channel === 'WHATSAPP' ? OtpChannel.WHATSAPP : OtpChannel.SMS,
      });
      toast.success('Code renvoye !');
    } catch {
      toast.error('Impossible de renvoyer le code.');
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-sand">
      <KenteBorder />

      {/* Decorative layers */}
      <AdinkraMotif
        className="absolute -left-16 top-24 hidden h-80 w-80 text-forest opacity-[0.05] sm:block"
        color="currentColor"
      />
      <AdinkraMotif
        className="absolute -right-20 bottom-16 hidden h-96 w-96 rotate-12 text-terracotta opacity-[0.06] sm:block"
        color="currentColor"
      />
      <FloatingLeaves />

      <div className="relative flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="mb-8 flex flex-col items-center gap-3 text-center anim-fade-up">
            <div className="relative">
              <div
                className="absolute inset-0 -z-10 rounded-full bg-gradient-to-br from-ochre/30 via-terracotta/15 to-forest/15 blur-2xl anim-pulse-soft"
                aria-hidden
              />
              <Image
                src="/origin-logo.png"
                alt="Origin"
                width={90}
                height={140}
                priority
                className="anim-grow w-20"
              />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-charcoal">Origin</h1>
            <p className="max-w-xs text-sm text-charcoal/60">
              Enracine ta famille. Documente ton arbre.
            </p>
          </div>

          <Card className="border-0 shadow-elevated anim-fade-up anim-delay-200">
            <CardHeader className="text-center">
              <CardTitle className="text-xl">
                {step === 'phone' ? 'Bienvenue' : 'Entre ton code'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {step === 'phone' ? (
                <div className="space-y-6">
                  <PhoneInput
                    value={phone}
                    onChange={setPhone}
                    disabled={requestOtp.isPending}
                  />
                  <Button
                    className="w-full"
                    onClick={handleSendOtp}
                    disabled={!isValidCameroonPhone(phone) || requestOtp.isPending}
                  >
                    {requestOtp.isPending ? 'Envoi...' : 'Recevoir mon code'}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <OtpInput
                    phone={formatPhoneDisplay(phone)}
                    onComplete={handleVerifyOtp}
                    onResend={handleResend}
                    disabled={verifyOtp.isPending}
                  />
                  <Button variant="ghost" className="w-full" onClick={() => setStep('phone')}>
                    Changer de numero
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <KenteBorder />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <LoginContent />
    </Suspense>
  );
}
