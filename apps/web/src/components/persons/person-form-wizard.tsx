'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreatePersonSchema, type CreatePersonDto } from '@origin/shared-types';
import { LifeStatus, Gender, DatePrecision } from '@origin/shared-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { LifeStatusSelector } from './life-status-selector';
import { DateInputTolerant } from './date-input-tolerant';
import { Combobox } from '@/components/ui/combobox';
import { PhoneInput } from '@/components/auth/phone-input';
import { VILLAGES, ETHNIES, CHEFFERIES, VILLES } from '@/lib/data/cameroon';
import { cn } from '@/lib/utils';

interface PersonFormWizardProps {
  defaultValues?: Partial<CreatePersonDto>;
  onSubmit: (data: CreatePersonDto) => void;
  isPending?: boolean;
  submitLabel?: string;
}

const STEPS = ['Nom', 'Statut', 'Genre', 'Naissance', 'Deces', 'Origines', 'Recapitulatif'];

const GENDER_OPTIONS = [
  { value: Gender.MALE, label: 'Homme' },
  { value: Gender.FEMALE, label: 'Femme' },
];

export function PersonFormWizard({ defaultValues, onSubmit, isPending, submitLabel = 'Enregistrer' }: PersonFormWizardProps) {
  const [step, setStep] = useState(0);

  const form = useForm<CreatePersonDto>({
    resolver: zodResolver(CreatePersonSchema),
    defaultValues: {
      displayName: '',
      lifeStatus: LifeStatus.ALIVE,
      gender: undefined,
      birthDatePrecision: DatePrecision.UNKNOWN,
      deceasedDatePrecision: DatePrecision.UNKNOWN,
      birthCountry: 'Cameroun',
      isPublic: false,
      ...defaultValues,
    },
  });

  const { register, watch, setValue, handleSubmit, formState: { errors } } = form;
  const lifeStatus = watch('lifeStatus');
  const gender = watch('gender');
  function getVisibleSteps() {
    if (lifeStatus === LifeStatus.DECEASED) return STEPS;
    return STEPS.filter((s) => s !== 'Deces');
  }

  const visibleSteps = getVisibleSteps();
  const currentStepName = visibleSteps[step];
  const isLast = step === visibleSteps.length - 1;

  function next() {
    if (!isLast) setStep((s) => s + 1);
  }

  function prev() {
    if (step > 0) setStep((s) => s - 1);
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Only submit when on the last step
    if (isLast) {
      handleSubmit((data) => {
        // Backend requires at least one deceased_* field when life_status is
        // DECEASED. If the user didn't provide any date info, flag the record
        // as "assumed deceased" so submission succeeds.
        if (
          data.lifeStatus === LifeStatus.DECEASED &&
          !data.deceasedDate &&
          data.deceasedYearApproximate == null &&
          !data.deceasedDateText &&
          !data.deceasedAssumed
        ) {
          onSubmit({ ...data, deceasedAssumed: true });
          return;
        }
        onSubmit(data);
      })(e);
    }
  }

  return (
    <form onSubmit={handleFormSubmit} className="space-y-6">
      {/* Progress */}
      <div className="flex items-center justify-between text-sm text-charcoal/60">
        <span>Etape {step + 1} sur {visibleSteps.length}</span>
        <span>{currentStepName}</span>
      </div>
      <div className="h-1.5 rounded-full bg-sand">
        <div
          className="h-full rounded-full bg-forest transition-all"
          style={{ width: `${((step + 1) / visibleSteps.length) * 100}%` }}
        />
      </div>

      <Card>
        <CardContent className="p-6">
          {/* Step: Nom */}
          {currentStepName === 'Nom' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="displayName">Nom complet</Label>
                <Input id="displayName" {...register('displayName')} placeholder="Ex: Jean-Pierre Mbarga" />
                {errors.displayName && <p className="mt-1 text-sm text-error">{errors.displayName.message}</p>}
              </div>
            </div>
          )}

          {/* Step: Statut */}
          {currentStepName === 'Statut' && (
            <div className="space-y-4">
              <Label>Cette personne est...</Label>
              <LifeStatusSelector value={lifeStatus} onChange={(v) => setValue('lifeStatus', v)} />
            </div>
          )}

          {/* Step: Genre */}
          {currentStepName === 'Genre' && (
            <div className="space-y-4">
              <Label>Genre</Label>
              <div className="grid grid-cols-2 gap-3">
                {GENDER_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setValue('gender', opt.value)}
                    className={cn(
                      'rounded-xl border-2 p-3 text-sm font-medium transition-all',
                      gender === opt.value ? 'border-forest bg-forest/5 text-forest' : 'border-transparent bg-white hover:bg-sand',
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step: Naissance */}
          {currentStepName === 'Naissance' && (
            <div className="space-y-4">
              <DateInputTolerant
                label="Date de naissance"
                date={watch('birthDate')}
                precision={watch('birthDatePrecision') ?? DatePrecision.UNKNOWN}
                yearApproximate={watch('birthYearApproximate')}
                onChangeDate={(v) => setValue('birthDate', v)}
                onChangePrecision={(v) => setValue('birthDatePrecision', v)}
                onChangeYear={(v) => setValue('birthYearApproximate', v)}
              />
              <div>
                <Label htmlFor="birthPlace">Lieu de naissance</Label>
                <Combobox
                  id="birthPlace"
                  value={watch('birthPlace')}
                  onChange={(v) => setValue('birthPlace', v)}
                  options={VILLES}
                  placeholder="Ex: Douala"
                />
              </div>
            </div>
          )}

          {/* Step: Deces */}
          {currentStepName === 'Deces' && (
            <div className="space-y-4">
              <DateInputTolerant
                label="Date de deces"
                date={watch('deceasedDate')}
                precision={watch('deceasedDatePrecision') ?? DatePrecision.UNKNOWN}
                yearApproximate={watch('deceasedYearApproximate')}
                onChangeDate={(v) => setValue('deceasedDate', v)}
                onChangePrecision={(v) => setValue('deceasedDatePrecision', v)}
                onChangeYear={(v) => setValue('deceasedYearApproximate', v)}
              />
              <div>
                <Label htmlFor="deceasedPlace">Lieu de deces</Label>
                <Input id="deceasedPlace" {...register('deceasedPlace')} placeholder="Ex: Yaounde" />
              </div>
            </div>
          )}

          {/* Step: Origines */}
          {currentStepName === 'Origines' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="villageOrigin">Village d&apos;origine</Label>
                <Combobox
                  id="villageOrigin"
                  value={watch('villageOrigin')}
                  onChange={(v) => setValue('villageOrigin', v)}
                  options={VILLAGES}
                  placeholder="Ex: Bandjoun"
                />
              </div>
              <div>
                <Label htmlFor="ethnicity">Ethnie</Label>
                <Combobox
                  id="ethnicity"
                  value={watch('ethnicity')}
                  onChange={(v) => setValue('ethnicity', v)}
                  options={ETHNIES}
                  placeholder="Ex: Bamileke"
                />
              </div>
              <div>
                <Label htmlFor="chefferie">Chefferie</Label>
                <Combobox
                  id="chefferie"
                  value={watch('chefferie')}
                  onChange={(v) => setValue('chefferie', v)}
                  options={CHEFFERIES}
                  placeholder="Ex: Bafoussam"
                />
              </div>
              <div>
                <PhoneInput
                  label="Telephone (optionnel)"
                  value={watch('phoneNumber') ?? ''}
                  onChange={(v) => setValue('phoneNumber', v || undefined, { shouldDirty: true })}
                />
              </div>
              <div>
                <Label htmlFor="occupation">Metier</Label>
                <Input id="occupation" {...register('occupation')} placeholder="Ex: Enseignant" />
              </div>
            </div>
          )}

          {/* Step: Recapitulatif */}
          {currentStepName === 'Recapitulatif' && (
            <div className="space-y-3 text-sm">
              <h3 className="font-semibold text-charcoal">Recapitulatif</h3>
              <div className="grid gap-2">
                <Row label="Nom" value={watch('displayName')} />
                {watch('isSelf') && <Row label="Profil" value="C'est moi" />}
                <Row label="Statut" value={lifeStatus} />
                <Row label="Genre" value={gender ?? 'Non renseigne'} />
                <Row label="Village" value={watch('villageOrigin') ?? 'Non renseigne'} />
                <Row label="Ethnie" value={watch('ethnicity') ?? 'Non renseigne'} />
                <Row label="Telephone" value={watch('phoneNumber') ?? 'Non renseigne'} />
                <Row label="Metier" value={watch('occupation') ?? 'Non renseigne'} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={prev} disabled={step === 0}>
          Precedent
        </Button>
        {isLast ? (
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Enregistrement...' : submitLabel}
          </Button>
        ) : (
          <Button type="button" onClick={next}>
            Suivant
          </Button>
        )}
      </div>
    </form>
  );
}

function Row({ label, value }: { label: string; value: string | undefined }) {
  return (
    <div className="flex justify-between border-b border-sand py-1">
      <span className="text-charcoal/60">{label}</span>
      <span className="font-medium text-charcoal">{value || '-'}</span>
    </div>
  );
}
