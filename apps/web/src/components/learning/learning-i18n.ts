'use client';

import { useUiStore } from '@/stores/ui-store';
import type { LearningLevel } from '@/lib/api/learning';

/**
 * Self-contained bilingual FR/EN strings for the LEARNING surface. Kept local
 * (rather than in src/i18n/{fr,en}.json) so the learning module ships as a set
 * of NEW files only — see INTEGRATION NEEDED about optionally folding these
 * keys into the central dictionaries later.
 */
const STRINGS = {
  fr: {
    title: 'Apprendre',
    subtitle: 'Mini-lecons pour preserver les langues et la culture',
    empty: 'Aucune lecon pour le moment',
    emptyHint: 'Les lecons de langue et de culture apparaitront ici.',
    error: 'Impossible de charger les lecons',
    retry: 'Reessayer',
    loadMore: 'Voir plus',
    loadingMore: 'Chargement...',
    verified: 'Verifie',
    verifiedAuthority: 'Autorite verifiee',
    ticketed: 'Acces premium',
    filterAllLanguages: 'Toutes les langues',
    filterLanguagePlaceholder: 'Filtrer par langue',
    filterAllLevels: 'Tous les niveaux',
    // Lesson card / list
    lessonsCount: 'lecons',
    by: 'Par',
    // Lesson detail
    notFound: 'Lecon introuvable',
    backToLessons: 'Retour aux lecons',
    enroll: "S'inscrire",
    enrolling: 'Inscription...',
    enrolled: 'Inscrit',
    progress: 'Progression',
    markComplete: 'Marquer comme termine',
    completed: 'Termine',
    updating: 'Mise a jour...',
    yourProgress: 'Votre progression',
    lessonContent: 'Contenu de la lecon',
    noContent: 'Le contenu de cette lecon sera bientot disponible.',
    ticketedNote:
      'Cette lecon est premium et peut etre liee a une session live. Inscrivez-vous pour y acceder.',
    joinLive: 'Rejoindre le live',
    enrollPrompt: 'Inscrivez-vous pour suivre votre progression.',
    level: 'Niveau',
    language: 'Langue',
  },
  en: {
    title: 'Learn',
    subtitle: 'Mini-lessons to preserve languages and culture',
    empty: 'No lessons yet',
    emptyHint: 'Language and culture lessons will appear here.',
    error: 'Could not load lessons',
    retry: 'Try again',
    loadMore: 'Show more',
    loadingMore: 'Loading...',
    verified: 'Verified',
    verifiedAuthority: 'Verified authority',
    ticketed: 'Premium access',
    filterAllLanguages: 'All languages',
    filterLanguagePlaceholder: 'Filter by language',
    filterAllLevels: 'All levels',
    // Lesson card / list
    lessonsCount: 'lessons',
    by: 'By',
    // Lesson detail
    notFound: 'Lesson not found',
    backToLessons: 'Back to lessons',
    enroll: 'Enrol',
    enrolling: 'Enrolling...',
    enrolled: 'Enrolled',
    progress: 'Progress',
    markComplete: 'Mark as complete',
    completed: 'Completed',
    updating: 'Updating...',
    yourProgress: 'Your progress',
    lessonContent: 'Lesson content',
    noContent: 'The content for this lesson is coming soon.',
    ticketedNote:
      'This lesson is premium and may be linked to a live session. Enrol to access it.',
    joinLive: 'Join live',
    enrollPrompt: 'Enrol to track your progress.',
    level: 'Level',
    language: 'Language',
  },
} as const;

export type LearningStringKey = keyof (typeof STRINGS)['fr'];

/** Bilingual labels for each learning level. */
const LEVEL_LABELS: Record<'fr' | 'en', Record<LearningLevel, string>> = {
  fr: {
    BEGINNER: 'Debutant',
    INTERMEDIATE: 'Intermediaire',
    ADVANCED: 'Avance',
  },
  en: {
    BEGINNER: 'Beginner',
    INTERMEDIATE: 'Intermediate',
    ADVANCED: 'Advanced',
  },
};

function resolveLocale(locale: string): 'fr' | 'en' {
  return locale === 'en' ? 'en' : 'fr';
}

/** Hook returning a translator scoped to learning strings, locale-aware. */
export function useLearningT(): (key: LearningStringKey) => string {
  const locale = useUiStore((s) => s.locale);
  const dict = STRINGS[resolveLocale(locale)];
  return (key: LearningStringKey) => dict[key];
}

/** Hook returning a translator for learning level labels. */
export function useLevelLabel(): (level: LearningLevel) => string {
  const locale = useUiStore((s) => s.locale);
  const dict = LEVEL_LABELS[resolveLocale(locale)];
  return (level: LearningLevel) => dict[level];
}

/** Locale string for Intl date formatting. */
export function useLearningLocale(): string {
  const locale = useUiStore((s) => s.locale);
  return locale === 'en' ? 'en-GB' : 'fr-FR';
}
