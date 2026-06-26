'use client';

import { useState } from 'react';
import { Info, ShieldCheck } from 'lucide-react';
import {
  TOURISM_CATEGORIES,
  TOURISM_SOURCES,
} from '@/lib/api/tourism';
import type {
  SubmitTourismPlaceInput,
  TourismCategory,
  TourismSource,
} from '@/lib/api/tourism';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  useCategoryLabel,
  useSourceLabel,
  useTourismT,
} from './tourism-i18n';

interface SubmitPlaceFormProps {
  onSubmit: (input: SubmitTourismPlaceInput) => Promise<void>;
  isPending: boolean;
  onCancel?: () => void;
}

export function SubmitPlaceForm({ onSubmit, isPending, onCancel }: SubmitPlaceFormProps) {
  const t = useTourismT();
  const categoryLabel = useCategoryLabel();
  const sourceLabel = useSourceLabel();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [region, setRegion] = useState('');
  const [category, setCategory] = useState<TourismCategory>('HERITAGE');
  const [source, setSource] = useState<TourismSource>('COMMUNITY');
  const [sourceRef, setSourceRef] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError(t('requiredName'));
      return;
    }

    const trimmedSourceRef = sourceRef.trim();
    // Provenance is mandatory for non-community sources — official data must be
    // traceable to its citation.
    if (source !== 'COMMUNITY' && !trimmedSourceRef) {
      setError(t('requiredSourceRef'));
      return;
    }

    const input: SubmitTourismPlaceInput = {
      name: trimmedName,
      description: description.trim() || null,
      region: region.trim() || null,
      category,
      source,
      sourceRef: trimmedSourceRef || null,
      latitude: latitude.trim() || null,
      longitude: longitude.trim() || null,
    };

    try {
      await onSubmit(input);
    } catch {
      setError(t('submitError'));
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Independence note — first, to set expectations. */}
      <div className="flex items-start gap-2 rounded-lg border border-forest/20 bg-forest/5 p-3 text-xs text-charcoal/70">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-forest" />
        <p>{t('independenceNote')}</p>
      </div>

      {/* Name */}
      <div className="space-y-1.5">
        <Label htmlFor="place-name">{t('fieldName')}</Label>
        <Input
          id="place-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('fieldNamePlaceholder')}
          maxLength={200}
          required
        />
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label htmlFor="place-description">
          {t('fieldDescription')}{' '}
          <span className="font-normal text-charcoal/40">({t('optional')})</span>
        </Label>
        <textarea
          id="place-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t('fieldDescriptionPlaceholder')}
          rows={5}
          className={cn(
            'flex w-full rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2 text-sm leading-relaxed ring-offset-[var(--background)]',
            'placeholder:text-[var(--muted-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          )}
        />
      </div>

      {/* Region + category */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="place-region">
            {t('fieldRegion')}{' '}
            <span className="font-normal text-charcoal/40">({t('optional')})</span>
          </Label>
          <Input
            id="place-region"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            placeholder={t('fieldRegionPlaceholder')}
            maxLength={120}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="place-category">{t('fieldCategory')}</Label>
          <Select value={category} onValueChange={(v) => setCategory(v as TourismCategory)}>
            <SelectTrigger id="place-category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TOURISM_CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {categoryLabel(cat)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Source + source ref (provenance) */}
      <div className="space-y-1.5">
        <Label htmlFor="place-source">{t('fieldSource')}</Label>
        <Select value={source} onValueChange={(v) => setSource(v as TourismSource)}>
          <SelectTrigger id="place-source">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TOURISM_SOURCES.map((s) => (
              <SelectItem key={s} value={s}>
                {sourceLabel(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="place-source-ref">
          {t('fieldSourceRef')}
          {source === 'COMMUNITY' && (
            <span className="font-normal text-charcoal/40"> ({t('optional')})</span>
          )}
        </Label>
        <Input
          id="place-source-ref"
          value={sourceRef}
          onChange={(e) => setSourceRef(e.target.value)}
          placeholder={t('fieldSourceRefPlaceholder')}
          maxLength={300}
        />
      </div>

      {/* Geo (optional) */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="place-lat">
            {t('fieldLatitude')}{' '}
            <span className="font-normal text-charcoal/40">({t('optional')})</span>
          </Label>
          <Input
            id="place-lat"
            value={latitude}
            onChange={(e) => setLatitude(e.target.value)}
            inputMode="decimal"
            placeholder="3.848"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="place-lng">
            {t('fieldLongitude')}{' '}
            <span className="font-normal text-charcoal/40">({t('optional')})</span>
          </Label>
          <Input
            id="place-lng"
            value={longitude}
            onChange={(e) => setLongitude(e.target.value)}
            inputMode="decimal"
            placeholder="11.502"
          />
        </div>
      </div>

      {/* Moderation note */}
      <div className="flex items-start gap-2 rounded-lg bg-sand/60 p-3 text-xs text-charcoal/70">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-forest" />
        <p>{t('moderationNote')}</p>
      </div>

      {error && <p className="text-sm font-medium text-[var(--destructive)]">{error}</p>}

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-1">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={isPending}>
            {t('cancel')}
          </Button>
        )}
        <Button type="submit" disabled={isPending}>
          {isPending ? t('submitting') : t('submitAction')}
        </Button>
      </div>
    </form>
  );
}
