'use client';

import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { updateMyAccount } from '@/lib/api/accounts';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuthStore } from '@/stores/auth-store';
import { useUiStore } from '@/stores/ui-store';

interface FormValues {
  languagePreference: string;
  dataSaverMode: boolean;
  largeTextMode: boolean;
  email: string;
  whatsappEnabled: boolean;
}

export function PreferencesForm() {
  const { account, setAccount } = useAuthStore();
  const { setLocale } = useUiStore();
  const queryClient = useQueryClient();

  const { register, handleSubmit, setValue, watch } = useForm<FormValues>({
    defaultValues: {
      languagePreference: account?.languagePreference ?? 'fr',
      dataSaverMode: account?.dataSaverMode ?? false,
      largeTextMode: account?.largeTextMode ?? false,
      email: account?.email ?? '',
      whatsappEnabled: account?.whatsappEnabled ?? false,
    },
  });

  const mutation = useMutation({
    mutationFn: (data: FormValues) => updateMyAccount({
      languagePreference: data.languagePreference,
      dataSaverMode: data.dataSaverMode,
      largeTextMode: data.largeTextMode,
      email: data.email || null,
      whatsappEnabled: data.whatsappEnabled,
    }),
    onSuccess: (updatedAccount) => {
      setAccount(updatedAccount);
      setLocale(updatedAccount.languagePreference as 'fr' | 'en');
      queryClient.invalidateQueries({ queryKey: ['account'] });
      toast.success('Preferences enregistrees !');
    },
  });

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
      <div>
        <Label>Langue</Label>
        <Select
          value={watch('languagePreference')}
          onValueChange={(v) => setValue('languagePreference', v)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="fr">Francais</SelectItem>
            <SelectItem value="en">English</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="email">Email (optionnel)</Label>
        <Input id="email" type="email" {...register('email')} placeholder="ton@email.com" />
      </div>

      <div className="space-y-3">
        <label className="flex items-center gap-3">
          <input type="checkbox" {...register('dataSaverMode')} className="h-4 w-4 rounded border-gray-300 text-forest focus:ring-forest" />
          <span className="text-sm">Economiseur de donnees</span>
        </label>
        <label className="flex items-center gap-3">
          <input type="checkbox" {...register('largeTextMode')} className="h-4 w-4 rounded border-gray-300 text-forest focus:ring-forest" />
          <span className="text-sm">Gros texte</span>
        </label>
        <label className="flex items-center gap-3">
          <input type="checkbox" {...register('whatsappEnabled')} className="h-4 w-4 rounded border-gray-300 text-forest focus:ring-forest" />
          <span className="text-sm">Notifications WhatsApp</span>
        </label>
      </div>

      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
      </Button>
    </form>
  );
}
