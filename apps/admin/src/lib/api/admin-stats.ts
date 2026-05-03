import type { AdminDashboardKpis, AdminGrowthPoint } from '@origin/shared-types';
import { apiClient } from '@/lib/api/client';

export interface RecentActivityItem {
  id: string;
  accountId: string;
  phoneNumberMasked: string;
  entityType: string;
  entityId: string;
  action: string;
  fieldName: string | null;
  createdAt: string;
  personDisplayName?: string | null;
}

export interface RecentActivityResponse {
  items: RecentActivityItem[];
}

export interface TopContributorItem {
  accountId: string;
  phoneNumberMasked: string;
  fullName: string | null;
  contributionCount: number;
  role: string;
}

export interface TopContributorsResponse {
  items: TopContributorItem[];
}

export interface GeoBucket {
  country?: string;
  village?: string;
  region?: string;
  count: number;
}

export interface GeoDistributionResponse {
  byBirthCountry: { country: string; count: number }[];
  byVillage: { village: string; count: number }[];
  byRegion: { region: string; count: number }[];
}

export type HealthStatus = 'ok' | 'degraded' | 'down';

export interface HealthResponse {
  status: HealthStatus;
  checks: {
    database: 'ok' | 'degraded' | 'down';
    mediaStorage: 'ok' | 'degraded' | 'down';
    uptimeSeconds: number;
  };
}

export interface TopContributorsParams {
  limit?: number;
  days?: number;
}

export async function getKpis(): Promise<AdminDashboardKpis> {
  const { data } = await apiClient<AdminDashboardKpis>('/admin/analytics/kpis');
  return data;
}

export async function getGrowth(days = 30): Promise<AdminGrowthPoint[]> {
  const { data } = await apiClient<AdminGrowthPoint[]>(
    `/admin/analytics/growth?days=${days}`,
  );
  return data;
}

export async function getRecentActivity(limit = 20): Promise<RecentActivityResponse> {
  const { data } = await apiClient<RecentActivityResponse>(
    `/admin/analytics/recent-activity?limit=${limit}`,
  );
  return data;
}

export async function getTopContributors(
  params: TopContributorsParams = {},
): Promise<TopContributorsResponse> {
  const { limit = 10, days = 30 } = params;
  const { data } = await apiClient<TopContributorsResponse>(
    `/admin/analytics/top-contributors?limit=${limit}&days=${days}`,
  );
  return data;
}

export async function getGeoDistribution(): Promise<GeoDistributionResponse> {
  const { data } = await apiClient<GeoDistributionResponse>(
    '/admin/analytics/geo-distribution',
  );
  return data;
}

export async function getHealth(): Promise<HealthResponse> {
  const { data } = await apiClient<HealthResponse>('/admin/analytics/health');
  return data;
}
