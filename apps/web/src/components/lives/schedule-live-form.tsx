'use client';

import { useState } from 'react';
import { VisibilityScope } from '@origin/shared-types';
import {
  LIVE_SESSION_KINDS,
  LIVE_VISIBILITY_CHOICES,
} from '@/lib/api/live';
import type { CreateLiveSessionInput, LiveSessionKind } from '@/lib/api/live';
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
  useLiveKindLabel,
  useLivesT,
  useLiveVisibilityLabel,
} from './lives-i18n';

interface ScheduleLiveFormProps {
  onSubmit: (input: CreateLiveSessionInput) => Promise<void>;
  isPending: boolean;
  onCancel?: () => void;
}

export function ScheduleLiveForm({ onSubmit, isPending, onCancel }: ScheduleLiveFormProps) {
  const t = useLivesT();
  const kindLabel = useLiveKindLabel();
  const visibilityLabel = useLiveVisibilityLabel();

  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<LiveSessionKind>('CEREMONY');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<VisibilityScope>(VisibilityScope.FAMILY);
  const [scheduledAt, setScheduledAt] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError(t('requiredTitle'));
      return;
    }

    // datetime-local yields a wall-clock string; convert to a UTC ISO instant.
    const scheduledIso = scheduledAt ? new Date(scheduledAt).toISOString() : null;

    const input: CreateLiveSessionInput = {
      title: trimmedTitle,
      kind,
      description: description.trim() || null,
      visibilityScope: visibility,
      scheduledAt: scheduledIso,
    };

    try {
      await onSubmit(input);
    } catch {
      setError(t('submitError'));
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Title */}
      <div className="space-y-1.5">
        <Label htmlFor="live-title">{t('fieldTitle')}</Label>
        <Input
          id="live-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t('fieldTitlePlaceholder')}
          maxLength={200}
          required
        />
      </div>

      {/* Kind */}
      <div className="space-y-1.5">
        <Label htmlFor="live-kind">{t('fieldKind')}</Label>
        <Select value={kind} onValueChange={(v) => setKind(v as LiveSessionKind)}>
          <SelectTrigger id="live-kind">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LIVE_SESSION_KINDS.map((k) => (
              <SelectItem key={k} value={k}>
                {kindLabel(k)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Visibility */}
      <div className="space-y-1.5">
        <Label htmlFor="live-visibility">{t('fieldVisibility')}</Label>
        <Select
          value={visibility}
          onValueChange={(v) => setVisibility(v as VisibilityScope)}
        >
          <SelectTrigger id="live-visibility">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LIVE_VISIBILITY_CHOICES.map((scope) => (
              <SelectItem key={scope} value={scope}>
                {visibilityLabel(scope)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Scheduled at */}
      <div className="space-y-1.5">
        <Label htmlFor="live-scheduled">
          {t('fieldScheduledAt')}{' '}
          <span className="font-normal text-charcoal/40">({t('optional')})</span>
        </Label>
        <Input
          id="live-scheduled"
          type="datetime-local"
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
        />
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label htmlFor="live-description">
          {t('fieldDescription')}{' '}
          <span className="font-normal text-charcoal/40">({t('optional')})</span>
        </Label>
        <textarea
          id="live-description"
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

      {error && <p className="text-sm font-medium text-[var(--destructive)]">{error}</p>}

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
