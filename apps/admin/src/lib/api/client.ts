const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public path?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface ApiEnvelope<T> {
  data: T;
  statusCode: number;
  timestamp: string;
  meta?: { total?: number; page?: number; limit?: number };
}

let refreshPromise: Promise<void> | null = null;

function getTokens(): { accessToken: string | null; refreshToken: string | null } {
  if (typeof window === 'undefined') return { accessToken: null, refreshToken: null };
  try {
    const raw = localStorage.getItem('auth-storage');
    if (!raw) return { accessToken: null, refreshToken: null };
    const parsed = JSON.parse(raw);
    return {
      accessToken: parsed?.state?.accessToken ?? null,
      refreshToken: parsed?.state?.refreshToken ?? null,
    };
  } catch {
    return { accessToken: null, refreshToken: null };
  }
}

function setTokens(accessToken: string, refreshToken: string): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem('auth-storage');
    const parsed = raw ? JSON.parse(raw) : { state: {}, version: 0 };
    parsed.state.accessToken = accessToken;
    parsed.state.refreshToken = refreshToken;
    localStorage.setItem('auth-storage', JSON.stringify(parsed));
  } catch {
    // ignore
  }
}

function clearTokens(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('auth-storage');
  document.cookie = 'auth-flag=; path=/; max-age=0';
}

async function refreshAccessToken(): Promise<void> {
  const { refreshToken } = getTokens();
  if (!refreshToken) {
    clearTokens();
    throw new ApiError(401, 'No refresh token');
  }

  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) {
    clearTokens();
    throw new ApiError(401, 'Token refresh failed');
  }

  const envelope: ApiEnvelope<{ accessToken: string; refreshToken: string }> = await res.json();
  setTokens(envelope.data.accessToken, envelope.data.refreshToken);
}

export async function apiClient<T>(
  path: string,
  options: RequestInit & { skipAuth?: boolean } = {},
): Promise<{ data: T; meta?: ApiEnvelope<T>['meta'] }> {
  const { skipAuth, ...fetchOptions } = options;
  const headers = new Headers(fetchOptions.headers);

  if (!headers.has('Content-Type') && fetchOptions.body && typeof fetchOptions.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  if (!skipAuth) {
    const { accessToken } = getTokens();
    if (accessToken) {
      headers.set('Authorization', `Bearer ${accessToken}`);
    }
  }

  let res = await fetch(`${API_URL}${path}`, { ...fetchOptions, headers });

  // 401 → try refresh once with a shared promise so concurrent requests
  // don't all fire their own /auth/refresh call.
  if (res.status === 401 && !skipAuth) {
    if (!refreshPromise) {
      refreshPromise = refreshAccessToken().finally(() => {
        refreshPromise = null;
      });
    }
    try {
      await refreshPromise;
    } catch {
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/login';
      }
      throw new ApiError(401, 'Session expired');
    }

    const { accessToken } = getTokens();
    if (accessToken) {
      headers.set('Authorization', `Bearer ${accessToken}`);
    }
    res = await fetch(`${API_URL}${path}`, { ...fetchOptions, headers });
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new ApiError(res.status, body.message ?? 'Request failed', path);
  }

  // Handle 204 No Content
  if (res.status === 204) {
    return { data: null as T };
  }

  const envelope: ApiEnvelope<T> = await res.json();
  return { data: envelope.data, meta: envelope.meta };
}
