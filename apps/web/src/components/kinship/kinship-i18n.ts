'use client';

import { useUiStore } from '@/stores/ui-store';

/**
 * Self-contained bilingual FR/EN strings for the "Sommes-nous parents ?"
 * feature. Kept local (rather than in src/i18n/{fr,en}.json) so the feature
 * ships as NEW files only — see INTEGRATION NEEDED about optionally folding
 * these keys into the central i18n dictionaries later.
 */
const STRINGS = {
  fr: {
    title: 'Sommes-nous parents ?',
    subtitle:
      'Vérifiez en toute discrétion si vous partagez un lien familial avec une autre personne.',
    privacyTitle: 'Confidentialité avant tout',
    privacyBody:
      "Nous ne révélons jamais votre arbre, vos ancêtres ni aucun nom. Le résultat indique uniquement s'il existe un lien et, le cas échéant, sa nature. Les deux personnes doivent donner leur accord avant tout calcul.",

    // Initiate form
    initiateTitle: 'Lancer une vérification',
    initiateHint:
      "Indiquez le numéro de téléphone d'un proche ou un code famille. L'autre personne devra accepter avant que le lien ne soit calculé.",
    methodPhone: 'Par téléphone',
    methodCode: 'Par code famille',
    phoneLabel: 'Numéro de téléphone',
    phonePlaceholder: '+237 6 XX XX XX XX',
    codeLabel: 'Code famille',
    codePlaceholder: 'ex. MBALLA-2847',
    consentNote:
      "En lançant la vérification, vous consentez à ce que votre lien soit calculé. L'autre personne sera invitée à consentir à son tour.",
    submit: 'Demander le consentement',
    submitting: 'Envoi...',
    invalidPhone: 'Entrez un numéro au format international (+237...).',
    invalidCode: 'Entrez un code famille valide.',
    initiateSuccess: 'Demande envoyée. En attente du consentement.',

    // Lists
    incomingTitle: 'Demandes reçues',
    outgoingTitle: 'Mes demandes',
    incomingEmpty: 'Aucune demande reçue pour le moment.',
    outgoingEmpty: "Vous n'avez lancé aucune vérification.",
    listError: 'Impossible de charger les vérifications.',
    retry: 'Réessayer',
    someone: 'Une personne',
    invitedByPhoneLabel: 'Invité par téléphone',
    requestedBy: 'Demande de',
    sentTo: 'Demande à',

    // Actions
    consent: 'Consentir',
    decline: 'Refuser',
    cancel: 'Annuler la demande',
    consenting: 'Calcul en cours...',
    declining: 'Refus...',
    cancelling: 'Annulation...',
    consentBody:
      'Acceptez-vous de vérifier votre lien familial ? Aucun détail de votre arbre ne sera partagé.',

    // Statuses
    statusPendingIncoming: 'En attente de votre réponse',
    statusPendingOutgoing: 'En attente du consentement',
    statusConsented: 'Consentement donné — calcul...',
    statusDeclined: 'Refusée',
    statusComputed: 'Résultat disponible',
    statusExpired: 'Expirée',
    statusCancelled: 'Annulée',

    // Result
    resultRelatedTitle: 'Vous partagez un lien familial',
    resultUnrelatedTitle: 'Aucun lien trouvé',
    resultUnrelatedBody:
      "Aucun lien familial n'a été détecté entre vous, dans la limite de ce que notre graphe connaît aujourd'hui.",
    resultDegree: 'Degré de parenté',
    resultPrivacyFooter:
      "Seul le lien est révélé — jamais les noms, les ancêtres ni l'arbre de l'une ou l'autre personne.",
  },
  en: {
    title: 'Are we related?',
    subtitle:
      'Discreetly check whether you share a family connection with another person.',
    privacyTitle: 'Privacy first',
    privacyBody:
      'We never reveal your tree, your ancestors or any names. The result only tells you whether a connection exists and, if so, its nature. Both people must agree before anything is computed.',

    // Initiate form
    initiateTitle: 'Start a check',
    initiateHint:
      'Enter a relative’s phone number or a family code. The other person must accept before the connection is computed.',
    methodPhone: 'By phone',
    methodCode: 'By family code',
    phoneLabel: 'Phone number',
    phonePlaceholder: '+237 6 XX XX XX XX',
    codeLabel: 'Family code',
    codePlaceholder: 'e.g. MBALLA-2847',
    consentNote:
      'By starting the check, you consent to your connection being computed. The other person will be invited to consent in turn.',
    submit: 'Request consent',
    submitting: 'Sending...',
    invalidPhone: 'Enter a number in international format (+237...).',
    invalidCode: 'Enter a valid family code.',
    initiateSuccess: 'Request sent. Awaiting consent.',

    // Lists
    incomingTitle: 'Requests received',
    outgoingTitle: 'My requests',
    incomingEmpty: 'No requests received yet.',
    outgoingEmpty: 'You have not started any checks.',
    listError: 'Could not load the checks.',
    retry: 'Try again',
    someone: 'Someone',
    invitedByPhoneLabel: 'Invited by phone',
    requestedBy: 'Request from',
    sentTo: 'Request to',

    // Actions
    consent: 'Consent',
    decline: 'Decline',
    cancel: 'Cancel request',
    consenting: 'Computing...',
    declining: 'Declining...',
    cancelling: 'Cancelling...',
    consentBody:
      'Do you agree to check your family connection? No detail of your tree will be shared.',

    // Statuses
    statusPendingIncoming: 'Awaiting your response',
    statusPendingOutgoing: 'Awaiting consent',
    statusConsented: 'Consent given — computing...',
    statusDeclined: 'Declined',
    statusComputed: 'Result available',
    statusExpired: 'Expired',
    statusCancelled: 'Cancelled',

    // Result
    resultRelatedTitle: 'You share a family connection',
    resultUnrelatedTitle: 'No connection found',
    resultUnrelatedBody:
      'No family connection was detected between you, within what our graph knows today.',
    resultDegree: 'Degree of kinship',
    resultPrivacyFooter:
      'Only the connection is revealed — never the names, ancestors or tree of either person.',
  },
} as const;

export type KinshipStringKey = keyof (typeof STRINGS)['fr'];

/** Hook returning a translator scoped to kinship strings, locale-aware. */
export function useKinshipT(): (key: KinshipStringKey) => string {
  const locale = useUiStore((s) => s.locale);
  const dict = STRINGS[locale === 'en' ? 'en' : 'fr'];
  return (key: KinshipStringKey) => dict[key];
}

/** Active locale ('fr' | 'en') — used to pick the right server-computed label. */
export function useKinshipLocale(): 'fr' | 'en' {
  const locale = useUiStore((s) => s.locale);
  return locale === 'en' ? 'en' : 'fr';
}
