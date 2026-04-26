'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as personsApi from '@/lib/api/persons';
import type { CreatePersonDto, UpdatePersonDto } from '@origin/shared-types';

export function useMyPersons() {
  return useQuery({
    queryKey: ['persons', 'mine'],
    queryFn: () => personsApi.getMyPersons(),
  });
}

export function usePerson(id: string | undefined) {
  return useQuery({
    queryKey: ['persons', id],
    queryFn: () => personsApi.getPerson(id!),
    enabled: !!id,
  });
}

export function useCreatePerson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreatePersonDto) => personsApi.createPerson(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['persons'] });
      toast.success('Personne ajoutee avec succes !');
    },
  });
}

export function useUpdatePerson(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: UpdatePersonDto) => personsApi.updatePerson(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['persons', id] });
      queryClient.invalidateQueries({ queryKey: ['familyTree'] });
      toast.success('Modifications enregistrees !');
    },
  });
}

export function useDeletePerson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => personsApi.deletePerson(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['persons'] });
      queryClient.invalidateQueries({ queryKey: ['familyTree'] });
      toast.success('Personne supprimee');
    },
  });
}

export function useFamilyTree(personId: string | undefined, degrees = 2) {
  return useQuery({
    queryKey: ['familyTree', personId, degrees],
    queryFn: () => personsApi.getFamilyTree(personId!, degrees),
    enabled: !!personId,
  });
}
