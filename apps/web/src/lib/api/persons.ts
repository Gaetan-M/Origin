import type { Person, FamilyTree, CreatePersonDto, UpdatePersonDto } from '@origin/shared-types';
import { apiClient } from './client';

export async function getMyPersons(): Promise<Person[]> {
  // Backend now returns { data, meta } for pagination. We fetch the first page
  // (default 50 items) and unwrap. Callers needing more should use cursoring.
  const { data } = await apiClient<{ data: Person[]; meta?: unknown } | Person[]>(
    '/persons/mine',
  );
  if (Array.isArray(data)) return data;
  return data.data ?? [];
}

export async function createPerson(dto: CreatePersonDto): Promise<Person> {
  const { data } = await apiClient<Person>('/persons', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
  return data;
}

export async function getPerson(id: string): Promise<Person> {
  const { data } = await apiClient<Person>(`/persons/${id}`);
  return data;
}

export async function updatePerson(id: string, dto: UpdatePersonDto): Promise<Person> {
  const { data } = await apiClient<Person>(`/persons/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(dto),
  });
  return data;
}

export async function deletePerson(id: string): Promise<void> {
  await apiClient(`/persons/${id}`, { method: 'DELETE' });
}

export async function getFamilyTree(personId: string, degrees = 2): Promise<FamilyTree> {
  const { data } = await apiClient<FamilyTree>(`/persons/${personId}/family-tree?degrees=${degrees}`);
  return data;
}
