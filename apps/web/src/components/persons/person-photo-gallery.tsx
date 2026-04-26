'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  listPersonPhotos,
  uploadPersonPhoto,
  updatePhotoMetadata,
  getMediaFileUrl,
  type PersonPhoto,
} from '@/lib/api/media';
import { ApiError } from '@/lib/api/client';
import { Input } from '@/components/ui/input';
import { Camera, Loader2, Star, ZoomIn, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PersonPhotoGalleryProps {
  personId: string;
  personName: string;
  enabled?: boolean;
}

/**
 * Photo gallery for a person: big hero photo on top, scrollable strip of
 * historical shots below with inline year editing. Embeddable — no modal
 * chrome of its own so it can live inside a sheet, a dialog, or a page.
 */
export function PersonPhotoGallery({ personId, personName, enabled = true }: PersonPhotoGalleryProps) {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoomed, setZoomed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const photosQuery = useQuery({
    queryKey: ['person-photos', personId],
    queryFn: () => listPersonPhotos(personId),
    enabled: enabled && !!personId,
  });
  const photos = photosQuery.data ?? [];

  useEffect(() => {
    setSelectedId(null);
    setZoomed(false);
  }, [personId]);

  const displayed = useMemo(
    () =>
      photos.find((p) => p.id === selectedId) ??
      photos.find((p) => p.isPrimary) ??
      photos[0] ??
      null,
    [photos, selectedId],
  );

  const uploadMutation = useMutation({
    mutationFn: (file: File) =>
      uploadPersonPhoto(file, personId, { setAsPrimary: photos.length === 0 }),
    onSuccess: (res) => {
      setSelectedId(res.id);
      queryClient.invalidateQueries({ queryKey: ['person-photos', personId] });
      queryClient.invalidateQueries({ queryKey: ['persons', personId] });
      queryClient.invalidateQueries({ queryKey: ['family-tree'] });
      toast.success('Photo ajoutee !');
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : undefined;
      toast.error(msg ?? "Impossible d'envoyer la photo.");
    },
  });

  const yearMutation = useMutation({
    mutationFn: (dto: { mediaId: string; photoYear: number | null }) =>
      updatePhotoMetadata(dto.mediaId, { photoYear: dto.photoYear }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['person-photos', personId] });
    },
    onError: () => {
      toast.error("Impossible d'enregistrer l'annee.");
    },
  });

  const primaryMutation = useMutation({
    mutationFn: (mediaId: string) => updatePhotoMetadata(mediaId, { setAsPrimary: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['person-photos', personId] });
      queryClient.invalidateQueries({ queryKey: ['persons', personId] });
      queryClient.invalidateQueries({ queryKey: ['family-tree'] });
      toast.success('Photo principale mise a jour.');
    },
  });

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadMutation.mutate(file);
    e.target.value = '';
  }

  return (
    <div className="space-y-4">
      {/* Hero: moderately sized frame with a refined inner shadow */}
      <div className="group relative mx-auto w-full max-w-md">
        <button
          type="button"
          onClick={() => displayed && setZoomed((v) => !v)}
          className={cn(
            'relative flex w-full items-center justify-center overflow-hidden rounded-xl bg-gradient-to-b from-sand/30 to-sand/10 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.04)] transition',
            zoomed ? 'max-h-[55vh]' : 'h-56 sm:h-64',
            displayed ? 'cursor-zoom-in hover:shadow-md' : 'cursor-default',
          )}
        >
          {photosQuery.isLoading ? (
            <Loader2 className="h-6 w-6 animate-spin text-charcoal/40" />
          ) : displayed ? (
            <img
              src={getMediaFileUrl(displayed.id)}
              alt={personName}
              className="h-full w-full object-contain"
            />
          ) : (
            <div className="flex flex-col items-center gap-2 px-6 py-8 text-center">
              <Camera className="h-7 w-7 text-charcoal/30" />
              <p className="text-sm text-charcoal/50">
                Aucune photo pour {personName}
              </p>
            </div>
          )}

          {displayed && (
            <>
              <span className="pointer-events-none absolute right-2 top-2 rounded-full bg-black/45 p-1.5 text-white opacity-0 backdrop-blur-sm transition group-hover:opacity-100">
                <ZoomIn className="h-3.5 w-3.5" />
              </span>
              {displayed.photoYear != null && (
                <span className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-charcoal/75 px-3 py-0.5 text-xs font-medium text-white shadow-sm backdrop-blur-sm">
                  {displayed.photoYear}
                </span>
              )}
            </>
          )}
        </button>
      </div>

      {/* Gallery strip */}
      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-charcoal/50">
            Galerie · {photos.length} {photos.length > 1 ? 'photos' : 'photo'}
          </p>
          {uploadMutation.isPending && (
            <span className="inline-flex items-center gap-1 text-xs text-charcoal/50">
              <Loader2 className="h-3 w-3 animate-spin" />
              Envoi…
            </span>
          )}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {photos.map((p) => (
            <Thumbnail
              key={p.id}
              photo={p}
              isDisplayed={displayed?.id === p.id}
              onClick={() => {
                setSelectedId(p.id);
                setZoomed(false);
              }}
              onSaveYear={(year) =>
                yearMutation.mutate({ mediaId: p.id, photoYear: year })
              }
              onSetPrimary={() => primaryMutation.mutate(p.id)}
            />
          ))}

          {/* Inline "add" tile — consistent with thumbnail size */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadMutation.isPending}
            className="flex h-14 w-14 shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg border-2 border-dashed border-sand text-charcoal/40 transition hover:border-forest/60 hover:bg-forest/5 hover:text-forest disabled:opacity-50"
            title="Ajouter une photo"
          >
            <Plus className="h-4 w-4" />
            <span className="text-[9px] font-medium uppercase tracking-wider">Ajouter</span>
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleUpload}
        />
      </div>
    </div>
  );
}

interface ThumbnailProps {
  photo: PersonPhoto;
  isDisplayed: boolean;
  onClick: () => void;
  onSaveYear: (year: number | null) => void;
  onSetPrimary: () => void;
}

function Thumbnail({ photo, isDisplayed, onClick, onSaveYear, onSetPrimary }: ThumbnailProps) {
  const [yearInput, setYearInput] = useState(photo.photoYear?.toString() ?? '');

  useEffect(() => {
    setYearInput(photo.photoYear?.toString() ?? '');
  }, [photo.photoYear]);

  function commit() {
    const prev = photo.photoYear ?? null;
    if (yearInput === '') {
      if (prev !== null) onSaveYear(null);
      return;
    }
    const parsed = Number(yearInput);
    if (Number.isNaN(parsed) || parsed < 1800 || parsed > 2100) {
      setYearInput(prev?.toString() ?? '');
      return;
    }
    if (parsed !== prev) onSaveYear(parsed);
  }

  return (
    <div className="group/thumb flex shrink-0 flex-col items-center gap-1">
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'relative h-14 w-14 overflow-hidden rounded-lg border-2 transition-all',
          isDisplayed
            ? 'border-forest shadow-sm ring-2 ring-forest/25'
            : 'border-transparent shadow-sm hover:border-forest/40 hover:shadow-md',
        )}
      >
        <img
          src={getMediaFileUrl(photo.id)}
          alt=""
          className="h-full w-full object-cover transition-transform duration-200 group-hover/thumb:scale-105"
        />
        {photo.isPrimary && (
          <span
            className="absolute left-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-ochre text-white shadow"
            title="Photo principale"
          >
            <Star className="h-2.5 w-2.5 fill-white" strokeWidth={0} />
          </span>
        )}
        {!photo.isPrimary && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSetPrimary();
            }}
            className="absolute inset-0 flex items-center justify-center bg-charcoal/55 text-[10px] font-medium uppercase tracking-wider text-white opacity-0 transition group-hover/thumb:opacity-100"
            title="Definir comme photo principale"
          >
            Principale
          </button>
        )}
      </button>
      <Input
        value={yearInput}
        onChange={(e) => setYearInput(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        }}
        placeholder="Annee"
        className="h-6 w-14 rounded-md border-sand bg-white text-center text-[10px] tracking-wide"
      />
    </div>
  );
}
