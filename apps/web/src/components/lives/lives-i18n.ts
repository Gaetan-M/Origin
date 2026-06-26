'use client';

import { useUiStore } from '@/stores/ui-store';
import { VisibilityScope } from '@origin/shared-types';
import type { LiveSessionKind, LiveSessionStatus } from '@/lib/api/live';

/**
 * Self-contained bilingual FR/EN strings for the LIVE (Phase 5) feature.
 *
 * Kept local (rather than in src/i18n/{fr,en}.json) so the lives module ships
 * as NEW files only — see INTEGRATION NEEDED about optionally folding these
 * keys into the central dictionaries later, plus the `nav.lives` key.
 */
const STRINGS = {
  fr: {
    title: 'En direct',
    subtitle: 'Cérémonies, conseils de famille, leçons et masterclass en direct',
    schedule: 'Programmer',
    sectionLive: 'En cours',
    sectionUpcoming: 'À venir',
    sectionPast: 'Terminés',
    empty: 'Aucun direct pour le moment',
    emptyHint: 'Programmez une cérémonie, un conseil de famille ou une leçon en direct.',
    error: 'Impossible de charger les directs',
    retry: 'Réessayer',
    join: 'Rejoindre',
    watchReplay: 'Voir le replay',
    live: 'EN DIRECT',
    hostedBy: 'Animé par',
    scheduledFor: 'Prévu le',
    // Live room
    roomLoading: 'Connexion au direct…',
    comingSoonTitle: 'Le direct sera bientôt disponible',
    comingSoonTitleEn: 'Live coming soon',
    comingSoonBody:
      "Le direct n'est pas encore actif. Revenez un peu plus tard — la diffusion démarrera ici.",
    notConfigured:
      "La diffusion en direct n'est pas encore configurée sur ce serveur.",
    backToList: 'Retour aux directs',
    weakConnection: 'Connexion faible — caméra coupée',
    reEnableCamera: 'Réactiver',
    leave: 'Quitter',
    audioLive: 'Direct audio en cours',
    audioLiveHint: 'Aucune caméra active — vous écoutez le direct.',
    replayPreparing: 'Le replay est en cours de préparation.',
    replayUnavailable: "Le replay n'est pas disponible.",
    // Schedule form
    formTitle: 'Programmer un direct',
    formSubtitle: 'Préparez une diffusion en direct pour votre famille ou le public.',
    fieldTitle: 'Titre',
    fieldTitlePlaceholder: 'Ex : Veillée en hommage à…',
    fieldKind: 'Type de direct',
    fieldDescription: 'Description',
    fieldDescriptionPlaceholder: 'De quoi parle ce direct ?',
    fieldVisibility: 'Visibilité',
    fieldScheduledAt: 'Date et heure',
    optional: 'facultatif',
    submit: 'Programmer',
    submitting: 'Programmation…',
    cancel: 'Annuler',
    requiredTitle: 'Le titre est obligatoire',
    submitError: "Échec de la programmation. Réessayez.",
  },
  en: {
    title: 'Live',
    subtitle: 'Ceremonies, family councils, lessons and masterclasses, live',
    schedule: 'Schedule',
    sectionLive: 'Happening now',
    sectionUpcoming: 'Upcoming',
    sectionPast: 'Past',
    empty: 'No live sessions yet',
    emptyHint: 'Schedule a ceremony, a family council or a live lesson.',
    error: 'Could not load live sessions',
    retry: 'Try again',
    join: 'Join',
    watchReplay: 'Watch replay',
    live: 'LIVE',
    hostedBy: 'Hosted by',
    scheduledFor: 'Scheduled for',
    // Live room
    roomLoading: 'Connecting to the live…',
    comingSoonTitle: 'Live coming soon',
    comingSoonTitleEn: 'Live coming soon',
    comingSoonBody:
      'This live is not active yet. Check back shortly — the broadcast will start here.',
    notConfigured: 'Live streaming is not configured on this server yet.',
    backToList: 'Back to live sessions',
    weakConnection: 'Weak connection — camera turned off',
    reEnableCamera: 'Turn back on',
    leave: 'Leave',
    audioLive: 'Audio live in progress',
    audioLiveHint: 'No active camera — you are listening to the live.',
    replayPreparing: 'The replay is being prepared.',
    replayUnavailable: 'The replay is not available.',
    // Schedule form
    formTitle: 'Schedule a live',
    formSubtitle: 'Set up a live broadcast for your family or the public.',
    fieldTitle: 'Title',
    fieldTitlePlaceholder: 'E.g. Tribute vigil for…',
    fieldKind: 'Live type',
    fieldDescription: 'Description',
    fieldDescriptionPlaceholder: 'What is this live about?',
    fieldVisibility: 'Visibility',
    fieldScheduledAt: 'Date and time',
    optional: 'optional',
    submit: 'Schedule',
    submitting: 'Scheduling…',
    cancel: 'Cancel',
    requiredTitle: 'A title is required',
    submitError: 'Scheduling failed. Try again.',
  },
} as const;

export type LivesStringKey = keyof (typeof STRINGS)['fr'];

const KIND_LABELS: Record<'fr' | 'en', Record<LiveSessionKind, string>> = {
  fr: {
    CEREMONY: 'Cérémonie',
    FAMILY_COUNCIL: 'Conseil de famille',
    LESSON: 'Leçon',
    STORYTELLING: 'Conte',
    MASTERCLASS: 'Masterclass',
    OTHER: 'Autre',
  },
  en: {
    CEREMONY: 'Ceremony',
    FAMILY_COUNCIL: 'Family council',
    LESSON: 'Lesson',
    STORYTELLING: 'Storytelling',
    MASTERCLASS: 'Masterclass',
    OTHER: 'Other',
  },
};

const VISIBILITY_LABELS: Record<'fr' | 'en', Record<VisibilityScope, string>> = {
  fr: {
    [VisibilityScope.PRIVATE_SELF]: 'Privé',
    [VisibilityScope.FAMILY]: 'Famille',
    [VisibilityScope.PUBLIC]: 'Public',
  },
  en: {
    [VisibilityScope.PRIVATE_SELF]: 'Private',
    [VisibilityScope.FAMILY]: 'Family',
    [VisibilityScope.PUBLIC]: 'Public',
  },
};

const STATUS_LABELS: Record<'fr' | 'en', Record<LiveSessionStatus, string>> = {
  fr: {
    SCHEDULED: 'Programmé',
    LIVE: 'En direct',
    ENDED: 'Terminé',
    CANCELLED: 'Annulé',
  },
  en: {
    SCHEDULED: 'Scheduled',
    LIVE: 'Live',
    ENDED: 'Ended',
    CANCELLED: 'Cancelled',
  },
};

function resolveLocale(locale: string): 'fr' | 'en' {
  return locale === 'en' ? 'en' : 'fr';
}

export function useLivesT(): (key: LivesStringKey) => string {
  const locale = useUiStore((s) => s.locale);
  const dict = STRINGS[resolveLocale(locale)];
  return (key: LivesStringKey) => dict[key];
}

export function useLiveKindLabel(): (kind: LiveSessionKind) => string {
  const locale = useUiStore((s) => s.locale);
  const dict = KIND_LABELS[resolveLocale(locale)];
  return (kind: LiveSessionKind) => dict[kind];
}

export function useLiveVisibilityLabel(): (scope: VisibilityScope) => string {
  const locale = useUiStore((s) => s.locale);
  const dict = VISIBILITY_LABELS[resolveLocale(locale)];
  return (scope: VisibilityScope) => dict[scope];
}

export function useLiveStatusLabel(): (status: LiveSessionStatus) => string {
  const locale = useUiStore((s) => s.locale);
  const dict = STATUS_LABELS[resolveLocale(locale)];
  return (status: LiveSessionStatus) => dict[status];
}

/** Locale string for Intl date/time formatting. */
export function useLivesLocale(): string {
  const locale = useUiStore((s) => s.locale);
  return locale === 'en' ? 'en-GB' : 'fr-FR';
}
