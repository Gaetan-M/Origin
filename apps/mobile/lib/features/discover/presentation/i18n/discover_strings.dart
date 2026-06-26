import 'package:flutter/widgets.dart';

import 'package:origin_mobile/features/discover/domain/cultural_enums.dart';

/// Self-contained bilingual (FR/EN) strings for the PUBLIC discovery feature.
///
/// Kept local (rather than in the shared ARB dictionaries) so the discover
/// module ships as a set of NEW files only and stays parallel-safe. INTEGRATION
/// lists the keys to fold into `app_fr.arb` / `app_en.arb` later.
class DiscoverStrings {
  const DiscoverStrings(this.isFr);

  final bool isFr;

  factory DiscoverStrings.of(BuildContext context) {
    final code = Localizations.localeOf(context).languageCode.toLowerCase();
    return DiscoverStrings(code == 'fr');
  }

  String _t(String fr, String en) => isFr ? fr : en;

  String get title => _t('Découvrir', 'Discover');
  String get subtitle => _t(
        'Le patrimoine culturel partagé par la communauté',
        'Cultural heritage shared by the community',
      );

  String get emptyTitle => _t(
        'Rien à découvrir pour le moment',
        'Nothing to discover yet',
      );
  String get emptyHint => _t(
        'Langues, recettes, contes, proverbes, rites et coutumes apparaîtront ici.',
        'Languages, recipes, tales, proverbs, rites and customs will appear here.',
      );

  String get errorTitle => _t(
        'Impossible de charger la découverte',
        'Could not load discovery',
      );
  String get errorSubtitle =>
      _t('Vérifie ta connexion et réessaie.', 'Check your connection and retry.');
  String get retry => _t('Réessayer', 'Try again');

  String get loadMore => _t('Voir plus', 'Show more');
  String get loadingMore => _t('Chargement…', 'Loading…');

  String get share => _t('Partager', 'Share');
  String get verified => _t('Vérifié', 'Verified');
  String get verifiedAuthority => _t('Autorité vérifiée', 'Verified authority');
  String get filterAll => _t('Tout', 'All');
  String get readMore => _t('Lire la suite', 'Read more');
  String get readLess => _t('Réduire', 'Show less');

  // ── Submit form ──────────────────────────────────────────────
  String get formTitle => _t(
        'Partager un contenu culturel',
        'Share cultural content',
      );
  String get formSubtitle => _t(
        'Contribuez au patrimoine vivant. Votre contenu sera relu avant publication.',
        'Contribute to living heritage. Your content is reviewed before publishing.',
      );
  String get fieldType => _t('Type de contenu', 'Content type');
  String get fieldTitle => _t('Titre', 'Title');
  String get fieldTitleHint =>
      _t('Ex : Le conte de la tortue rusée', 'E.g. The tale of the clever tortoise');
  String get fieldBody => _t('Contenu', 'Content');
  String get fieldBodyHint => _t(
        'Racontez, expliquez, transmettez…',
        'Tell, explain, pass it on…',
      );
  String get fieldLanguage => _t('Langue', 'Language');
  String get fieldLanguageHint =>
      _t('Ex : Ewondo, Duala, Bamiléké…', 'E.g. Ewondo, Duala, Bamileke…');
  String get fieldRegion => _t('Région', 'Region');
  String get fieldRegionHint => _t('Ex : Ouest, Littoral…', 'E.g. West, Littoral…');
  String get fieldEthnicGroup => _t('Groupe ethnique', 'Ethnic group');
  String get fieldEthnicGroupHint =>
      _t('Ex : Bamiléké, Beti, Bassa…', 'E.g. Bamileke, Beti, Bassa…');
  String get optional => _t('facultatif', 'optional');
  String get submit => _t('Soumettre', 'Submit');
  String get submitting => _t('Envoi…', 'Sending…');
  String get cancel => _t('Annuler', 'Cancel');
  String get requiredTitle => _t('Le titre est obligatoire', 'A title is required');
  String get submitError =>
      _t("Échec de l'envoi. Réessaie.", 'Submission failed. Try again.');
  String get submitSuccess => _t(
        'Merci ! Ta contribution sera relue avant publication.',
        'Thank you! Your contribution will be reviewed before publishing.',
      );
  String get moderationNote => _t(
        'Votre contribution sera examinée par notre équipe avant publication.',
        'Your contribution will be reviewed by our team before publishing.',
      );

  /// Bilingual label for a cultural content type.
  String contentTypeLabel(CulturalContentType type) {
    switch (type) {
      case CulturalContentType.language:
        return _t('Langue', 'Language');
      case CulturalContentType.recipe:
        return _t('Recette', 'Recipe');
      case CulturalContentType.tale:
        return _t('Conte', 'Tale');
      case CulturalContentType.proverb:
        return _t('Proverbe', 'Proverb');
      case CulturalContentType.rite:
        return _t('Rite', 'Rite');
      case CulturalContentType.custom:
        return _t('Coutume', 'Custom');
      case CulturalContentType.music:
        return _t('Musique', 'Music');
      case CulturalContentType.other:
        return _t('Autre', 'Other');
    }
  }

  /// Locale string for date formatting.
  String get dateLocale => isFr ? 'fr_FR' : 'en_GB';
}
