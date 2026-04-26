import type { Person } from '@origin/shared-types';
import { apiClient } from './client';

export interface SearchParams {
  name?: string;
  birthYear?: number;
  village?: string;
  parentName?: string;
}

export type MatchAction = 'auto_match' | 'suggest' | 'ignore';

export interface ScoredMatch {
  person: Person;
  score: number;
  action: MatchAction;
}

export interface SearchResult {
  query: SearchParams;
  matches: ScoredMatch[];
  total: number;
}

/**
 * Simplified helper that returns only the Person entities. Use when you
 * just need a picker list and do not care about the score / action.
 */
export async function searchPersons(params: SearchParams): Promise<Person[]> {
  const { data } = await apiClient<SearchResult>('/matching/search', {
    method: 'POST',
    body: JSON.stringify(params),
  });
  return data.matches.filter((m) => m.person != null).map((m) => m.person);
}

/**
 * Full response with score + action. Use this from the onboarding flow so
 * we can tell "very likely you" (auto_match) from "maybe you" (suggest).
 */
export async function searchPersonsScored(
  params: SearchParams,
): Promise<SearchResult> {
  const { data } = await apiClient<SearchResult>('/matching/search', {
    method: 'POST',
    body: JSON.stringify(params),
  });
  return data;
}

export async function findDuplicates(personId: string): Promise<Person[]> {
  const { data } = await apiClient<Person[]>(`/matching/duplicates/${personId}`);
  return data;
}

export interface MatchSuggestion {
  id: string;
  status: string;
  matchScore: number;
  matchingSignals: Record<string, number> | null;
  ghost: {
    id: string;
    displayName: string;
    birthYearApproximate: number | null;
    villageOrigin: string | null;
  };
  candidate: {
    id: string;
    displayName: string;
    birthYearApproximate: number | null;
    villageOrigin: string | null;
  };
  resolvedAt: string | null;
  createdAt: string;
}

export async function getMatchSuggestion(proposalId: string): Promise<MatchSuggestion> {
  const { data } = await apiClient<MatchSuggestion>(`/matching/suggestions/${proposalId}`);
  return data;
}

export async function resolveMatchSuggestion(
  proposalId: string,
  decision: 'accept' | 'reject',
): Promise<unknown> {
  const { data } = await apiClient(`/matching/suggestions/${proposalId}/resolve`, {
    method: 'POST',
    body: JSON.stringify({ decision }),
  });
  return data;
}
