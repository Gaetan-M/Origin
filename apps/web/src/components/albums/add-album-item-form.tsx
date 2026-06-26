'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAddAlbumItem } from '@/lib/hooks/use-albums';
import { useLmT } from '@/lib/living-memory-i18n';

interface AddAlbumItemFormProps {
  albumId: string;
  onDone?: () => void;
}

const ACCEPTED = 'image/jpeg,image/png,image/webp';
const MAX_SIZE = 15 * 1024 * 1024; // 15 MB

export function AddAlbumItemForm({ albumId, onDone }: AddAlbumItemFormProps) {
  const t = useLmT();
  const inputRef = useRef<HTMLInputElement>(null);
  const addItem = useAddAlbumItem(albumId);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [takenAt, setTakenAt] = useState('');
  const [takenAtText, setTakenAtText] = useState('');

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;
    if (selected.size > MAX_SIZE) return;
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  }

  function reset() {
    setFile(null);
    setPreview(null);
    setCaption('');
    setTakenAt('');
    setTakenAtText('');
    if (inputRef.current) inputRef.current.value = '';
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    await addItem.mutateAsync({
      file,
      caption: caption.trim() || null,
      takenAt: takenAt || null,
      takenAtText: takenAtText.trim() || null,
    });
    reset();
    onDone?.();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        className="hidden"
        onChange={handleFileChange}
      />

      {preview ? (
        <div className="relative mx-auto w-fit">
          <Image
            src={preview}
            alt="preview"
            width={240}
            height={240}
            unoptimized
            className="max-h-60 w-auto rounded-lg object-cover"
          />
          <button
            type="button"
            onClick={reset}
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
          className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[var(--input)] py-10 text-charcoal/50 transition-colors hover:border-forest hover:text-forest"
        >
          <ImagePlus className="h-8 w-8" />
          <span className="text-sm font-medium">{t('albums.item.choosePhoto')}</span>
        </button>
      )}

      {file && (
        <>
          <div className="space-y-2">
            <Label htmlFor="item-caption">{t('albums.item.caption')}</Label>
            <Input
              id="item-caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder={t('albums.item.captionPlaceholder')}
              maxLength={500}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="item-date">{t('albums.item.takenAt')}</Label>
              <Input
                id="item-date"
                type="date"
                value={takenAt}
                onChange={(e) => setTakenAt(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-date-text">{t('albums.item.takenAtText')}</Label>
              <Input
                id="item-date-text"
                value={takenAtText}
                onChange={(e) => setTakenAtText(e.target.value)}
                placeholder={t('albums.item.takenAtTextPlaceholder')}
                maxLength={100}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={addItem.isPending}>
              {addItem.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('albums.item.uploading')}
                </>
              ) : (
                t('albums.item.save')
              )}
            </Button>
          </div>
        </>
      )}
    </form>
  );
}
