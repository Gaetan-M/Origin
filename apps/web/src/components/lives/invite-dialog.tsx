'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Check,
  Copy,
  Loader2,
  MessageCircle,
  Phone,
  QrCode,
  Search,
  Share2,
  Users,
  X,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PersonAvatar } from '@/components/shared/person-avatar';
import { cn } from '@/lib/utils';
import { useMyPersons } from '@/lib/hooks/use-persons';
import { useInviteToLive, useEnsureInviteCode } from '@/lib/hooks/use-lives';
import { useLivesT } from './lives-i18n';

interface InviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  inviteCode: string | null;
}

/** E.164-ish guard: leading +, 8–15 digits. */
function isValidPhone(value: string): boolean {
  return /^\+\d{8,15}$/.test(value.replace(/[\s-]/g, ''));
}

export function InviteDialog({
  open,
  onOpenChange,
  sessionId,
  inviteCode,
}: InviteDialogProps) {
  const t = useLivesT();
  const invite = useInviteToLive(sessionId);
  const ensureCode = useEnsureInviteCode(sessionId);

  // The host may open this dialog on a session that has no shareable code yet
  // (older sessions predate invite codes). Track the effective code locally and
  // generate one on demand so the link/QR is always available.
  const [effectiveCode, setEffectiveCode] = useState<string | null>(inviteCode);

  useEffect(() => {
    if (inviteCode) setEffectiveCode(inviteCode);
  }, [inviteCode]);

  const ensure = ensureCode.mutate;
  useEffect(() => {
    if (open && !effectiveCode && !ensureCode.isPending) {
      ensure(undefined, {
        onSuccess: (session) => setEffectiveCode(session.inviteCode ?? null),
      });
    }
  }, [open, effectiveCode, ensureCode.isPending, ensure]);

  const joinUrl = useMemo(() => {
    if (!effectiveCode) return null;
    const origin =
      typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/lives/join/${effectiveCode}`;
  }, [effectiveCode]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('inviteTitle')}</DialogTitle>
          <DialogDescription>{t('inviteSubtitle')}</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="family">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="family">
              <Users className="mr-1 h-4 w-4" />
              {t('inviteTabFamily')}
            </TabsTrigger>
            <TabsTrigger value="link">
              <QrCode className="mr-1 h-4 w-4" />
              {t('inviteTabLink')}
            </TabsTrigger>
            <TabsTrigger value="phone">
              <Phone className="mr-1 h-4 w-4" />
              {t('inviteTabPhone')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="family">
            <FamilyInvite
              onSend={(personIds) =>
                invite.mutateAsync({ personIds }).then(() => undefined)
              }
              isPending={invite.isPending}
            />
          </TabsContent>

          <TabsContent value="link">
            <LinkInvite
              joinUrl={joinUrl}
              code={effectiveCode}
              generating={ensureCode.isPending}
              onGenerate={() =>
                ensure(undefined, {
                  onSuccess: (session) =>
                    setEffectiveCode(session.inviteCode ?? null),
                  onError: () => toast.error(t('inviteFailed')),
                })
              }
            />
          </TabsContent>

          <TabsContent value="phone">
            <PhoneInvite
              onSend={(phoneNumbers) =>
                invite.mutateAsync({ phoneNumbers }).then(() => undefined)
              }
              isPending={invite.isPending}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

/* ----------------------------- Family ----------------------------- */

function FamilyInvite({
  onSend,
  isPending,
}: {
  onSend: (personIds: string[]) => Promise<void>;
  isPending: boolean;
}) {
  const t = useLivesT();
  const { data: persons, isLoading } = useMyPersons();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const list = persons ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((p) => p.displayName.toLowerCase().includes(q));
  }, [persons, query]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function send() {
    if (selected.size === 0) return;
    try {
      await onSend([...selected]);
      toast.success(t('inviteSent'));
      setSelected(new Set());
    } catch {
      toast.error(t('inviteFailed'));
    }
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal/40" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('inviteSearchFamily')}
          className="pl-9"
        />
      </div>

      <div className="max-h-64 space-y-1 overflow-y-auto">
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

      <Button
        onClick={send}
        disabled={isPending || selected.size === 0}
        className="w-full"
      >
        {isPending
          ? t('inviteSending')
          : `${t('inviteSend')}${selected.size > 0 ? ` · ${selected.size} ${t('inviteSelected')}` : ''}`}
      </Button>
    </div>
  );
}

/* ------------------------------ Link ------------------------------ */

function LinkInvite({
  joinUrl,
  code,
  generating,
  onGenerate,
}: {
  joinUrl: string | null;
  code: string | null;
  generating: boolean;
  onGenerate: () => void;
}) {
  const t = useLivesT();
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!joinUrl) return;
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      toast.success(t('inviteCopied'));
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t('inviteFailed'));
    }
  }

  async function share() {
    if (!joinUrl) return;
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({ url: joinUrl, title: 'Origin' });
      } catch {
        /* user dismissed — ignore */
      }
    } else {
      void copy();
    }
  }

  function shareWhatsapp() {
    if (!joinUrl) return;
    const text = `${t('inviteShareMessage')} ${joinUrl}`;
    window.open(
      `https://wa.me/?text=${encodeURIComponent(text)}`,
      '_blank',
      'noopener,noreferrer',
    );
  }

  // No code yet: we auto-generate on open, but expose an explicit action too.
  if (!joinUrl || !code) {
    return (
      <div className="flex flex-col items-center gap-3 py-8">
        {generating ? (
          <p className="flex items-center gap-2 text-sm text-charcoal/60">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('inviteGenerating')}
          </p>
        ) : (
          <Button onClick={onGenerate}>
            <QrCode className="h-4 w-4" />
            {t('inviteGenerateLink')}
          </Button>
        )}
      </div>
    );
  }

  // QR rendered via a stateless image endpoint; see INTEGRATION NEEDED to swap
  // for a bundled generator if external calls are undesirable.
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=8&data=${encodeURIComponent(joinUrl)}`;

  return (
    <div className="flex flex-col items-center gap-4 py-2">
      <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-charcoal/10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={qrSrc}
          alt={t('inviteScanHint')}
          width={180}
          height={180}
          className="h-44 w-44"
        />
      </div>
      <p className="text-xs text-charcoal/50">{t('inviteScanHint')}</p>

      <div className="flex w-full items-center gap-2 rounded-lg border border-[var(--input)] bg-sand/50 px-3 py-2">
        <span className="min-w-0 flex-1 truncate text-sm text-charcoal/70">
          {joinUrl}
        </span>
      </div>

      <button
        type="button"
        onClick={shareWhatsapp}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#1ebe5b]"
      >
        <MessageCircle className="h-4 w-4" />
        {t('inviteWhatsapp')}
      </button>

      <div className="grid w-full grid-cols-2 gap-2">
        <Button variant="outline" onClick={copy}>
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? t('inviteCopied') : t('inviteCopyLink')}
        </Button>
        <Button variant="outline" onClick={share}>
          <Share2 className="h-4 w-4" />
          {t('inviteShare')}
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------ Phone ----------------------------- */

function PhoneInvite({
  onSend,
  isPending,
}: {
  onSend: (phoneNumbers: string[]) => Promise<void>;
  isPending: boolean;
}) {
  const t = useLivesT();
  const [value, setValue] = useState('');
  const [numbers, setNumbers] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  function add() {
    const candidate = value.replace(/[\s-]/g, '');
    if (!isValidPhone(candidate)) {
      setError(t('invitePhoneInvalid'));
      return;
    }
    if (!numbers.includes(candidate)) setNumbers((prev) => [...prev, candidate]);
    setValue('');
    setError(null);
  }

  async function send() {
    if (numbers.length === 0) {
      setError(t('invitePhoneEmpty'));
      return;
    }
    try {
      await onSend(numbers);
      toast.success(t('inviteSent'));
      setNumbers([]);
    } catch {
      toast.error(t('inviteFailed'));
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-2">
        <div className="flex-1 space-y-1.5">
          <label
            htmlFor="invite-phone"
            className="text-sm font-medium text-charcoal"
          >
            {t('invitePhoneLabel')}
          </label>
          <Input
            id="invite-phone"
            type="tel"
            inputMode="tel"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                add();
              }
            }}
            placeholder={t('invitePhonePlaceholder')}
          />
        </div>
        <Button type="button" variant="outline" onClick={add}>
          {t('invitePhoneAdd')}
        </Button>
      </div>

      {error && (
        <p className="text-sm font-medium text-[var(--destructive)]">{error}</p>
      )}

      {numbers.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {numbers.map((n) => (
            <li
              key={n}
              className="flex items-center gap-1 rounded-full bg-sand px-3 py-1 text-sm text-charcoal"
            >
              {n}
              <button
                type="button"
                aria-label={t('close')}
                onClick={() =>
                  setNumbers((prev) => prev.filter((x) => x !== n))
                }
                className="text-charcoal/50 hover:text-charcoal"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Button
        onClick={send}
        disabled={isPending || numbers.length === 0}
        className="w-full"
      >
        {isPending ? t('inviteSending') : t('inviteSend')}
      </Button>
    </div>
  );
}
