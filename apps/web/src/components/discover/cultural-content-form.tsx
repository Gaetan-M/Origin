'use client';

import { useState } from 'react';
import { Info } from 'lucide-react';
import { CULTURAL_CONTENT_TYPES } from '@/lib/api/cultural';
import type {
  CreateCulturalContentInput,
  CulturalContentType,
} from '@/lib/api/cultural';
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
import { useContentTypeLabel, useDiscoverT } from './discover-i18n';

interface CulturalContentFormProps {
  onSubmit: (input: CreateCulturalContentInput) => Promise<void>;
  isPending: boolean;
  onCancel?: () => void;
}

export function CulturalContentForm({ onSubmit, isPending, onCancel }: CulturalContentFormProps) {
  const t = useDiscoverT();
  const typeLabel = useContentTypeLabel();

  const [contentType, setContentType] = useState<CulturalContentType>('TALE');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [languageCode, setLanguageCode] = useState('');
  const [region, setRegion] = useState('');
  const [ethnicGroup, setEthnicGroup] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError(t('requiredTitle'));
      return;
    }

    const input: CreateCulturalContentInput = {
      contentType,
      title: trimmedTitle,
      body: body.trim() || null,
      languageCode: languageCode.trim() || null,
      region: region.trim() || null,
      ethnicGroup: ethnicGroup.trim() || null,
    };

    try {
      await onSubmit(input);
    } catch {
      setError(t('submitError'));
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Content type */}
      <div className="space-y-1.5">
        <Label htmlFor="content-type">{t('fieldType')}</Label>
        <Select value={contentType} onValueChange={(v) => setContentType(v as CulturalContentType)}>
          <SelectTrigger id="content-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CULTURAL_CONTENT_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {typeLabel(type)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Title */}
      <div className="space-y-1.5">
        <Label htmlFor="title">{t('fieldTitle')}</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t('fieldTitlePlaceholder')}
          maxLength={255}
          required
        />
      </div>

      {/* Body */}
      <div className="space-y-1.5">
        <Label htmlFor="body">
          {t('fieldBody')}{' '}
          <span className="font-normal text-charcoal/40">({t('optional')})</span>
        </Label>
        <textarea
          id="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={t('fieldBodyPlaceholder')}
          rows={6}
          className={cn(
            'flex w-full rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2 text-sm leading-relaxed ring-offset-[var(--background)]',
            'placeholder:text-[var(--muted-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          )}
        />
      </div>

      {/* Language */}
      <div className="space-y-1.5">
        <Label htmlFor="language">
          {t('fieldLanguage')}{' '}
          <span className="font-normal text-charcoal/40">({t('optional')})</span>
        </Label>
        <Input
          id="language"
          value={languageCode}
          onChange={(e) => setLanguageCode(e.target.value)}
          placeholder={t('fieldLanguagePlaceholder')}
          maxLength={10}
        />
      </div>

      {/* Region + ethnic group (side by side on larger screens) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="region">
            {t('fieldRegion')}{' '}
            <span className="font-normal text-charcoal/40">({t('optional')})</span>
          </Label>
          <Input
            id="region"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            placeholder={t('fieldRegionPlaceholder')}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ethnic-group">
            {t('fieldEthnicGroup')}{' '}
            <span className="font-normal text-charcoal/40">({t('optional')})</span>
          </Label>
          <Input
            id="ethnic-group"
            value={ethnicGroup}
            onChange={(e) => setEthnicGroup(e.target.value)}
            placeholder={t('fieldEthnicGroupPlaceholder')}
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
          {isPending ? t('submitting') : t('submit')}
        </Button>
      </div>
    </form>
  );
}
