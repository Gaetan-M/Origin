import fr from './fr.json';
import en from './en.json';
import { useUiStore } from '@/stores/ui-store';

const translations: Record<string, typeof fr> = { fr, en };

function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const keys = path.split('.');
  let current: unknown = obj;
  for (const key of keys) {
    if (current == null || typeof current !== 'object') return path;
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === 'string' ? current : path;
}

export function t(locale: string, key: string, params?: Record<string, string | number>): string {
  const dict = translations[locale] ?? translations['fr'];
  let value = getNestedValue(dict as unknown as Record<string, unknown>, key);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      value = value.replace(`{${k}}`, String(v));
    }
  }
  return value;
}

export function useTranslation(locale: string) {
  return {
    t: (key: string, params?: Record<string, string | number>) => t(locale, key, params),
  };
}

/** Convenience hook — reads locale from UI store automatically */
export function useT() {
  const locale = useUiStore((s) => s.locale);
  return (key: string, params?: Record<string, string | number>) => t(locale, key, params);
}
