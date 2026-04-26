import type { ParentChild, Union, Person, CreateParentChildDto, CreateUnionDto } from '@origin/shared-types';
import { apiClient } from './client';

export async function createParentChild(dto: CreateParentChildDto): Promise<ParentChild> {
  const { data } = await apiClient<ParentChild>('/relationships/parent-child', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
  return data;
}

export async function deleteParentChild(id: string): Promise<void> {
  await apiClient(`/relationships/parent-child/${id}`, { method: 'DELETE' });
}

export async function createUnion(dto: CreateUnionDto): Promise<Union> {
  const { data } = await apiClient<Union>('/relationships/unions', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
  return data;
}

export async function deleteUnion(id: string): Promise<void> {
  await apiClient(`/relationships/unions/${id}`, { method: 'DELETE' });
}

export async function updateUnion(id: string, dto: Partial<CreateUnionDto>): Promise<Union> {
  const { data } = await apiClient<Union>(`/relationships/unions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(dto),
  });
  return data;
}

export async function addUnionPartner(unionId: string, dto: { personId: string; role?: string; wifeRank?: number }): Promise<void> {
  await apiClient(`/relationships/unions/${unionId}/partners`, {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}

export async function removeUnionPartner(unionId: string, partnerId: string): Promise<void> {
  await apiClient(`/relationships/unions/${unionId}/partners/${partnerId}`, { method: 'DELETE' });
}

interface ParentChildRecord {
  parent?: Person;
  child?: Person;
}

export async function getParents(personId: string): Promise<Person[]> {
  const { data } = await apiClient<ParentChildRecord[]>(`/relationships/parents/${personId}`);
  return data.map((r) => r.parent).filter((p): p is Person => p != null);
}

export async function getChildren(personId: string): Promise<Person[]> {
  const { data } = await apiClient<ParentChildRecord[]>(`/relationships/children/${personId}`);
  return data.map((r) => r.child).filter((p): p is Person => p != null);
}

export async function getSiblings(personId: string): Promise<Person[]> {
  const { data } = await apiClient<ParentChildRecord[]>(`/relationships/siblings/${personId}`);
  return data.map((r) => r.child).filter((p): p is Person => p != null);
}

export async function getSpouses(personId: string): Promise<Person[]> {
  const { data } = await apiClient<Person[]>(`/relationships/spouses/${personId}`);
  return data;
}

export async function getAllUnions(personId: string): Promise<Union[]> {
  const { data } = await apiClient<Union[]>(`/relationships/all-unions/${personId}`);
  return data;
}
