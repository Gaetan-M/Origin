'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { VisibilityScope } from '@origin/shared-types';
import { Loader2 } from 'lucide-react';
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
import { VisibilitySelect } from './visibility-select';
import { useCreateAlbum } from '@/lib/hooks/use-albums';
import type { AlbumKind } from '@/lib/api/albums';
import { useLmT } from '@/lib/living-memory-i18n';

interface CreateAlbumFormProps {
  /** Pre-bind the album to a person (e.g. opened from a profile). */
  subjectPersonId?: string;
  onCreated?: (albumId: string) => void;
}

const KINDS: AlbumKind[] = ['PERSONAL', 'FAMILY', 'EVENT'];

export function CreateAlbumForm({ subjectPersonId, onCreated }: CreateAlbumFormProps) {
  const t = useLmT();
  const router = useRouter();
  const createAlbum = useCreateAlbum();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [kind, setKind] = useState<AlbumKind>('PERSONAL');
  const [visibility, setVisibility] = useState<VisibilityScope>(
    VisibilityScope.PRIVATE_SELF,
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const album = await createAlbum.mutateAsync({
      title: title.trim(),
      description: description.trim() || null,
      kind,
      subjectPersonId: subjectPersonId ?? null,
      visibilityScope: visibility,
    });
    if (onCreated) onCreated(album.id);
    else router.push(`/albums/${album.id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="album-title">{t('albums.form.title')}</Label>
        <Input
          id="album-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t('albums.form.titlePlaceholder')}
          maxLength={200}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="album-desc">{t('albums.form.description')}</Label>
        <textarea
          id="album-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t('albums.form.descriptionPlaceholder')}
          rows={3}
          className="flex w-full rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2 text-sm ring-offset-[var(--background)] placeholder:text-[var(--muted-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
        />
      </div>

      <div className="space-y-2">
        <Label>{t('albums.form.kind')}</Label>
        <Select value={kind} onValueChange={(v) => setKind(v as AlbumKind)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {KINDS.map((k) => (
              <SelectItem key={k} value={k}>
                {t(`albums.kind.${k}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <VisibilitySelect value={visibility} onChange={setVisibility} />

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={createAlbum.isPending || !title.trim()}>
          {createAlbum.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('albums.form.creating')}
            </>
          ) : (
            t('albums.form.submit')
          )}
        </Button>
      </div>
    </form>
  );
}
