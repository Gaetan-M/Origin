'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as relApi from '@/lib/api/relationships';
import type { CreateParentChildDto, CreateUnionDto } from '@origin/shared-types';

export function useParents(personId: string | undefined) {
  return useQuery({
    queryKey: ['relationships', 'parents', personId],
    queryFn: () => relApi.getParents(personId!),
    enabled: !!personId,
  });
}

export function useChildren(personId: string | undefined) {
  return useQuery({
    queryKey: ['relationships', 'children', personId],
    queryFn: () => relApi.getChildren(personId!),
    enabled: !!personId,
  });
}

export function useSiblings(personId: string | undefined) {
  return useQuery({
    queryKey: ['relationships', 'siblings', personId],
    queryFn: () => relApi.getSiblings(personId!),
    enabled: !!personId,
  });
}

export function useSpouses(personId: string | undefined) {
  return useQuery({
    queryKey: ['relationships', 'spouses', personId],
    queryFn: () => relApi.getSpouses(personId!),
    enabled: !!personId,
  });
}

export function useCreateParentChild() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateParentChildDto) => relApi.createParentChild(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['relationships'] });
      queryClient.invalidateQueries({ queryKey: ['familyTree'] });
      toast.success('Lien de parente ajoute !');
    },
  });
}

export function useDeleteParentChild() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => relApi.deleteParentChild(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['relationships'] });
      queryClient.invalidateQueries({ queryKey: ['familyTree'] });
    },
  });
}

export function useCreateUnion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateUnionDto) => relApi.createUnion(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['relationships'] });
      queryClient.invalidateQueries({ queryKey: ['familyTree'] });
      toast.success('Union ajoutee !');
    },
  });
}
