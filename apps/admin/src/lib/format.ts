import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';

type Locale = 'fr' | 'en';

function toDate(value: Date | string | number): Date {
  if (value instanceof Date) return value;
  if (typeof value === 'number') return new Date(value);
  return parseISO(value);
}

function dfLocale(locale: Locale) {
  return locale === 'fr' ? fr : enUS;
}

/**
 * Format an absolute date for display in tables and detail views.
 * Default: "12 janv. 2025" / "Jan 12, 2025".
 */
export function formatDate(value: Date | string | number | null | undefined, locale: Locale = 'fr'): string {
  if (!value) return '—';
  try {
    const date = toDate(value);
    return format(date, locale === 'fr' ? 'd MMM yyyy' : 'MMM d, yyyy', { locale: dfLocale(locale) });
  } catch {
    return '—';
  }
}

/**
 * Format an absolute date with time. Used in audit log rows where the
 * exact second matters for forensics.
 */
export function formatDateTime(
  value: Date | string | number | null | undefined,
  locale: Locale = 'fr',
): string {
  if (!value) return '—';
  try {
    const date = toDate(value);
    return format(date, locale === 'fr' ? 'd MMM yyyy à HH:mm' : 'MMM d, yyyy HH:mm', {
      locale: dfLocale(locale),
    });
  } catch {
    return '—';
  }
}

/**
 * Format a relative time like "2 hours ago" / "il y a 2 heures".
 */
export function formatRelativeTime(
  value: Date | string | number | null | undefined,
  locale: Locale = 'fr',
): string {
  if (!value) return '—';
  try {
    const date = toDate(value);
    return formatDistanceToNow(date, { addSuffix: true, locale: dfLocale(locale) });
  } catch {
    return '—';
  }
}

/**
 * Pretty-print an E.164 phone number. Cameroonian numbers are split into
 * the country code and four 2-digit groups (+237 6XX XX XX XX). Other
 * countries fall back to a generic "+CC ###..." formatting.
 */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '—';
  const trimmed = phone.trim();
  if (!trimmed.startsWith('+')) return trimmed;

  // Cameroon: +237 followed by 9 digits
  if (trimmed.startsWith('+237') && trimmed.length === 13) {
    const local = trimmed.slice(4);
    return `+237 ${local.slice(0, 1)}${local.slice(1, 3)} ${local.slice(3, 5)} ${local.slice(5, 7)} ${local.slice(7, 9)}`;
  }

  // Generic fallback: keep + and group the rest in chunks of 3 from the left.
  const digits = trimmed.slice(1);
  const groups = digits.match(/.{1,3}/g) ?? [digits];
  return `+${groups.join(' ')}`;
}
