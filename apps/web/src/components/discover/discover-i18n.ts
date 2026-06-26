'use client';

import { useUiStore } from '@/stores/ui-store';
import type { CulturalContentType } from '@/lib/api/cultural';

/**
 * Self-contained bilingual FR/EN strings for the PUBLIC discovery feature.
 *
 * Kept local (rather than in src/i18n/{fr,en}.json) so the discover module
 * ships as a set of NEW files only — see INTEGRATION NEEDED about optionally
 * folding these keys into the central i18n dictionaries later.
 */
const STRINGS = {
  fr: {
    title: 'Decouvrir',
    subtitle: 'Le patrimoine culturel partage par la communaute',
    empty: 'Rien a decouvrir pour le moment',
    emptyHint: 'Langues, recettes, contes, proverbes, rites et coutumes apparaitront ici.',
    error: 'Impossible de charger la decouverte',
    retry: 'Reessayer',
    loadMore: 'Voir plus',
    loadingMore: 'Chargement...',
    share: 'Partager un contenu',
    verified: 'Verifie',
    verifiedAuthority: 'Autorite verifiee',
    filterAll: 'Tout',
    readMore: 'Lire la suite',
    // Form
    formTitle: 'Partager un contenu culturel',
    formSubtitle: 'Contribuez au patrimoine vivant. Votre contenu sera relu avant publication.',
    fieldType: 'Type de contenu',
    fieldTitle: 'Titre',
    fieldTitlePlaceholder: 'Ex : Le conte de la tortue rusee',
    fieldBody: 'Contenu',
    fieldBodyPlaceholder: 'Racontez, expliquez, transmettez...',
    fieldLanguage: 'Langue',
    fieldLanguagePlaceholder: 'Ex : Ewondo, Duala, Bamileke...',
    fieldRegion: 'Region',
    fieldRegionPlaceholder: 'Ex : Ouest, Littoral...',
    fieldEthnicGroup: 'Groupe ethnique',
    fieldEthnicGroupPlaceholder: 'Ex : Bamileke, Beti, Bassa...',
    optional: 'facultatif',
    submit: 'Soumettre',
    submitting: 'Envoi...',
    cancel: 'Annuler',
    requiredTitle: 'Le titre est obligatoire',
    submitError: "Echec de l'envoi. Reessayez.",
    moderationNote: 'Votre contribution sera examinee par notre equipe avant publication.',
  },
  en: {
    title: 'Discover',
    subtitle: 'Cultural heritage shared by the community',
    empty: 'Nothing to discover yet',
    emptyHint: 'Languages, recipes, tales, proverbs, rites and customs will appear here.',
    error: 'Could not load discovery',
    retry: 'Try again',
    loadMore: 'Show more',
    loadingMore: 'Loading...',
    share: 'Share content',
    verified: 'Verified',
    verifiedAuthority: 'Verified authority',
    filterAll: 'All',
    readMore: 'Read more',
    // Form
    formTitle: 'Share cultural content',
    formSubtitle: 'Contribute to living heritage. Your content is reviewed before publishing.',
    fieldType: 'Content type',
    fieldTitle: 'Title',
    fieldTitlePlaceholder: 'E.g. The tale of the clever tortoise',
    fieldBody: 'Content',
    fieldBodyPlaceholder: 'Tell, explain, pass it on...',
    fieldLanguage: 'Language',
    fieldLanguagePlaceholder: 'E.g. Ewondo, Duala, Bamileke...',
    fieldRegion: 'Region',
    fieldRegionPlaceholder: 'E.g. West, Littoral...',
    fieldEthnicGroup: 'Ethnic group',
    fieldEthnicGroupPlaceholder: 'E.g. Bamileke, Beti, Bassa...',
    optional: 'optional',
    submit: 'Submit',
    submitting: 'Sending...',
    cancel: 'Cancel',
    requiredTitle: 'A title is required',
    submitError: 'Submission failed. Try again.',
    moderationNote: 'Your contribution will be reviewed by our team before publishing.',
  },
} as const;

export type DiscoverStringKey = keyof (typeof STRINGS)['fr'];

/** Bilingual labels for each cultural content type. */
const CONTENT_TYPE_LABELS: Record<'fr' | 'en', Record<CulturalContentType, string>> = {
  fr: {
    LANGUAGE: 'Langue',
    RECIPE: 'Recette',
    TALE: 'Conte',
    PROVERB: 'Proverbe',
    RITE: 'Rite',
    CUSTOM: 'Coutume',
    MUSIC: 'Musique',
    OTHER: 'Autre',
  },
  en: {
    LANGUAGE: 'Language',
    RECIPE: 'Recipe',
    TALE: 'Tale',
    PROVERB: 'Proverb',
    RITE: 'Rite',
    CUSTOM: 'Custom',
    MUSIC: 'Music',
    OTHER: 'Other',
  },
};

function resolveLocale(locale: string): 'fr' | 'en' {
  return locale === 'en' ? 'en' : 'fr';
}

/** Hook returning a translator scoped to discover strings, locale-aware. */
export function useDiscoverT(): (key: DiscoverStringKey) => string {
  const locale = useUiStore((s) => s.locale);
  const dict = STRINGS[resolveLocale(locale)];
  return (key: DiscoverStringKey) => dict[key];
}

/** Hook returning a translator for cultural content type labels. */
export function useContentTypeLabel(): (type: CulturalContentType) => string {
  const locale = useUiStore((s) => s.locale);
  const dict = CONTENT_TYPE_LABELS[resolveLocale(locale)];
  return (type: CulturalContentType) => dict[type];
}

/** Locale string for Intl date formatting. */
export function useDiscoverLocale(): string {
  const locale = useUiStore((s) => s.locale);
  return locale === 'en' ? 'en-GB' : 'fr-FR';
}
