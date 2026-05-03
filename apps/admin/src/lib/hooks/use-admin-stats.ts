'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { AdminDashboardKpis, AdminGrowthPoint } from '@origin/shared-types';
import {
  getKpis,
  getGrowth,
  getRecentActivity,
  getTopContributors,
  getGeoDistribution,
  getHealth,
  type RecentActivityResponse,
  type TopContributorsResponse,
  type TopContributorsParams,
  type GeoDistributionResponse,
  type HealthResponse,
} from '@/lib/api/admin-stats';

const STALE = 60_000;

export function useKpis(): UseQueryResult<AdminDashboardKpis, Error> {
  return useQuery<AdminDashboardKpis, Error>({
    queryKey: ['admin', 'analytics', 'kpis'],
    queryFn: getKpis,
    staleTime: STALE,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
}

export function useGrowth(days: number): UseQueryResult<AdminGrowthPoint[], Error> {
  return useQuery<AdminGrowthPoint[], Error>({
    queryKey: ['admin', 'analytics', 'growth', days],
    queryFn: () => getGrowth(days),
    staleTime: STALE,
  });
}

export function useRecentActivity(limit = 20): UseQueryResult<RecentActivityResponse, Error> {
  return useQuery<RecentActivityResponse, Error>({
    queryKey: ['admin', 'analytics', 'recent-activity', limit],
    queryFn: () => getRecentActivity(limit),
    staleTime: STALE,
  });
}

export function useTopContributors(
  opts: TopContributorsParams = {},
): UseQueryResult<TopContributorsResponse, Error> {
  const { limit = 10, days = 30 } = opts;
  return useQuery<TopContributorsResponse, Error>({
    queryKey: ['admin', 'analytics', 'top-contributors', limit, days],
    queryFn: () => getTopContributors({ limit, days }),
    staleTime: STALE,
  });
}

export function useGeoDistribution(): UseQueryResult<GeoDistributionResponse, Error> {
  return useQuery<GeoDistributionResponse, Error>({
    queryKey: ['admin', 'analytics', 'geo-distribution'],
    queryFn: getGeoDistribution,
    staleTime: STALE,
  });
}

export function useHealth(): UseQueryResult<HealthResponse, Error> {
  return useQuery<HealthResponse, Error>({
    queryKey: ['admin', 'analytics', 'health'],
    queryFn: getHealth,
    staleTime: STALE,
    refetchInterval: 15_000,
  });
}
