'use client';

import { useUiStore } from '@/stores/ui-store';

/**
 * Self-contained bilingual FR/EN strings for the feed feature.
 *
 * Kept local (rather than in src/i18n/{fr,en}.json) so the feed module ships as
 * a set of NEW files only — see INTEGRATION NEEDED about optionally folding
 * these keys into the central i18n dictionaries later.
 */
const STRINGS = {
  fr: {
    title: 'Fil familial',
    subtitle: 'Les dernieres nouvelles de votre famille',
    empty: 'Rien a afficher pour le moment',
    emptyHint: 'Les naissances, unions et annonces de votre famille apparaitront ici.',
    error: 'Impossible de charger le fil',
    retry: 'Reessayer',
    loadMore: 'Voir plus',
    loadingMore: 'Chargement...',
    react: 'Reagir',
    comments: 'Commentaires',
    comment: 'Commenter',
    noComments: 'Aucun commentaire',
    writeComment: 'Ecrire un commentaire...',
    send: 'Envoyer',
    showComments: 'Voir les commentaires',
    hideComments: 'Masquer les commentaires',
    eventBirth: 'Naissance',
    eventDeath: 'Deces',
    eventUnion: 'Union',
    announcement: 'Annonce',
    reactionLove: "J'aime",
    reactionSupport: 'Soutien',
    reactionCelebrate: 'Felicitations',
    reactionPray: 'Pensees',
  },
  en: {
    title: 'Family feed',
    subtitle: "The latest from your family",
    empty: 'Nothing to show yet',
    emptyHint: "Your family's births, unions and announcements will appear here.",
    error: 'Could not load the feed',
    retry: 'Try again',
    loadMore: 'Show more',
    loadingMore: 'Loading...',
    react: 'React',
    comments: 'Comments',
    comment: 'Comment',
    noComments: 'No comments',
    writeComment: 'Write a comment...',
    send: 'Send',
    showComments: 'Show comments',
    hideComments: 'Hide comments',
    eventBirth: 'Birth',
    eventDeath: 'Passing',
    eventUnion: 'Union',
    announcement: 'Announcement',
    reactionLove: 'Love',
    reactionSupport: 'Support',
    reactionCelebrate: 'Congrats',
    reactionPray: 'Thoughts',
  },
} as const;

export type FeedStringKey = keyof (typeof STRINGS)['fr'];

/** Hook returning a translator scoped to feed strings, locale-aware. */
export function useFeedT(): (key: FeedStringKey) => string {
  const locale = useUiStore((s) => s.locale);
  const dict = STRINGS[locale === 'en' ? 'en' : 'fr'];
  return (key: FeedStringKey) => dict[key];
}

/** Locale string for Intl date formatting. */
export function useFeedLocale(): string {
  const locale = useUiStore((s) => s.locale);
  return locale === 'en' ? 'en-GB' : 'fr-FR';
}
