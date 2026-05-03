import type { RequestOtpDto, VerifyOtpDto, AuthTokens, Account } from '@origin/shared-types';
import { apiClient } from './client';

export async function requestOtp(dto: RequestOtpDto): Promise<{ message: string }> {
  const { data } = await apiClient<{ message: string }>('/auth/otp/request', {
    method: 'POST',
    body: JSON.stringify(dto),
    skipAuth: true,
  });
  return data;
}

export async function verifyOtp(dto: VerifyOtpDto): Promise<AuthTokens> {
  const { data } = await apiClient<AuthTokens>('/auth/otp/verify', {
    method: 'POST',
    body: JSON.stringify(dto),
    skipAuth: true,
  });
  return data;
}

export async function refreshTokens(refreshToken: string): Promise<AuthTokens> {
  const { data } = await apiClient<AuthTokens>('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
    skipAuth: true,
  });
  return data;
}

export async function logout(): Promise<void> {
  await apiClient('/auth/logout', { method: 'POST' });
}

export async function getMe(): Promise<Account> {
  const { data } = await apiClient<Account>('/auth/me');
  return data;
}
