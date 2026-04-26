'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  CreatePersonSchema,
  type CreatePersonDto,
  LifeStatus,
  DatePrecision,
  Gender,
} from '@origin/shared-types';
import { useCreatePerson } from '@/lib/hooks/use-persons';
import {
  searchPersonsScored,
  type ScoredMatch,
} from '@/lib/api/matching';
import { createClaim } from '@/lib/api/claims';
import { ApiError } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { OriginLogo } from '@/components/branding/origin-decor';
import { PersonAvatar } from '@/components/shared/person-avatar';
import { getMediaFileUrl } from '@/lib/api/media';
import { cn } from '@/lib/utils';
import { ArrowLeft, Loader2, UserPlus, Sparkles } from 'lucide-react';

type Step = 'info' | 'candidates';

export default function OnboardingPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const createPerson = useCreatePerson();

  const [step, setStep] = useState<Step>('info');
  const [candidates, setCandidates] = useState<ScoredMatch[]>([]);

  const form = useForm<CreatePersonDto>({
    resolver: zodResolver(CreatePersonSchema),
    defaultValues: {
      displayName: '',
      isSelf: true,
      lifeStatus: LifeStatus.ALIVE,
      birthDatePrecision: DatePrecision.UNKNOWN,
      deceasedDatePrecision: DatePrecision.UNKNOWN,
      birthCountry: 'Cameroun',
      isPublic: false,
      gender: undefined,
      birthYearApproximate: undefined,
    },
  });

  const {
    register,
    watch,
    setValue,
    handleSubmit,
    formState: { errors },
  } = form;
  const gender = watch('gender');

  // Step 1 submit: search for potential duplicates before creating.
  const discover = useMutation({
    mutationFn: async (data: CreatePersonDto) => {
      const result = await searchPersonsScored({
        name: data.displayName,
        birthYear: data.birthYearApproximate,
      });
      return result.matches.filter((m) => m.action !== 'ignore' && m.person);
    },
    onSuccess: (matches) => {
      if (matches.length === 0) {
        // No look-alike in the database — create straight away.
        void finalizeAsNewPerson();
      } else {
        setCandidates(matches);
        setStep('candidates');
      }
    },
    onError: () => {
      // If the matching service is unavailable, fall back to plain create
      // so a broken search can never block an account creation.
      void finalizeAsNewPerson();
    },
  });

  async function finalizeAsNewPerson() {
    const data = form.getValues();
    try {
      await createPerson.mutateAsync({ ...data, isSelf: true });
      await queryClient.invalidateQueries({ queryKey: ['claims', 'mine'] });
      router.replace('/dashboard');
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : 'Impossible de creer le profil';
      toast.error(msg);
    }
  }

  // Step 2: user claimed an existing person — create a PENDING claim and
  // land on /dashboard. The layout guard will let them in because they
  // now have a claim (status doesn't matter for the guard).
  const claimExisting = useMutation({
    mutationFn: (personId: string) =>
      createClaim({
        personId,
        evidence: 'Revendication lors de la creation du compte',
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['claims', 'mine'] });
      toast.success(
        'Revendication envoyee. En attente de validation par la famille.',
      );
      router.replace('/dashboard');
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : 'Revendication refusee';
      toast.error(msg);
    },
  });

  const busy =
    discover.isPending || createPerson.isPending || claimExisting.isPending;

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-6 text-center">
        <div className="mb-4 flex justify-center">
          <OriginLogo size={56} withText={false} />
        </div>
        <h1 className="text-2xl font-bold text-charcoal">
          {step === 'info' ? 'Bienvenue sur Origin' : 'On t\'a peut-etre deja trouve'}
        </h1>
        <p className="mt-2 text-sm text-charcoal/60">
          {step === 'info'
            ? 'Dis-nous qui tu es. Tu pourras completer ton profil plus tard.'
            : 'Une ou plusieurs personnes qui te ressemblent existent deja. Es-tu l\'une d\'elles?'}
        </p>
      </div>

      {step === 'info' && (
        <form
          onSubmit={handleSubmit((data) => discover.mutate(data))}
          className="space-y-5 rounded-2xl border border-sand bg-white p-6 shadow-sm"
        >
          <div>
            <Label htmlFor="displayName">Nom complet</Label>
            <Input
              id="displayName"
              {...register('displayName')}
              placeholder="Ex: Jean-Pierre Mbarga"
              autoFocus
              autoComplete="name"
            />
            {errors.displayName && (
              <p className="mt-1 text-sm text-error">
                {errors.displayName.message}
              </p>
            )}
          </div>

          <div>
            <Label>Genre</Label>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setValue('gender', Gender.MALE)}
                className={cn(
                  'rounded-xl border-2 p-3 text-sm font-medium transition-all',
                  gender === Gender.MALE
                    ? 'border-forest bg-forest/5 text-forest'
                    : 'border-transparent bg-sand/40 text-charcoal/70 hover:bg-sand',
                )}
              >
                Homme
              </button>
              <button
                type="button"
                onClick={() => setValue('gender', Gender.FEMALE)}
                className={cn(
                  'rounded-xl border-2 p-3 text-sm font-medium transition-all',
                  gender === Gender.FEMALE
                    ? 'border-forest bg-forest/5 text-forest'
                    : 'border-transparent bg-sand/40 text-charcoal/70 hover:bg-sand',
                )}
              >
                Femme
              </button>
            </div>
          </div>

          <div>
            <Label htmlFor="birthYearApproximate">
              Annee de naissance{' '}
              <span className="text-xs font-normal text-charcoal/50">
                (approximative — aide a te trouver si tu existes deja)
              </span>
            </Label>
            <Input
              id="birthYearApproximate"
              type="number"
              min={1800}
              max={2100}
              {...register('birthYearApproximate', {
                setValueAs: (v) => (v === '' || v == null ? undefined : Number(v)),
              })}
              placeholder="Ex: 1992"
            />
          </div>

          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {discover.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Recherche…
              </>
            ) : (
              'Continuer'
            )}
          </Button>
        </form>
      )}

      {step === 'candidates' && (
        <div className="space-y-3">
          {candidates.map((m) => (
            <CandidateCard
              key={m.person.id}
              match={m}
              disabled={busy}
              onPick={() => claimExisting.mutate(m.person.id)}
            />
          ))}

          <div className="rounded-2xl border border-dashed border-sand bg-white/60 p-5 text-center">
            <p className="mb-3 text-sm text-charcoal/70">
              Aucun ne te correspond? Cree un nouveau profil — tu pourras
              toujours le fusionner plus tard si tu reconnais quelqu\'un.
            </p>
            <Button
              variant="outline"
              size="lg"
              className="w-full gap-2"
              onClick={finalizeAsNewPerson}
              disabled={busy}
            >
              {createPerson.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              Creer un nouveau profil
            </Button>
          </div>

          <button
            type="button"
            onClick={() => setStep('info')}
            className="inline-flex items-center gap-1 text-sm text-charcoal/60 hover:text-charcoal"
            disabled={busy}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Modifier mes informations
          </button>
        </div>
      )}
    </div>
  );
}

function CandidateCard({
  match,
  onPick,
  disabled,
}: {
  match: ScoredMatch;
  onPick: () => void;
  disabled: boolean;
}) {
  const { person, action, score } = match;
  const isStrong = action === 'auto_match';
  const birthYear =
    person.birthYearApproximate ??
    (person.birthDate ? new Date(person.birthDate).getUTCFullYear() : null);

  return (
    <div
      className={cn(
        'flex items-center gap-4 rounded-2xl border bg-white p-4 shadow-sm transition-shadow hover:shadow-md',
        isStrong ? 'border-forest/40' : 'border-sand',
      )}
    >
      <PersonAvatar
        id={person.id}
        displayName={person.displayName}
        lifeStatus={person.lifeStatus}
        photoUrl={person.primaryPhotoId ? getMediaFileUrl(person.primaryPhotoId) : null}
        size="md"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-charcoal">
            {person.displayName}
          </p>
          {isStrong && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-forest/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-forest">
              <Sparkles className="h-3 w-3" />
              Forte probabilite
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-charcoal/55">
          {[
            birthYear ? `ne(e) ${birthYear}` : null,
            person.villageOrigin,
            person.ethnicity,
          ]
            .filter(Boolean)
            .join(' · ') || 'Peu d\'informations'}
        </p>
        <p className="mt-1 text-[11px] text-charcoal/40">
          Score {Math.round(score * 100)}%
        </p>
      </div>
      <Button size="sm" onClick={onPick} disabled={disabled}>
        C&apos;est moi
      </Button>
    </div>
  );
}
