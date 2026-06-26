import 'package:flutter/widgets.dart';

import 'package:origin_mobile/features/memory/domain/album.dart';
import 'package:origin_mobile/features/memory/domain/memorial.dart';
import 'package:origin_mobile/features/memory/domain/visibility_scope.dart';

/// Self-contained bilingual (FR/EN) strings for the Living Memory feature
/// (albums + memorial). Mirrors the family-feed pattern to stay parallel-safe:
/// it ships its own FR/EN table keyed on the current locale rather than the
/// generated ARB localisation (owned/edited elsewhere). INTEGRATION lists the
/// keys to fold into `app_fr.arb` / `app_en.arb` later.
class MemoryStrings {
  const MemoryStrings(this.isFr);

  final bool isFr;

  factory MemoryStrings.of(BuildContext context) {
    final code = Localizations.localeOf(context).languageCode.toLowerCase();
    return MemoryStrings(code == 'fr');
  }

  String _t(String fr, String en) => isFr ? fr : en;

  // ── Common ──
  String get cancel => _t('Annuler', 'Cancel');
  String get delete => _t('Supprimer', 'Delete');
  String get save => _t('Enregistrer', 'Save');
  String get someone => _t('Quelqu\'un', 'Someone');
  String get errorTitle => _t("Ça n'a pas chargé", "That didn't load");
  String get errorSubtitle => _t(
        'Vérifie ta connexion et réessaie.',
        'Check your connection and retry.',
      );
  String get genericError =>
      _t('Une erreur est survenue.', 'Something went wrong.');

  // ── Albums list ──
  String get albumsTitle => _t('Albums', 'Albums');
  String get albumsSubtitle => _t(
        'Des souvenirs en images, classés dans le temps.',
        'Memories in pictures, kept in order of time.',
      );
  String get albumsEmptyTitle => _t('Aucun album', 'No albums yet');
  String get albumsEmptyDesc => _t(
        'Crée un album pour rassembler vos photos de famille.',
        'Create an album to gather your family photos.',
      );
  String get createAlbum => _t('Créer un album', 'Create album');
  String albumAbout(String name) => _t('À propos de $name', 'About $name');
  String itemCount(int count) {
    if (isFr) return count <= 1 ? '$count photo' : '$count photos';
    return count <= 1 ? '$count photo' : '$count photos';
  }

  String albumKind(AlbumKind kind) {
    switch (kind) {
      case AlbumKind.personal:
        return _t('Personnel', 'Personal');
      case AlbumKind.family:
        return _t('Famille', 'Family');
      case AlbumKind.event:
        return _t('Événement', 'Event');
    }
  }

  // ── Create album ──
  String get createAlbumTitle => _t('Nouvel album', 'New album');
  String get fieldTitle => _t('Titre', 'Title');
  String get fieldTitleHint =>
      _t('Ex. : Mariage de Mama Ngo', 'e.g. Mama Ngo\'s wedding');
  String get fieldDescription => _t('Description', 'Description');
  String get fieldDescriptionHint =>
      _t('Quelques mots (facultatif)', 'A few words (optional)');
  String get fieldKind => _t('Type', 'Kind');
  String get creating => _t('Création…', 'Creating…');
  String get albumCreated => _t('Album créé', 'Album created');

  // ── Album detail / timeline ──
  String get addPhoto => _t('Ajouter une photo', 'Add a photo');
  String get timelineEmptyTitle =>
      _t('Album vide', 'Empty album');
  String get timelineEmptyDesc => _t(
        'Ajoute une première photo pour commencer la chronologie.',
        'Add a first photo to start the timeline.',
      );
  String get undated => _t('Date inconnue', 'Undated');
  String get deletePhotoConfirm =>
      _t('Retirer cette photo ?', 'Remove this photo?');
  String get deleteAlbumConfirm => _t(
        'Supprimer cet album ? Cette action est définitive.',
        'Delete this album? This cannot be undone.',
      );
  String get photoRemoved => _t('Photo retirée', 'Photo removed');
  String get albumDeleted => _t('Album supprimé', 'Album deleted');

  // ── Add album item ──
  String get choosePhoto => _t('Choisir une photo', 'Choose a photo');
  String get fieldCaption => _t('Légende', 'Caption');
  String get fieldCaptionHint =>
      _t('Décris ce moment (facultatif)', 'Describe this moment (optional)');
  String get fieldTakenAt => _t('Date de la photo', 'Date taken');
  String get fieldTakenAtText => _t('Date approximative', 'Approximate date');
  String get fieldTakenAtTextHint => _t('Ex. : Été 1998', 'e.g. Summer 1998');
  String get pickDate => _t('Choisir une date', 'Pick a date');
  String get uploading => _t('Envoi…', 'Uploading…');
  String get photoAdded => _t('Photo ajoutée', 'Photo added');

  // ── Visibility ──
  String get visibilityLabel => _t('Visibilité', 'Visibility');
  String visibility(MemoryVisibilityScope scope) {
    switch (scope) {
      case MemoryVisibilityScope.privateSelf:
        return _t('Privé', 'Private');
      case MemoryVisibilityScope.family:
        return _t('Famille', 'Family');
      case MemoryVisibilityScope.public:
        return _t('Public', 'Public');
    }
  }

  // ── Memorial ──
  String memorialTitle(String name) =>
      _t('En mémoire de $name', 'In memory of $name');
  String get memorialSubtitle => _t(
        'Un espace pour se souvenir et rendre hommage.',
        'A space to remember and pay tribute.',
      );
  String get notDeceased => _t(
        'Cet espace mémoriel est réservé aux personnes décédées.',
        'This memorial space is only for those who have passed away.',
      );
  String candleCount(int count) => _t(
        count <= 1 ? '$count bougie' : '$count bougies',
        count <= 1 ? '$count candle' : '$count candles',
      );
  String tributeCount(int count) => _t(
        count <= 1 ? '$count hommage' : '$count hommages',
        count <= 1 ? '$count tribute' : '$count tributes',
      );

  String get wallTitle => _t('Mur d\'hommages', 'Tribute wall');
  String get wallEmpty => _t(
        'Sois le premier à allumer une bougie ou laisser un mot.',
        'Be the first to light a candle or leave a word.',
      );

  String get addTribute => _t('Rendre hommage', 'Pay tribute');
  String get lightCandle => _t('Allumer une bougie', 'Light a candle');
  String get tributeMessageHint => _t(
        'Partage un souvenir, un mot…',
        'Share a memory, a word…',
      );
  String get chooseTributePhoto => _t('Choisir une photo', 'Choose a photo');
  String get chooseTributeVideo => _t('Choisir une vidéo', 'Choose a video');
  String get submitting => _t('Envoi…', 'Sending…');
  String get candleLit => _t('Bougie allumée', 'Candle lit');
  String get tributeAdded => _t('Hommage publié', 'Tribute shared');
  String get tributeRemoved => _t('Hommage retiré', 'Tribute removed');
  String get deleteTributeConfirm =>
      _t('Retirer cet hommage ?', 'Remove this tribute?');
  String get videoTribute => _t('Vidéo', 'Video');

  String tributeKindVerb(MemorialTributeKind kind) {
    switch (kind) {
      case MemorialTributeKind.candle:
        return _t('a allumé une bougie', 'lit a candle');
      case MemorialTributeKind.message:
        return _t('a laissé un mot', 'left a message');
      case MemorialTributeKind.photo:
        return _t('a partagé une photo', 'shared a photo');
      case MemorialTributeKind.video:
        return _t('a partagé une vidéo', 'shared a video');
    }
  }

  String tributeKindLabel(MemorialTributeKind kind) {
    switch (kind) {
      case MemorialTributeKind.candle:
        return _t('Bougie', 'Candle');
      case MemorialTributeKind.message:
        return _t('Message', 'Message');
      case MemorialTributeKind.photo:
        return _t('Photo', 'Photo');
      case MemorialTributeKind.video:
        return _t('Vidéo', 'Video');
    }
  }

  // ── Dates ──
  static const List<String> _monthsFr = <String>[
    'janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet',
    'août', 'septembre', 'octobre', 'novembre', 'décembre',
  ];
  static const List<String> _monthsEn = <String>[
    'January', 'February', 'March', 'April', 'May', 'June', 'July',
    'August', 'September', 'October', 'November', 'December',
  ];

  /// "12 août 1998" / "12 August 1998".
  String formatDate(DateTime date) {
    final months = isFr ? _monthsFr : _monthsEn;
    final month = months[(date.month - 1).clamp(0, 11)];
    return '${date.day} $month ${date.year}';
  }

  /// Human label for an album item's date: the fuzzy text wins, then the exact
  /// ISO date, then a generic "undated" fallback.
  String formatTaken(String? takenAt, String? takenAtText) {
    if (takenAtText != null && takenAtText.trim().isNotEmpty) {
      return takenAtText.trim();
    }
    if (takenAt != null && takenAt.isNotEmpty) {
      final parsed = DateTime.tryParse(takenAt);
      if (parsed != null) return formatDate(parsed);
    }
    return undated;
  }
}
