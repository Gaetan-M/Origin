'use client';

import { useUiStore } from '@/stores/ui-store';
import type { SuggestionField } from '@/lib/api/moderation';

/**
 * Self-contained bilingual FR/EN strings for the MODERATION surface — mirroring
 * the engagement-i18n pattern so the module ships as a set of NEW files only.
 * FR is primary.
 */
const STRINGS = {
  fr: {
    title: 'Modération',
    subtitle: 'Examinez les contributions de la communauté avant publication.',
    tabPhotos: 'Photos en attente',
    tabSuggestions: 'Suggestions en attente',
    approve: 'Approuver',
    reject: 'Rejeter',
    approved: 'Contribution approuvée',
    rejected: 'Contribution rejetée',
    actionError: "L'action a échoué. Réessayez.",
    noPhotos: 'Aucune photo en attente 🎉',
    noSuggestions: 'Aucune suggestion en attente 🎉',
    accessDenied: 'Accès réservé aux modérateurs',
    accessDeniedDesc:
      "Cette page est réservée aux modérateurs. Si vous pensez qu'il s'agit d'une erreur, contactez un administrateur.",
    by: 'par',
    unknownAuthor: 'Anonyme',
    targetPlace: 'Lieu',
    targetContent: 'Contenu',
    proposedValue: 'Valeur proposée',
    note: 'Note',
    // Suggestion field labels
    fieldName: 'Nom',
    fieldDescription: 'Description',
    fieldRegion: 'Région',
    fieldLocation: 'Localisation',
    fieldTitle: 'Titre',
    fieldBody: 'Corps',
    fieldEthnicGroup: 'Groupe ethnique',
  },
  en: {
    title: 'Moderation',
    subtitle: 'Review community contributions before they go live.',
    tabPhotos: 'Pending photos',
    tabSuggestions: 'Pending suggestions',
    approve: 'Approve',
    reject: 'Reject',
    approved: 'Contribution approved',
    rejected: 'Contribution rejected',
    actionError: 'The action failed. Try again.',
    noPhotos: 'No photos pending 🎉',
    noSuggestions: 'No suggestions pending 🎉',
    accessDenied: 'Moderators only',
    accessDeniedDesc:
      'This page is reserved for moderators. If you believe this is a mistake, contact an administrator.',
    by: 'by',
    unknownAuthor: 'Anonymous',
    targetPlace: 'Place',
    targetContent: 'Content',
    proposedValue: 'Proposed value',
    note: 'Note',
    // Suggestion field labels
    fieldName: 'Name',
    fieldDescription: 'Description',
    fieldRegion: 'Region',
    fieldLocation: 'Location',
    fieldTitle: 'Title',
    fieldBody: 'Body',
    fieldEthnicGroup: 'Ethnic group',
  },
} as const;

export type ModerationStringKey = keyof (typeof STRINGS)['fr'];

function resolveLocale(locale: string): 'fr' | 'en' {
  return locale === 'en' ? 'en' : 'fr';
}

/** Hook returning a translator scoped to moderation strings, locale-aware. */
export function useModerationT(): (key: ModerationStringKey) => string {
  const locale = useUiStore((s) => s.locale);
  const dict = STRINGS[resolveLocale(locale)];
  return (key: ModerationStringKey) => dict[key];
}

/** Locale string for Intl date formatting. */
export function useModerationLocale(): string {
  const locale = useUiStore((s) => s.locale);
  return locale === 'en' ? 'en-GB' : 'fr-FR';
}

const FIELD_KEYS: Record<SuggestionField, ModerationStringKey> = {
  name: 'fieldName',
  description: 'fieldDescription',
  region: 'fieldRegion',
  location: 'fieldLocation',
  title: 'fieldTitle',
  body: 'fieldBody',
  ethnicGroup: 'fieldEthnicGroup',
};

/** Humanize a suggestion field code into a localized label. */
export function useFieldLabel(): (field: string) => string {
  const t = useModerationT();
  return (field: string) => {
    const key = FIELD_KEYS[field as SuggestionField];
    return key ? t(key) : field;
  };
}
