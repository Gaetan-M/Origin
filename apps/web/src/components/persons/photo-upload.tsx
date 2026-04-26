'use client';

import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { uploadPersonPhoto } from '@/lib/api/media';
import { ApiError } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Camera, Loader2 } from 'lucide-react';
import Image from 'next/image';

interface PhotoUploadProps {
  personId: string;
}

const ACCEPTED = 'image/jpeg,image/png,image/webp';
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

export function PhotoUpload({ personId }: PhotoUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const upload = useMutation({
    mutationFn: (file: File) => uploadPersonPhoto(file, personId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['persons', personId] });
      toast.success('Photo ajoutee !');
      setPreview(null);
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : undefined;
      toast.error(msg ?? "Impossible d'envoyer la photo.");
      setPreview(null);
    },
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_SIZE) {
      toast.error('La photo ne doit pas depasser 5 Mo.');
      return;
    }

    const url = URL.createObjectURL(file);
    setPreview(url);
    upload.mutate(file);
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        className="hidden"
        onChange={handleFileChange}
      />

      {preview && (
        <Image
          src={preview}
          alt="Apercu"
          width={96}
          height={96}
          className="h-24 w-24 rounded-full object-cover border-2 border-forest/30"
          unoptimized
        />
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={() => inputRef.current?.click()}
        disabled={upload.isPending}
      >
        {upload.isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Envoi...
          </>
        ) : (
          <>
            <Camera className="mr-2 h-4 w-4" />
            Ajouter une photo
          </>
        )}
      </Button>
    </div>
  );
}
