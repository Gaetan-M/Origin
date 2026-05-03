'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LifeStatus, VerificationLevel } from '@origin/shared-types';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useUpdatePerson } from '@/lib/hooks/use-admin-persons';
import { useT } from '@/i18n';
import type { AdminPersonDetail } from '@/lib/api/admin-persons';

const schema = z.object({
  displayName: z.string().min(1).max(255),
  gender: z.string().max(1).optional().or(z.literal('')),
  lifeStatus: z.nativeEnum(LifeStatus),
  birthYearApproximate: z.coerce.number().int().min(1700).max(2100).optional().or(z.literal('')),
  birthPlace: z.string().max(255).optional().or(z.literal('')),
  birthRegion: z.string().max(100).optional().or(z.literal('')),
  birthCountry: z.string().max(100).optional().or(z.literal('')),
  villageOrigin: z.string().max(255).optional().or(z.literal('')),
  occupation: z.string().max(255).optional().or(z.literal('')),
  biography: z.string().max(5000).optional().or(z.literal('')),
  isPublic: z.coerce.boolean().optional(),
  privacyLevel: z.coerce.number().int().min(0).max(5).optional(),
  verificationLevel: z.nativeEnum(VerificationLevel).optional(),
  reason: z.string().min(10).max(1000),
});

type FormValues = z.infer<typeof schema>;

export function PersonEditDialog({ detail, open, onOpenChange }: { detail: AdminPersonDetail; open: boolean; onOpenChange: (o: boolean) => void }) {
  const t = useT();
  const update = useUpdatePerson(detail.person.id);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      displayName: detail.person.displayName,
      gender: detail.person.gender ?? '',
      lifeStatus: detail.person.lifeStatus,
      birthYearApproximate: detail.person.birthYearApproximate ?? ('' as unknown as number),
      birthPlace: '',
      birthRegion: detail.person.birthRegion ?? '',
      birthCountry: detail.person.birthCountry ?? '',
      villageOrigin: detail.person.villageOrigin ?? '',
      occupation: detail.person.occupation ?? '',
      biography: detail.person.biography ?? '',
      isPublic: detail.person.isPublic,
      privacyLevel: detail.person.privacyLevel,
      verificationLevel: detail.person.verificationLevel,
      reason: '',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        displayName: detail.person.displayName,
        gender: detail.person.gender ?? '',
        lifeStatus: detail.person.lifeStatus,
        birthYearApproximate: detail.person.birthYearApproximate ?? ('' as unknown as number),
        birthPlace: '',
        birthRegion: detail.person.birthRegion ?? '',
        birthCountry: detail.person.birthCountry ?? '',
        villageOrigin: detail.person.villageOrigin ?? '',
        occupation: detail.person.occupation ?? '',
        biography: detail.person.biography ?? '',
        isPublic: detail.person.isPublic,
        privacyLevel: detail.person.privacyLevel,
        verificationLevel: detail.person.verificationLevel,
        reason: '',
      });
    }
  }, [open, detail, form]);

  const onSubmit = form.handleSubmit((values) => {
    update.mutate(
      {
        displayName: values.displayName,
        gender: values.gender || null,
        lifeStatus: values.lifeStatus,
        birthYearApproximate: typeof values.birthYearApproximate === 'number' ? values.birthYearApproximate : null,
        birthPlace: values.birthPlace || null,
        birthRegion: values.birthRegion || null,
        birthCountry: values.birthCountry || null,
        villageOrigin: values.villageOrigin || null,
        occupation: values.occupation || null,
        biography: values.biography || null,
        isPublic: values.isPublic,
        privacyLevel: values.privacyLevel,
        verificationLevel: values.verificationLevel,
        reason: values.reason,
      },
      { onSuccess: () => onOpenChange(false) },
    );
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('admin.persons.edit.title')}</DialogTitle>
          <DialogDescription>{t('admin.common.auditedAction')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="displayName">{t('admin.persons.columns.displayName')}</Label>
              <Input id="displayName" {...form.register('displayName')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gender">{t('admin.persons.columns.gender')}</Label>
              <Input id="gender" maxLength={1} {...form.register('gender')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lifeStatus">{t('admin.persons.columns.lifeStatus')}</Label>
              <Select value={form.watch('lifeStatus')} onValueChange={(v) => form.setValue('lifeStatus', v as LifeStatus)}>
                <SelectTrigger id="lifeStatus"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={LifeStatus.ALIVE}>{t('admin.persons.lifeStatus.ALIVE')}</SelectItem>
                  <SelectItem value={LifeStatus.DECEASED}>{t('admin.persons.lifeStatus.DECEASED')}</SelectItem>
                  <SelectItem value={LifeStatus.UNKNOWN}>{t('admin.persons.lifeStatus.UNKNOWN')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="birthYear">{t('admin.persons.columns.birthYear')}</Label>
              <Input id="birthYear" type="number" {...form.register('birthYearApproximate')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="village">{t('admin.persons.columns.village')}</Label>
              <Input id="village" {...form.register('villageOrigin')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="region">{t('admin.persons.columns.region')}</Label>
              <Input id="region" {...form.register('birthRegion')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="country">Pays</Label>
              <Input id="country" {...form.register('birthCountry')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="occupation">Métier</Label>
              <Input id="occupation" {...form.register('occupation')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="verificationLevel">Niveau de vérification</Label>
              <Select value={form.watch('verificationLevel') ?? VerificationLevel.UNVERIFIED} onValueChange={(v) => form.setValue('verificationLevel', v as VerificationLevel)}>
                <SelectTrigger id="verificationLevel"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.values(VerificationLevel).map((vl) => (
                    <SelectItem key={vl} value={vl}>{vl}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="biography">Biographie</Label>
              <Textarea id="biography" rows={4} {...form.register('biography')} />
            </div>
          </div>

          <Alert variant="warning">
            <AlertDescription>{t('admin.common.auditedAction')}</AlertDescription>
          </Alert>

          <div className="space-y-1.5">
            <Label htmlFor="reason">{t('admin.common.reason')}</Label>
            <Textarea id="reason" rows={3} placeholder={t('admin.common.reasonPlaceholder')} {...form.register('reason')} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={update.isPending}>
              {t('admin.common.cancel')}
            </Button>
            <Button type="submit" disabled={update.isPending}>
              {update.isPending ? t('admin.common.saving') : t('admin.common.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
