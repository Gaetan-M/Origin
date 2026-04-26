'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { deleteMyAccount } from '@/lib/api/accounts';
import { useAuthStore } from '@/stores/auth-store';
import { PageHeader } from '@/components/shared/page-header';
import { PreferencesForm } from '@/components/profile/preferences-form';
import { PinForm } from '@/components/profile/pin-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { formatPhoneDisplay } from '@/lib/utils/phone';
import { Phone, Shield, Settings, Trash2 } from 'lucide-react';
import { useT } from '@/i18n';

export default function ProfilePage() {
  const router = useRouter();
  const { account, logout } = useAuthStore();
  const [showDelete, setShowDelete] = useState(false);
  const t = useT();

  const deleteAccount = useMutation({
    mutationFn: deleteMyAccount,
    onSuccess: () => {
      logout();
      router.push('/');
      toast.success('Compte supprime');
    },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title={t('profile.title')} />

      {/* Account info */}
      <Card>
        <CardContent className="flex items-center gap-4 p-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-forest/10">
            <Phone className="h-6 w-6 text-forest" />
          </div>
          <div>
            <p className="font-medium text-charcoal">
              {account?.phoneNumber ? formatPhoneDisplay(account.phoneNumber) : 'Telephone'}
            </p>
            <p className="text-xs text-charcoal/50">{t('auth.phoneLabel')}</p>
          </div>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Settings className="h-5 w-5" />
            {t('profile.preferences')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PreferencesForm />
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5" />
            {t('profile.security')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PinForm />
        </CardContent>
      </Card>

      <Separator />

      {/* Danger zone */}
      <div className="flex justify-center">
        <Button variant="ghost" className="text-error" onClick={() => setShowDelete(true)}>
          <Trash2 className="mr-2 h-4 w-4" />
          {t('profile.deleteAccount')}
        </Button>
      </div>

      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('profile.deleteAccount')}</DialogTitle>
            <DialogDescription>
              {t('profile.deleteConfirm')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">{t('common.cancel')}</Button>
            </DialogClose>
            <Button variant="destructive" onClick={() => deleteAccount.mutate()} disabled={deleteAccount.isPending}>
              {deleteAccount.isPending ? 'Suppression...' : t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
