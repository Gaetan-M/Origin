import 'package:flutter/widgets.dart';

import 'package:origin_mobile/features/family_feed/domain/feed_enums.dart';

/// Self-contained bilingual (FR/EN) strings for the family feed.
///
/// The rest of the app is migrating to generated ARB localisation. To stay
/// parallel-safe (the ARB files are owned/edited elsewhere) this feature ships
/// its own FR/EN table keyed on the current locale. INTEGRATION lists the keys
/// to fold into `app_fr.arb` / `app_en.arb` later — the call sites can then be
/// swapped to `AppLocalizations` without touching layout.
class FeedStrings {
  const FeedStrings(this.isFr);

  final bool isFr;

  factory FeedStrings.of(BuildContext context) {
    final code = Localizations.localeOf(context).languageCode.toLowerCase();
    return FeedStrings(code == 'fr');
  }

  String _t(String fr, String en) => isFr ? fr : en;

  String get title => _t('Fil familial', 'Family feed');

  String get emptyTitle => _t('Rien pour le moment', 'Nothing yet');
  String get emptySubtitle => _t(
        'Quand ta famille partagera des nouvelles, tu les verras ici.',
        'When your family shares news, it will show up here.',
      );

  String get offlineBanner => _t(
        'Hors ligne — dernières nouvelles enregistrées',
        'Offline — showing your last saved news',
      );

  String get errorTitle => _t("Ça n'a pas chargé", "That didn't load");
  String get errorSubtitle =>
      _t('Vérifie ta connexion et réessaie.', 'Check your connection and retry.');

  String get react => _t('Réagir', 'React');
  String get comment => _t('Commenter', 'Comment');
  String get comments => _t('Commentaires', 'Comments');
  String get noComments =>
      _t('Sois le premier à écrire un mot.', 'Be the first to say something.');
  String get writeComment => _t('Écris un mot…', 'Write a message…');
  String get send => _t('Envoyer', 'Send');
  String get pending => _t('En attente d\'envoi', 'Waiting to send');

  String get showMedia => _t('Afficher la photo', 'Show photo');
  String get lowDataNote =>
      _t('Mode éco-données : média différé', 'Data saver: media deferred');
  String get playAudio => _t('Écouter', 'Play');

  String reactionLabel(FeedReactionType type) {
    switch (type) {
      case FeedReactionType.like:
        return _t('J\'aime', 'Like');
      case FeedReactionType.love:
        return _t('Amour', 'Love');
      case FeedReactionType.pray:
        return _t('Prière', 'Pray');
      case FeedReactionType.sad:
        return _t('Triste', 'Sad');
      case FeedReactionType.celebrate:
        return _t('Bravo', 'Celebrate');
    }
  }

  /// Headline summarising a life-event post.
  String lifeEventHeadline(FeedLifeEventKind kind, String? name) {
    final who = (name == null || name.isEmpty) ? _t('Quelqu\'un', 'Someone') : name;
    switch (kind) {
      case FeedLifeEventKind.birth:
        return _t('Naissance de $who', 'Birth of $who');
      case FeedLifeEventKind.death:
        return _t('$who nous a quittés', '$who has passed away');
      case FeedLifeEventKind.union:
        return _t('Union de $who', 'Union of $who');
      case FeedLifeEventKind.unknown:
        return who;
    }
  }
}
