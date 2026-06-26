'use client';

import { useUiStore } from '@/stores/ui-store';

/**
 * Self-contained FR/EN dictionary for the Phase 4 "Living Memory" surfaces
 * (albums + memorial). Kept local to these features so they ship independently
 * of the global i18n bundle. The single nav string `nav.albums` still needs to
 * be added to the global dict — see INTEGRATION NEEDED.
 */
type Dict = Record<string, string>;

const FR: Dict = {
  // Albums — list
  'albums.title': 'Albums',
  'albums.subtitle': 'Une vie en images, racontée au fil du temps.',
  'albums.create': 'Nouvel album',
  'albums.emptyTitle': 'Aucun album pour l’instant',
  'albums.emptyDesc':
    'Créez un album pour documenter la vie d’un proche, photo après photo.',
  'albums.itemCount': '{count} souvenir(s)',
  'albums.about': 'À propos de {name}',
  'albums.openAlbum': 'Ouvrir l’album',

  // Album kinds
  'albums.kind.PERSONAL': 'Personnel',
  'albums.kind.FAMILY': 'Famille',
  'albums.kind.EVENT': 'Événement',

  // Create album form
  'albums.form.title': 'Titre de l’album',
  'albums.form.titlePlaceholder': 'Ex. : Les premières années de Léa',
  'albums.form.description': 'Description',
  'albums.form.descriptionPlaceholder': 'Quelques mots sur cet album…',
  'albums.form.kind': 'Type d’album',
  'albums.form.subject': 'Personne concernée (optionnel)',
  'albums.form.subjectHint': 'L’album raconte la vie de cette personne.',
  'albums.form.submit': 'Créer l’album',
  'albums.form.creating': 'Création…',
  'albums.created': 'Album créé.',

  // Album timeline
  'albums.timeline.empty': 'Cet album est encore vide.',
  'albums.timeline.emptyDesc': 'Ajoutez une première photo pour commencer l’histoire.',
  'albums.timeline.undated': 'Sans date',
  'albums.addPhoto': 'Ajouter une photo',
  'albums.item.added': 'Photo ajoutée à l’album.',
  'albums.item.removed': 'Photo retirée.',
  'albums.item.caption': 'Légende',
  'albums.item.captionPlaceholder': 'Décrivez ce moment…',
  'albums.item.takenAt': 'Date de la photo',
  'albums.item.takenAtText': 'Date approximative',
  'albums.item.takenAtTextPlaceholder': 'Ex. : Été 1998',
  'albums.item.choosePhoto': 'Choisir une photo',
  'albums.item.uploading': 'Envoi…',
  'albums.item.save': 'Ajouter au timeline',
  'albums.deleteConfirm': 'Retirer cette photo de l’album ?',
  'albums.deleteAlbumConfirm': 'Supprimer cet album et tous ses souvenirs ?',
  'albums.deleted': 'Album supprimé.',

  // Visibility
  'visibility.label': 'Visibilité',
  'visibility.PRIVATE_SELF': 'Privé (moi uniquement)',
  'visibility.FAMILY': 'Famille',
  'visibility.PUBLIC': 'Public',
  'visibility.degree': 'Jusqu’au {n}ᵉ degré de parenté',

  // Memorial
  'memorial.title': 'En mémoire de {name}',
  'memorial.subtitle': 'Un lieu pour honorer et se souvenir.',
  'memorial.notDeceased': 'L’espace mémoriel n’est ouvert que pour les personnes décédées.',
  'memorial.candleCount': '{count} bougie(s) allumée(s)',
  'memorial.tributeCount': '{count} hommage(s)',
  'memorial.lightCandle': 'Allumer une bougie',
  'memorial.candleLit': 'Une bougie a été allumée.',
  'memorial.wall.title': 'Mur du souvenir',
  'memorial.wall.empty': 'Soyez le premier à rendre hommage.',

  // Add tribute
  'memorial.add.title': 'Rendre hommage',
  'memorial.add.candle': 'Bougie',
  'memorial.add.message': 'Message',
  'memorial.add.photo': 'Photo',
  'memorial.add.video': 'Vidéo',
  'memorial.add.messagePlaceholder': 'Partagez un souvenir, un mot…',
  'memorial.add.choosePhoto': 'Choisir une photo',
  'memorial.add.chooseVideo': 'Choisir une vidéo',
  'memorial.add.submit': 'Publier l’hommage',
  'memorial.add.submitting': 'Envoi…',
  'memorial.added': 'Votre hommage a été publié.',
  'memorial.tribute.removed': 'Hommage retiré.',
  'memorial.deleteConfirm': 'Retirer cet hommage ?',
  'memorial.kind.CANDLE': 'a allumé une bougie',
  'memorial.kind.MESSAGE': 'a laissé un message',
  'memorial.kind.PHOTO': 'a partagé une photo',
  'memorial.kind.VIDEO': 'a partagé une vidéo',

  // Common
  'common.cancel': 'Annuler',
  'common.save': 'Enregistrer',
  'common.delete': 'Supprimer',
  'common.someone': 'Un proche',
  'common.error': 'Une erreur est survenue. Réessayez.',
};

const EN: Dict = {
  'albums.title': 'Albums',
  'albums.subtitle': 'A life in pictures, told over time.',
  'albums.create': 'New album',
  'albums.emptyTitle': 'No albums yet',
  'albums.emptyDesc': 'Create an album to document a loved one’s life, photo by photo.',
  'albums.itemCount': '{count} memory/ies',
  'albums.about': 'About {name}',
  'albums.openAlbum': 'Open album',

  'albums.kind.PERSONAL': 'Personal',
  'albums.kind.FAMILY': 'Family',
  'albums.kind.EVENT': 'Event',

  'albums.form.title': 'Album title',
  'albums.form.titlePlaceholder': 'E.g. Léa’s early years',
  'albums.form.description': 'Description',
  'albums.form.descriptionPlaceholder': 'A few words about this album…',
  'albums.form.kind': 'Album type',
  'albums.form.subject': 'Person it’s about (optional)',
  'albums.form.subjectHint': 'The album tells this person’s story.',
  'albums.form.submit': 'Create album',
  'albums.form.creating': 'Creating…',
  'albums.created': 'Album created.',

  'albums.timeline.empty': 'This album is still empty.',
  'albums.timeline.emptyDesc': 'Add a first photo to begin the story.',
  'albums.timeline.undated': 'Undated',
  'albums.addPhoto': 'Add a photo',
  'albums.item.added': 'Photo added to the album.',
  'albums.item.removed': 'Photo removed.',
  'albums.item.caption': 'Caption',
  'albums.item.captionPlaceholder': 'Describe this moment…',
  'albums.item.takenAt': 'Photo date',
  'albums.item.takenAtText': 'Approximate date',
  'albums.item.takenAtTextPlaceholder': 'E.g. Summer 1998',
  'albums.item.choosePhoto': 'Choose a photo',
  'albums.item.uploading': 'Uploading…',
  'albums.item.save': 'Add to timeline',
  'albums.deleteConfirm': 'Remove this photo from the album?',
  'albums.deleteAlbumConfirm': 'Delete this album and all its memories?',
  'albums.deleted': 'Album deleted.',

  'visibility.label': 'Visibility',
  'visibility.PRIVATE_SELF': 'Private (only me)',
  'visibility.FAMILY': 'Family',
  'visibility.PUBLIC': 'Public',
  'visibility.degree': 'Up to family degree {n}',

  'memorial.title': 'In memory of {name}',
  'memorial.subtitle': 'A place to honour and remember.',
  'memorial.notDeceased': 'The memorial space is only open for people who have passed away.',
  'memorial.candleCount': '{count} candle(s) lit',
  'memorial.tributeCount': '{count} tribute(s)',
  'memorial.lightCandle': 'Light a candle',
  'memorial.candleLit': 'A candle has been lit.',
  'memorial.wall.title': 'Wall of remembrance',
  'memorial.wall.empty': 'Be the first to pay tribute.',

  'memorial.add.title': 'Pay tribute',
  'memorial.add.candle': 'Candle',
  'memorial.add.message': 'Message',
  'memorial.add.photo': 'Photo',
  'memorial.add.video': 'Video',
  'memorial.add.messagePlaceholder': 'Share a memory, a few words…',
  'memorial.add.choosePhoto': 'Choose a photo',
  'memorial.add.chooseVideo': 'Choose a video',
  'memorial.add.submit': 'Post tribute',
  'memorial.add.submitting': 'Sending…',
  'memorial.added': 'Your tribute has been posted.',
  'memorial.tribute.removed': 'Tribute removed.',
  'memorial.deleteConfirm': 'Remove this tribute?',
  'memorial.kind.CANDLE': 'lit a candle',
  'memorial.kind.MESSAGE': 'left a message',
  'memorial.kind.PHOTO': 'shared a photo',
  'memorial.kind.VIDEO': 'shared a video',

  'common.cancel': 'Cancel',
  'common.save': 'Save',
  'common.delete': 'Delete',
  'common.someone': 'A relative',
  'common.error': 'Something went wrong. Please try again.',
};

const DICTS: Record<string, Dict> = { fr: FR, en: EN };

export function lmTranslate(
  locale: string,
  key: string,
  params?: Record<string, string | number>,
): string {
  const dict = DICTS[locale] ?? FR;
  let value = dict[key] ?? FR[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      value = value.replace(`{${k}}`, String(v));
    }
  }
  return value;
}

/** Hook reading the active locale from the UI store. */
export function useLmT() {
  const locale = useUiStore((s) => s.locale);
  return (key: string, params?: Record<string, string | number>) =>
    lmTranslate(locale, key, params);
}
