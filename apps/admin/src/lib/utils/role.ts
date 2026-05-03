import { AccountRole, ROLE_RANK } from '@origin/shared-types';

/**
 * Returns true when `role` has at least the rank of `required`.
 * Wraps the shared-types helper so admin call sites have a stable
 * import path even if the underlying util moves later.
 */
export function isRoleAtLeast(role: AccountRole | null | undefined, required: AccountRole): boolean {
  if (!role) return false;
  return ROLE_RANK[role] >= ROLE_RANK[required];
}

/**
 * Human-readable label for an account role. We intentionally keep
 * these short so they fit in compact badges and table cells.
 */
export function roleLabel(role: AccountRole, locale: 'fr' | 'en' = 'fr'): string {
  const labels: Record<AccountRole, { fr: string; en: string }> = {
    [AccountRole.USER]: { fr: 'Utilisateur', en: 'User' },
    [AccountRole.MODERATOR]: { fr: 'Modérateur', en: 'Moderator' },
    [AccountRole.ADMIN]: { fr: 'Administrateur', en: 'Admin' },
    [AccountRole.SUPER_ADMIN]: { fr: 'Super-admin', en: 'Super admin' },
  };
  return labels[role]?.[locale] ?? role;
}
