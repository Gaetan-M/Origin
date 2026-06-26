'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useSuggestEdit } from '@/lib/hooks/use-engagement';
import type { EngagementTarget, SuggestEditField } from '@/lib/api/engagement';
import { ApiError } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useEngagementT, type EngagementStringKey } from './engagement-i18n';

interface SuggestEditDialogProps {
  target: EngagementTarget;
  id: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PLACE_FIELDS: { field: SuggestEditField; labelKey: EngagementStringKey }[] = [
  { field: 'name', labelKey: 'fieldName' },
  { field: 'description', labelKey: 'fieldDescription' },
  { field: 'region', labelKey: 'fieldRegion' },
  { field: 'location', labelKey: 'fieldLocation' },
];

const CONTENT_FIELDS: { field: SuggestEditField; labelKey: EngagementStringKey }[] = [
  { field: 'title', labelKey: 'fieldTitle' },
  { field: 'body', labelKey: 'fieldBody' },
  { field: 'region', labelKey: 'fieldRegion' },
  { field: 'ethnicGroup', labelKey: 'fieldEthnicGroup' },
];

export function SuggestEditDialog({ target, id, open, onOpenChange }: SuggestEditDialogProps) {
  const t = useEngagementT();
  const suggest = useSuggestEdit(target, id);

  const fields = useMemo(
    () => (target === 'tourism-place' ? PLACE_FIELDS : CONTENT_FIELDS),
    [target],
  );

  const [field, setField] = useState<SuggestEditField>(fields[0].field);
  const [proposedValue, setProposedValue] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setField(fields[0].field);
    setProposedValue('');
    setNote('');
    setError(null);
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = proposedValue.trim();
    if (!value) {
      setError(t('requiredValue'));
      return;
    }
    setError(null);
    suggest.mutate(
      { field, proposedValue: value, note: note.trim() || undefined },
      {
        onSuccess: () => {
          toast.success(t('suggestSent'));
          handleOpenChange(false);
        },
        onError: (err) => {
          const msg = err instanceof ApiError ? err.message : undefined;
          toast.error(msg ?? t('suggestError'));
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('suggestEditTitle')}</DialogTitle>
          <DialogDescription>{t('suggestEditSubtitle')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="suggest-field">{t('field')}</Label>
            <Select value={field} onValueChange={(v) => setField(v as SuggestEditField)}>
              <SelectTrigger id="suggest-field">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {fields.map((f) => (
                  <SelectItem key={f.field} value={f.field}>
                    {t(f.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="suggest-value">{t('proposedValue')}</Label>
            <Input
              id="suggest-value"
              value={proposedValue}
              onChange={(e) => setProposedValue(e.target.value)}
              placeholder={t('proposedValuePlaceholder')}
              maxLength={500}
            />
            {error && <p className="text-xs text-terracotta">{error}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="suggest-note">
              {t('note')}{' '}
              <span className="font-normal text-charcoal/40">({t('optional')})</span>
            </Label>
            <textarea
              id="suggest-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t('notePlaceholder')}
              maxLength={1000}
              rows={3}
              className="w-full resize-none rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={suggest.isPending}
            >
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={suggest.isPending}>
              {suggest.isPending ? t('submitting') : t('submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
