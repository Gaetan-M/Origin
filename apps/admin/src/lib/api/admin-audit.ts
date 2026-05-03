import type { AdminAuditLog, AdminActionSeverity } from '@origin/shared-types';
import { apiClient } from '@/lib/api/client';

export interface AuditActorPreview {
  id: string;
  phoneNumberMasked: string;
  fullName: string | null;
  role: string;
}

export interface AuditLogRow {
  id: string;
  action: string;
  category: string;
  severity: AdminActionSeverity;
  actorAccountId: string;
  targetEntityType: string | null;
  targetEntityId: string | null;
  targetAccountId: string | null;
  reason: string | null;
  ipAddress: string | null;
  createdAt: string;
  actor: AuditActorPreview | null;
  targetAccount?: { id: string; phoneNumberMasked: string; fullName: string | null } | null;
}

export interface AuditLogDetail extends AuditLogRow {
  beforeState: Record<string, unknown> | null;
  afterState: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  userAgent: string | null;
  requestId: string | null;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ListAuditLogsParams {
  actorAccountId?: string;
  targetAccountId?: string;
  targetEntityType?: string;
  targetEntityId?: string;
  category?: string;
  severity?: AdminActionSeverity;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

function buildQuery(params: Record<string, unknown> | undefined): string {
  if (!params) return '';
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    usp.set(key, String(value));
  });
  const qs = usp.toString();
  return qs ? `?${qs}` : '';
}

export async function listAuditLogs(params: ListAuditLogsParams = {}): Promise<PaginatedResult<AuditLogRow>> {
  const { data } = await apiClient<PaginatedResult<AuditLogRow>>(`/admin/audit${buildQuery(params)}`);
  return data;
}

export async function getAuditLog(id: string): Promise<AuditLogDetail> {
  const { data } = await apiClient<AuditLogDetail>(`/admin/audit/${id}`);
  return data;
}

export async function listAuditCategories(): Promise<string[]> {
  const { data } = await apiClient<string[]>('/admin/audit/categories');
  return data;
}

export async function exportAuditLogs(dateFrom: string, dateTo: string): Promise<Blob> {
  // The API streams JSON; we pull it via fetch directly so we get a Blob
  // suitable for `URL.createObjectURL` rather than going through the
  // envelope-aware apiClient which would parse it as JSON.
  const accessToken = (() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('auth-storage') : null;
      if (!raw) return null;
      return JSON.parse(raw)?.state?.accessToken ?? null;
    } catch {
      return null;
    }
  })();

  const url = `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1'}/admin/audit/export.json?dateFrom=${encodeURIComponent(dateFrom)}&dateTo=${encodeURIComponent(dateTo)}`;
  const res = await fetch(url, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  });
  if (!res.ok) throw new Error(`Export failed: ${res.status}`);
  return res.blob();
}
