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
    // Empty state (rich)
    emptyTitle: 'Réunissez la famille en direct',
    emptyBody:
      "Diffusez un moment important à vos proches, ici et dans la diaspora — en audio d'abord, économe en données.",
    emptyCtaPrimary: 'Programmer mon premier direct',
    ideaCeremonyTitle: 'Cérémonie',
    ideaCeremonyDesc: 'Mariage, deuil, baptême — partagé avec ceux qui sont loin',
    ideaCouncilTitle: 'Conseil de famille',
    ideaCouncilDesc: 'Réunir les anciens pour décider ensemble',
    ideaLessonTitle: 'Leçon de langue',
    ideaLessonDesc: 'Un aîné transmet la langue et les traditions',
    // List
    participants_one: 'participant',
    participants_other: 'participants',
    startsIn: 'Commence',
    startNow: 'Démarrer',
    starting: 'Démarrage…',
    // Room — controls
    raiseHand: 'Lever la main',
    lowerHand: 'Baisser la main',
    handRaised: 'Main levée',
    reactions: 'Réactions',
    chat: 'Discussion',
    invite: 'Inviter',
    endLive: 'Terminer le direct',
    ending: 'Fin du direct…',
    endLiveConfirm: 'Terminer ce direct pour tout le monde ?',
    youHost: 'Vous animez',
    speaking: 'parle',
    muted: 'Micro coupé',
    you: 'Vous',
    listeners: 'À l’écoute',
    onStage: 'Sur scène',
    // Chat panel
    chatTitle: 'Discussion en direct',
    chatPlaceholder: 'Écrire un message…',
    chatSend: 'Envoyer',
    chatEmpty: 'Soyez le premier à écrire un mot à la famille.',
    chatClosed: 'Fermer la discussion',
    // Host controls
    hostControls: 'Animation',
    raisedHands: 'Mains levées',
    noRaisedHands: 'Aucune main levée pour le moment.',
    promote: 'Inviter à parler',
    muteParticipant: 'Couper le micro',
    removeParticipant: 'Retirer du direct',
    actionDone: 'Action effectuée',
    actionFailed: 'Action impossible. Réessayez.',
    // Invite dialog
    inviteTitle: 'Inviter au direct',
    inviteSubtitle: 'Choisissez des proches ou partagez le lien.',
    inviteTabFamily: 'Ma famille',
    inviteTabLink: 'Lien & QR',
    inviteTabPhone: 'Par téléphone',
    inviteSearchFamily: 'Rechercher un proche…',
    inviteFamilyEmpty: 'Aucun proche à inviter pour l’instant.',
    inviteSelected: 'sélectionné(s)',
    inviteSend: 'Envoyer les invitations',
    inviteSending: 'Envoi…',
    inviteSent: 'Invitations envoyées',
    inviteFailed: 'Échec de l’envoi. Réessayez.',
    inviteCopyLink: 'Copier le lien',
    inviteCopied: 'Lien copié',
    inviteShare: 'Partager',
    inviteScanHint: 'Scannez pour rejoindre le direct',
    invitePhoneLabel: 'Numéro de téléphone',
    invitePhonePlaceholder: '+237 6XX XX XX XX',
    invitePhoneAdd: 'Ajouter',
    invitePhoneInvalid: 'Numéro invalide (format +237…)',
    invitePhoneEmpty: 'Ajoutez au moins un numéro.',
    close: 'Fermer',
    // Join page
    joinResolving: 'Recherche du direct…',
    joinNotFound: 'Direct introuvable',
    joinNotFoundBody:
      "Ce lien d'invitation n'est plus valide ou le direct n'existe plus.",
    joinOpen: 'Ouvrir le direct',
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
    // Empty state (rich)
    emptyTitle: 'Bring the family together, live',
    emptyBody:
      'Broadcast an important moment to your relatives at home and abroad — audio-first and data-light.',
    emptyCtaPrimary: 'Schedule my first live',
    ideaCeremonyTitle: 'Ceremony',
    ideaCeremonyDesc: 'Wedding, funeral, christening — shared with those far away',
    ideaCouncilTitle: 'Family council',
    ideaCouncilDesc: 'Gather the elders to decide together',
    ideaLessonTitle: 'Language lesson',
    ideaLessonDesc: 'An elder passes on the language and traditions',
    // List
    participants_one: 'participant',
    participants_other: 'participants',
    startsIn: 'Starts',
    startNow: 'Go live',
    starting: 'Starting…',
    // Room — controls
    raiseHand: 'Raise hand',
    lowerHand: 'Lower hand',
    handRaised: 'Hand raised',
    reactions: 'Reactions',
    chat: 'Chat',
    invite: 'Invite',
    endLive: 'End live',
    ending: 'Ending…',
    endLiveConfirm: 'End this live for everyone?',
    youHost: 'You are hosting',
    speaking: 'speaking',
    muted: 'Muted',
    you: 'You',
    listeners: 'Listening',
    onStage: 'On stage',
    // Chat panel
    chatTitle: 'Live chat',
    chatPlaceholder: 'Write a message…',
    chatSend: 'Send',
    chatEmpty: 'Be the first to say a word to the family.',
    chatClosed: 'Close chat',
    // Host controls
    hostControls: 'Hosting',
    raisedHands: 'Raised hands',
    noRaisedHands: 'No raised hands yet.',
    promote: 'Invite to speak',
    muteParticipant: 'Mute',
    removeParticipant: 'Remove from live',
    actionDone: 'Done',
    actionFailed: 'Action failed. Try again.',
    // Invite dialog
    inviteTitle: 'Invite to the live',
    inviteSubtitle: 'Pick relatives or share the link.',
    inviteTabFamily: 'My family',
    inviteTabLink: 'Link & QR',
    inviteTabPhone: 'By phone',
    inviteSearchFamily: 'Search a relative…',
    inviteFamilyEmpty: 'No relatives to invite yet.',
    inviteSelected: 'selected',
    inviteSend: 'Send invitations',
    inviteSending: 'Sending…',
    inviteSent: 'Invitations sent',
    inviteFailed: 'Sending failed. Try again.',
    inviteCopyLink: 'Copy link',
    inviteCopied: 'Link copied',
    inviteShare: 'Share',
    inviteScanHint: 'Scan to join the live',
    invitePhoneLabel: 'Phone number',
    invitePhonePlaceholder: '+237 6XX XX XX XX',
    invitePhoneAdd: 'Add',
    invitePhoneInvalid: 'Invalid number (format +237…)',
    invitePhoneEmpty: 'Add at least one number.',
    close: 'Close',
    // Join page
    joinResolving: 'Finding the live…',
    joinNotFound: 'Live not found',
    joinNotFoundBody:
      'This invite link is no longer valid or the live no longer exists.',
    joinOpen: 'Open the live',
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
