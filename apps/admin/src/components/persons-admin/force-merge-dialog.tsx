'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useForceMerge } from '@/lib/hooks/use-admin-persons';
import { useT } from '@/i18n';

interface Props {
  candidates: Array<{ id: string; displayName: string }>; // group of duplicates
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export function ForceMergeDialog({ candidates, open, onOpenChange }: Props) {
  const t = useT();
  const [keeperId, setKeeperId] = useState<string | null>(null);
  const [loserId, setLoserId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const merge = useForceMerge();

  useEffect(() => {
    if (open) {
      setKeeperId(null);
      setLoserId(null);
      setReason('');
      setConfirmText('');
    }
  }, [open]);

  const canSubmit =
    keeperId &&
    loserId &&
    keeperId !== loserId &&
    reason.length >= 30 &&
    confirmText === 'MERGE' &&
    !merge.isPending;

  const onSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    if (!canSubmit) return;
    merge.mutate(
      { keeperPersonId: keeperId!, loserPersonId: loserId!, reason },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('admin.persons.forceMerge.title')}</DialogTitle>
          <DialogDescription>{t('admin.persons.forceMerge.warning')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{t('admin.common.criticalAction')}</AlertTitle>
            <AlertDescription>{t('admin.common.auditedAction')}</AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label>{t('admin.persons.forceMerge.keeper')}</Label>
            <select
              className="flex h-10 w-full rounded-md border border-[var(--input)] bg-[var(--background)] px-3 text-sm"
              value={keeperId ?? ''}
              onChange={(e) => setKeeperId(e.target.value || null)}
            >
              <option value="">—</option>
              {candidates.map((c) => (
                <option key={c.id} value={c.id}>{c.displayName} ({c.id.slice(0, 8)})</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label>{t('admin.persons.forceMerge.loser')}</Label>
            <select
              className="flex h-10 w-full rounded-md border border-[var(--input)] bg-[var(--background)] px-3 text-sm"
              value={loserId ?? ''}
              onChange={(e) => setLoserId(e.target.value || null)}
            >
              <option value="">—</option>
              {candidates.filter((c) => c.id !== keeperId).map((c) => (
                <option key={c.id} value={c.id}>{c.displayName} ({c.id.slice(0, 8)})</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">{t('admin.common.reason')} (≥30 chars)</Label>
            <Textarea id="reason" rows={4} value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm">Tapez « MERGE » pour confirmer</Label>
            <Input id="confirm" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={merge.isPending}>
              {t('admin.common.cancel')}
            </Button>
            <Button type="submit" variant="destructive" disabled={!canSubmit}>
              {merge.isPending ? t('admin.common.saving') : 'Fusionner'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
