'use client';

import { useMemo, useState } from 'react';
import { VisibilityScope } from '@origin/shared-types';
import { Check, ChevronDown, Search, UserPlus } from 'lucide-react';
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
import { PersonAvatar } from '@/components/shared/person-avatar';
import { useMyPersons } from '@/lib/hooks/use-persons';
import { cn } from '@/lib/utils';
import {
  useLiveKindLabel,
  useLivesT,
  useLiveVisibilityLabel,
} from './lives-i18n';

export interface ScheduleSubmitExtras {
  /** Person ids the host chose to invite right after creating the session. */
  invitePersonIds: string[];
}

interface ScheduleLiveFormProps {
  onSubmit: (
    input: CreateLiveSessionInput,
    extras: ScheduleSubmitExtras,
  ) => Promise<void>;
  isPending: boolean;
  onCancel?: () => void;
  /** Pre-selected kind (e.g. from an idea card on the empty state). */
  initialKind?: LiveSessionKind;
}

export function ScheduleLiveForm({
  onSubmit,
  isPending,
  onCancel,
  initialKind,
}: ScheduleLiveFormProps) {
  const t = useLivesT();
  const kindLabel = useLiveKindLabel();
  const visibilityLabel = useLiveVisibilityLabel();

  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<LiveSessionKind>(initialKind ?? 'CEREMONY');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<VisibilityScope>(
    VisibilityScope.FAMILY,
  );
  const [scheduledAt, setScheduledAt] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

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
      await onSubmit(input, { invitePersonIds: [...selected] });
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

      {/* Optional: invite relatives */}
      <InviteRelativesStep
        open={inviteOpen}
        onToggle={() => setInviteOpen((v) => !v)}
        selected={selected}
        onSelectedChange={setSelected}
      />

      {error && (
        <p className="text-sm font-medium text-[var(--destructive)]">{error}</p>
      )}

      <div className="flex items-center justify-end gap-2 pt-1">
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={isPending}
          >
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

function InviteRelativesStep({
  open,
  onToggle,
  selected,
  onSelectedChange,
}: {
  open: boolean;
  onToggle: () => void;
  selected: Set<string>;
  onSelectedChange: (next: Set<string>) => void;
}) {
  const t = useLivesT();
  const { data: persons, isLoading } = useMyPersons();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const list = persons ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((p) => p.displayName.toLowerCase().includes(q));
  }, [persons, query]);

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectedChange(next);
  }

  return (
    <div className="rounded-lg border border-[var(--input)]">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-medium text-charcoal">
          <UserPlus className="h-4 w-4 text-forest" />
          {t('invite')}{' '}
          <span className="font-normal text-charcoal/40">({t('optional')})</span>
          {selected.size > 0 && (
            <span className="rounded-full bg-forest px-1.5 text-xs font-semibold text-white">
              {selected.size}
            </span>
          )}
        </span>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-charcoal/40 transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && (
        <div className="space-y-2 border-t border-[var(--input)] p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal/40" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('inviteSearchFamily')}
              className="pl-9"
            />
          </div>
          <div className="max-h-56 space-y-1 overflow-y-auto">
            {isLoading ? (
              <p className="py-6 text-center text-sm text-charcoal/40">…</p>
            ) : filtered.length === 0 ? (
              <p className="py-6 text-center text-sm text-charcoal/50">
                {t('inviteFamilyEmpty')}
              </p>
            ) : (
              filtered.map((p) => {
                const isSelected = selected.has(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggle(p.id)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-sand',
                      isSelected && 'bg-sand',
                    )}
                  >
                    <PersonAvatar
                      id={p.id}
                      displayName={p.displayName}
                      lifeStatus={p.lifeStatus}
                      size="sm"
                    />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-charcoal">
                      {p.displayName}
                    </span>
                    <span
                      className={cn(
                        'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                        isSelected
                          ? 'border-forest bg-forest text-white'
                          : 'border-charcoal/25',
                      )}
                    >
                      {isSelected && <Check className="h-3 w-3" />}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
