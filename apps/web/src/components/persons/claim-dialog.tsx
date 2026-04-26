'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { createClaim } from '@/lib/api/claims';
import { ApiError } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { UserCheck } from 'lucide-react';

interface ClaimDialogProps {
  personId: string;
  personName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClaimDialog({ personId, personName, open, onOpenChange }: ClaimDialogProps) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => createClaim({ personId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claims'] });
      queryClient.invalidateQueries({ queryKey: ['persons', personId] });
      toast.success('Profil revendique !');
      onOpenChange(false);
    },
    onError: (err) => {
      if (err instanceof ApiError && err.statusCode === 409) {
        toast.error('Tu as deja revendique un autre profil. Un seul profil par compte.');
      } else {
        toast.error('Impossible de revendiquer cette personne.');
      }
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-forest" />
            C&apos;est moi
          </DialogTitle>
          <DialogDescription>
            Tu confirmes que <span className="font-medium">{personName}</span> c&apos;est toi ?
            Ton arbre sera centre sur ce profil.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Annuler</Button>
          </DialogClose>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? 'Confirmation...' : 'Oui, c\'est moi'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
