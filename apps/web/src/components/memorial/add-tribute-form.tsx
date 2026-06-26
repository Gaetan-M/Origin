'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { Flame, ImagePlus, Loader2, MessageSquareHeart, Video, X } from 'lucide-react';
import { VisibilityScope } from '@origin/shared-types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { VisibilitySelect } from '@/components/albums/visibility-select';
import { useAddTribute } from '@/lib/hooks/use-memorial';
import type { MemorialTributeKind } from '@/lib/api/memorial';
import { useLmT } from '@/lib/living-memory-i18n';

interface AddTributeFormProps {
  personId: string;
  onDone?: () => void;
}

const TABS: { kind: MemorialTributeKind; icon: typeof Flame; key: string }[] = [
  { kind: 'CANDLE', icon: Flame, key: 'memorial.add.candle' },
  { kind: 'MESSAGE', icon: MessageSquareHeart, key: 'memorial.add.message' },
  { kind: 'PHOTO', icon: ImagePlus, key: 'memorial.add.photo' },
  { kind: 'VIDEO', icon: Video, key: 'memorial.add.video' },
];

export function AddTributeForm({ personId, onDone }: AddTributeFormProps) {
  const t = useLmT();
  const addTribute = useAddTribute(personId);
  const inputRef = useRef<HTMLInputElement>(null);

  const [kind, setKind] = useState<MemorialTributeKind>('CANDLE');
  const [message, setMessage] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<VisibilityScope>(VisibilityScope.FAMILY);

  const needsMedia = kind === 'PHOTO' || kind === 'VIDEO';
  const accept = kind === 'VIDEO' ? 'video/mp4,video/webm,video/quicktime' : 'image/jpeg,image/png,image/webp';

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  }

  function clearFile() {
    setFile(null);
    setPreview(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  function switchKind(next: MemorialTributeKind) {
    setKind(next);
    clearFile();
  }

  const canSubmit =
    kind === 'CANDLE' ||
    (kind === 'MESSAGE' && message.trim().length > 0) ||
    (needsMedia && !!file);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    await addTribute.mutateAsync({
      kind,
      message: message.trim() || null,
      file: needsMedia ? file : null,
      visibilityScope: visibility,
    });
    setMessage('');
    clearFile();
    onDone?.();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border bg-white p-5 shadow-card">
      <h3 className="font-serif text-lg text-charcoal">{t('memorial.add.title')}</h3>

      <div className="grid grid-cols-4 gap-2">
        {TABS.map(({ kind: k, icon: Icon, key }) => {
          const active = kind === k;
          return (
            <button
              key={k}
              type="button"
              onClick={() => switchKind(k)}
              aria-pressed={active}
              className={cn(
                'flex flex-col items-center gap-1.5 rounded-lg border px-2 py-3 text-xs font-medium transition-colors',
                active
                  ? 'border-ochre bg-ochre/10 text-ochre-dark'
                  : 'border-[var(--input)] text-charcoal/55 hover:bg-sand',
              )}
            >
              <Icon className="h-5 w-5" />
              {t(key)}
            </button>
          );
        })}
      </div>

      {kind !== 'CANDLE' && (
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t('memorial.add.messagePlaceholder')}
          rows={3}
          className="flex w-full rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2 text-sm placeholder:text-[var(--muted-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
        />
      )}

      {needsMedia && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={handleFileChange}
          />
          {preview ? (
            <div className="relative w-fit">
              {kind === 'PHOTO' ? (
                <Image
                  src={preview}
                  alt="preview"
                  width={200}
                  height={200}
                  unoptimized
                  className="max-h-48 w-auto rounded-lg object-cover"
                />
              ) : (
                <video src={preview} controls className="max-h-48 rounded-lg" />
              )}
              <button
                type="button"
                onClick={clearFile}
                className="absolute -right-2 -top-2 rounded-full bg-charcoal p-1 text-white shadow"
                aria-label={t('common.cancel')}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[var(--input)] py-8 text-charcoal/50 transition-colors hover:border-ochre hover:text-ochre-dark"
            >
              <ImagePlus className="h-7 w-7" />
              <span className="text-sm font-medium">
                {kind === 'VIDEO' ? t('memorial.add.chooseVideo') : t('memorial.add.choosePhoto')}
              </span>
            </button>
          )}
        </>
      )}

      <VisibilitySelect value={visibility} onChange={setVisibility} />

      <div className="flex justify-end">
        <Button type="submit" disabled={!canSubmit || addTribute.isPending}>
          {addTribute.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('memorial.add.submitting')}
            </>
          ) : kind === 'CANDLE' ? (
            <>
              <Flame className="mr-2 h-4 w-4" />
              {t('memorial.lightCandle')}
            </>
          ) : (
            t('memorial.add.submit')
          )}
        </Button>
      </div>
    </form>
  );
}
