'use client';

import { useUiStore } from '@/stores/ui-store';

/**
 * Self-contained bilingual FR/EN strings for the public ENGAGEMENT layer
 * (reactions, comments, contributed photos, ratings, suggest-edit).
 *
 * Kept local — mirroring feed-i18n / tourism-i18n / discover-i18n — so the
 * engagement module ships as a set of NEW files only.
 */
const STRINGS = {
  fr: {
    // Reactions
    reactionLike: "J'aime",
    reactionLove: "J'adore",
    reactionWow: 'Impressionnant',
    reactionVisited: "J'y suis allé",
    // Comments
    commentsTitle: 'Commentaires',
    noComments: 'Aucun commentaire pour le moment',
    beFirst: 'Soyez le premier à réagir.',
    writeComment: 'Écrire un commentaire...',
    send: 'Envoyer',
    seeMore: 'Voir plus',
    loadingMore: 'Chargement...',
    delete: 'Supprimer',
    deleteConfirm: 'Supprimer ce commentaire ?',
    commentError: "Impossible d'envoyer le commentaire.",
    // Photos
    photosTitle: 'Photos de la communauté',
    noPhotos: 'Aucune photo partagée pour le moment',
    addPhoto: 'Ajouter une photo',
    uploading: 'Envoi...',
    photoSent: 'Photo envoyée, en attente de modération',
    photoError: "Impossible d'envoyer la photo.",
    photoTooLarge: 'La photo ne doit pas dépasser 5 Mo.',
    // Rating
    ratingTitle: 'Votre avis',
    rate: 'Noter',
    rateError: "Impossible d'enregistrer votre note.",
    ratingSaved: 'Merci pour votre note !',
    noRatingsYet: 'Pas encore de note',
    yourRating: 'Votre note',
    reviews: 'avis',
    // Suggest edit
    suggestEdit: 'Suggérer une correction',
    suggestEditTitle: 'Suggérer une correction',
    suggestEditSubtitle: 'Votre suggestion sera examinée avant publication.',
    field: 'Champ à corriger',
    proposedValue: 'Valeur proposée',
    proposedValuePlaceholder: 'Saisissez la valeur correcte...',
    note: 'Note',
    notePlaceholder: 'Expliquez votre correction (facultatif)...',
    optional: 'facultatif',
    cancel: 'Annuler',
    submit: 'Envoyer',
    submitting: 'Envoi...',
    suggestSent: 'Suggestion envoyée, merci !',
    suggestError: "Échec de l'envoi. Réessayez.",
    requiredValue: 'Une valeur est requise',
    // Field labels (places)
    fieldName: 'Nom',
    fieldDescription: 'Description',
    fieldRegion: 'Région',
    fieldLocation: 'Localisation',
    // Field labels (content)
    fieldTitle: 'Titre',
    fieldBody: 'Contenu',
    fieldEthnicGroup: 'Groupe ethnique',
  },
  en: {
    // Reactions
    reactionLike: 'Like',
    reactionLove: 'Love',
    reactionWow: 'Wow',
    reactionVisited: "I've been there",
    // Comments
    commentsTitle: 'Comments',
    noComments: 'No comments yet',
    beFirst: 'Be the first to react.',
    writeComment: 'Write a comment...',
    send: 'Send',
    seeMore: 'See more',
    loadingMore: 'Loading...',
    delete: 'Delete',
    deleteConfirm: 'Delete this comment?',
    commentError: 'Could not send the comment.',
    // Photos
    photosTitle: 'Community photos',
    noPhotos: 'No photos shared yet',
    addPhoto: 'Add a photo',
    uploading: 'Uploading...',
    photoSent: 'Photo sent, awaiting moderation',
    photoError: 'Could not send the photo.',
    photoTooLarge: 'The photo must not exceed 5 MB.',
    // Rating
    ratingTitle: 'Your rating',
    rate: 'Rate',
    rateError: 'Could not save your rating.',
    ratingSaved: 'Thanks for your rating!',
    noRatingsYet: 'No ratings yet',
    yourRating: 'Your rating',
    reviews: 'reviews',
    // Suggest edit
    suggestEdit: 'Suggest an edit',
    suggestEditTitle: 'Suggest an edit',
    suggestEditSubtitle: 'Your suggestion will be reviewed before publishing.',
    field: 'Field to fix',
    proposedValue: 'Proposed value',
    proposedValuePlaceholder: 'Enter the correct value...',
    note: 'Note',
    notePlaceholder: 'Explain your correction (optional)...',
    optional: 'optional',
    cancel: 'Cancel',
    submit: 'Send',
    submitting: 'Sending...',
    suggestSent: 'Suggestion sent, thank you!',
    suggestError: 'Submission failed. Try again.',
    requiredValue: 'A value is required',
    // Field labels (places)
    fieldName: 'Name',
    fieldDescription: 'Description',
    fieldRegion: 'Region',
    fieldLocation: 'Location',
    // Field labels (content)
    fieldTitle: 'Title',
    fieldBody: 'Content',
    fieldEthnicGroup: 'Ethnic group',
  },
} as const;

export type EngagementStringKey = keyof (typeof STRINGS)['fr'];

function resolveLocale(locale: string): 'fr' | 'en' {
  return locale === 'en' ? 'en' : 'fr';
}

/** Hook returning a translator scoped to engagement strings, locale-aware. */
export function useEngagementT(): (key: EngagementStringKey) => string {
  const locale = useUiStore((s) => s.locale);
  const dict = STRINGS[resolveLocale(locale)];
  return (key: EngagementStringKey) => dict[key];
}

/** Locale string for Intl date formatting. */
export function useEngagementLocale(): string {
  const locale = useUiStore((s) => s.locale);
  return locale === 'en' ? 'en-GB' : 'fr-FR';
}
