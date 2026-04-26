'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  CreatePersonSchema,
  type CreatePersonDto,
  LifeStatus,
  Gender,
  DatePrecision,
} from '@origin/shared-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Combobox } from '@/components/ui/combobox';
import { PhoneInput } from '@/components/auth/phone-input';
import { LifeStatusSelector } from './life-status-selector';
import { DateInputTolerant } from './date-input-tolerant';
import { VILLAGES, ETHNIES, CHEFFERIES, VILLES } from '@/lib/data/cameroon';

// Backend's UpdatePersonDto strips isSelf and names. We never send them.
export type EditPersonPayload = Omit<CreatePersonDto, 'isSelf' | 'names'>;

interface Props {
  defaultValues: Partial<CreatePersonDto>;
  onSubmit: (data: EditPersonPayload) => void;
  isPending?: boolean;
  submitLabel?: string;
}

const GENDER_OPTIONS = [
  { value: Gender.MALE, label: 'Homme' },
  { value: Gender.FEMALE, label: 'Femme' },
  { value: Gender.OTHER, label: 'Autre' },
  { value: Gender.UNKNOWN, label: 'Inconnu' },
];

export function PersonEditForm({
  defaultValues,
  onSubmit,
  isPending,
  submitLabel = 'Enregistrer les modifications',
}: Props) {
  const form = useForm<CreatePersonDto>({
    resolver: zodResolver(CreatePersonSchema),
    defaultValues: {
      lifeStatus: LifeStatus.ALIVE,
      birthDatePrecision: DatePrecision.UNKNOWN,
      deceasedDatePrecision: DatePrecision.UNKNOWN,
      birthCountry: 'Cameroun',
      isPublic: false,
      ...defaultValues,
    },
  });

  const {
    register,
    watch,
    setValue,
    handleSubmit,
    formState: { errors, isDirty },
  } = form;
  const lifeStatus = watch('lifeStatus');
  const gender = watch('gender');
  const isPublic = watch('isPublic');

  function submit(data: CreatePersonDto) {
    // Strip the two write-protected fields before sending — the backend would
    // reject them anyway (forbidNonWhitelisted), but this keeps the request
    // minimal and self-documenting.
    const { isSelf, names, ...rest } = data;
    void isSelf;
    void names;

    // If life_status is DECEASED but no deceased info was provided, mark
    // assumed-deceased so the backend's coherence check passes.
    if (
      rest.lifeStatus === LifeStatus.DECEASED &&
      !rest.deceasedDate &&
      rest.deceasedYearApproximate == null &&
      !rest.deceasedDateText &&
      !rest.deceasedAssumed
    ) {
      onSubmit({ ...rest, deceasedAssumed: true });
      return;
    }
    onSubmit(rest);
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Identite</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="displayName">Nom complet</Label>
            <Input
              id="displayName"
              {...register('displayName')}
              placeholder="Ex: Jean-Pierre Mbarga"
            />
            {errors.displayName && (
              <p className="mt-1 text-sm text-error">{errors.displayName.message}</p>
            )}
          </div>

          <div>
            <Label>Statut</Label>
            <LifeStatusSelector
              value={lifeStatus}
              onChange={(v) => setValue('lifeStatus', v, { shouldDirty: true })}
            />
          </div>

          <div>
            <Label htmlFor="gender">Genre</Label>
            <select
              id="gender"
              {...register('gender')}
              className="flex h-10 w-full rounded-md border border-[var(--input)] bg-white px-3 text-sm"
              defaultValue={gender ?? ''}
            >
              <option value="">Non renseigne</option>
              {GENDER_OPTIONS.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Naissance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <DateInputTolerant
            label="Date de naissance"
            date={watch('birthDate')}
            precision={watch('birthDatePrecision')}
            yearApproximate={watch('birthYearApproximate')}
            onChangeDate={(v) => setValue('birthDate', v, { shouldDirty: true })}
            onChangePrecision={(v) =>
              setValue('birthDatePrecision', v, { shouldDirty: true })
            }
            onChangeYear={(v) =>
              setValue('birthYearApproximate', v, { shouldDirty: true })
            }
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="birthPlace">Ville de naissance</Label>
              <Combobox
                id="birthPlace"
                value={watch('birthPlace')}
                onChange={(v) => setValue('birthPlace', v, { shouldDirty: true })}
                options={VILLES}
                placeholder="Ex: Yaounde"
              />
            </div>
            <div>
              <Label htmlFor="birthCountry">Pays de naissance</Label>
              <Input
                id="birthCountry"
                {...register('birthCountry')}
                placeholder="Cameroun"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {lifeStatus === LifeStatus.DECEASED && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Deces</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <DateInputTolerant
              label="Date de deces"
              date={watch('deceasedDate')}
              precision={watch('deceasedDatePrecision')}
              yearApproximate={watch('deceasedYearApproximate')}
              onChangeDate={(v) => setValue('deceasedDate', v, { shouldDirty: true })}
              onChangePrecision={(v) =>
                setValue('deceasedDatePrecision', v, { shouldDirty: true })
              }
              onChangeYear={(v) =>
                setValue('deceasedYearApproximate', v, { shouldDirty: true })
              }
            />

            <div>
              <Label htmlFor="deceasedPlace">Lieu de deces</Label>
              <Input id="deceasedPlace" {...register('deceasedPlace')} />
            </div>

            <label className="flex items-center gap-2 text-sm text-charcoal/80">
              <input
                type="checkbox"
                {...register('deceasedAssumed')}
                className="h-4 w-4"
              />
              Date inconnue (presume disparu)
            </label>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Origines</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="villageOrigin">Village d&apos;origine</Label>
              <Combobox
                id="villageOrigin"
                value={watch('villageOrigin')}
                onChange={(v) => setValue('villageOrigin', v, { shouldDirty: true })}
                options={VILLAGES}
                placeholder="Ex: Bafoussam"
              />
            </div>
            <div>
              <Label htmlFor="chefferie">Chefferie</Label>
              <Combobox
                id="chefferie"
                value={watch('chefferie')}
                onChange={(v) => setValue('chefferie', v, { shouldDirty: true })}
                options={CHEFFERIES}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="ethnicity">Ethnie</Label>
            <Combobox
              id="ethnicity"
              value={watch('ethnicity')}
              onChange={(v) => setValue('ethnicity', v, { shouldDirty: true })}
              options={ETHNIES}
              placeholder="Ex: Bamileke"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Vie actuelle & contact</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="currentResidencePlace">Residence actuelle</Label>
              <Combobox
                id="currentResidencePlace"
                value={watch('currentResidencePlace')}
                onChange={(v) => setValue('currentResidencePlace', v, { shouldDirty: true })}
                options={VILLES}
              />
            </div>
            <div>
              <Label htmlFor="currentResidenceCountry">Pays</Label>
              <Input
                id="currentResidenceCountry"
                {...register('currentResidenceCountry')}
                placeholder="Cameroun"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="occupation">Metier</Label>
            <Input
              id="occupation"
              {...register('occupation')}
              placeholder="Ex: Enseignant"
            />
          </div>

          <PhoneInput
            label="Telephone (optionnel)"
            value={watch('phoneNumber') ?? ''}
            onChange={(v) =>
              setValue('phoneNumber', v || undefined, { shouldDirty: true })
            }
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">A propos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="biography">Biographie</Label>
            <textarea
              id="biography"
              {...register('biography')}
              rows={5}
              className="w-full rounded-md border border-[var(--input)] bg-white p-2 text-sm"
              placeholder="Histoire, anecdotes, traits marquants..."
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-charcoal/80">
            <input
              type="checkbox"
              checked={isPublic ?? false}
              onChange={(e) => setValue('isPublic', e.target.checked, { shouldDirty: true })}
              className="h-4 w-4"
            />
            Profil visible publiquement
          </label>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button type="submit" disabled={isPending || !isDirty} className="w-full sm:w-auto">
          {isPending ? 'Enregistrement...' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
