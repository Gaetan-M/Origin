import 'package:flutter/widgets.dart';

import 'package:origin_mobile/features/explore/domain/tourism_enums.dart';

/// Self-contained bilingual (FR/EN) strings for the PUBLIC tourism surface.
///
/// Mirrors the web `tourism-i18n.ts` table. Kept local (per-feature) to stay
/// parallel-safe; INTEGRATION lists folding these into the central ARB later.
class TourismStrings {
  const TourismStrings(this.isFr);

  final bool isFr;

  factory TourismStrings.of(BuildContext context) {
    final code = Localizations.localeOf(context).languageCode.toLowerCase();
    return TourismStrings(code == 'fr');
  }

  String _t(String fr, String en) => isFr ? fr : en;

  String get title => _t('Tourisme', 'Tourism');
  String get subtitle => _t(
        'Lieux de patrimoine et de tourisme à découvrir',
        'Heritage and tourism places to discover',
      );

  String get empty => _t('Aucun lieu pour le moment', 'No places yet');
  String get emptyHint => _t(
        'Sites historiques, nature, musées et chefferies apparaîtront ici.',
        'Historic sites, nature, museums and chefferies will appear here.',
      );

  String get errorTitle => _t('Impossible de charger les lieux', 'Could not load places');
  String get errorSubtitle =>
      _t('Vérifie ta connexion et réessaie.', 'Check your connection and retry.');
  String get retry => _t('Réessayer', 'Try again');

  String get submit => _t('Proposer un lieu', 'Suggest a place');
  String get verified => _t('Vérifié', 'Verified');
  String get sourceLabel => _t('Source', 'Source');
  String get provenanceHint => _t(
        'Donnée fournie à titre de source citée. Origin reste indépendant.',
        'Data provided as a cited source. Origin stays independent.',
      );
  String get filterRegionHint => _t('Toutes les régions', 'All regions');
  String get filterAllCategories => _t('Toutes', 'All');
  String get verifiedOnly => _t('Vérifiés uniquement', 'Verified only');
  String get readMore => _t('Lire la suite', 'Read more');
  String get readLess => _t('Réduire', 'Show less');
  String get viewOnMap => _t('Voir sur la carte', 'View on map');

  // Submit form
  String get formTitle => _t('Proposer un lieu', 'Suggest a place');
  String get formSubtitle => _t(
        'Aidez à documenter le patrimoine. Indiquez votre source — elle sera vérifiée avant publication.',
        'Help document heritage. Cite your source — it will be verified before publishing.',
      );
  String get fieldName => _t('Nom du lieu', 'Place name');
  String get fieldNameHint => _t('Ex : Chefferie de Bafut', 'E.g. Bafut Palace');
  String get fieldDescription => _t('Description', 'Description');
  String get fieldDescriptionHint => _t(
        'Décrivez ce lieu, son histoire, son intérêt…',
        'Describe this place, its history, why it matters…',
      );
  String get fieldRegion => _t('Région', 'Region');
  String get fieldRegionHint => _t('Ex : Nord-Ouest, Ouest…', 'E.g. North-West, West…');
  String get fieldCategory => _t('Catégorie', 'Category');
  String get fieldSource => _t('Type de source', 'Source type');
  String get fieldSourceRef => _t('Référence de la source', 'Source reference');
  String get fieldSourceRefHint => _t(
        'Ex : URL du Ministère, nom de l\'ONG, document…',
        'E.g. Ministry URL, NGO name, document…',
      );
  String get fieldLatitude => _t('Latitude', 'Latitude');
  String get fieldLongitude => _t('Longitude', 'Longitude');
  String get optional => _t('facultatif', 'optional');
  String get submitAction => _t('Soumettre', 'Submit');
  String get submitting => _t('Envoi…', 'Sending…');
  String get cancel => _t('Annuler', 'Cancel');
  String get requiredName => _t('Le nom est obligatoire', 'A name is required');
  String get requiredSourceRef =>
      _t('Merci de citer votre source', 'Please cite your source');
  String get submitError => _t("Échec de l'envoi. Réessayez.", 'Submission failed. Try again.');
  String get submitSuccess => _t(
        'Merci ! Votre proposition sera vérifiée avant publication.',
        'Thank you! Your suggestion will be verified before publishing.',
      );
  String get moderationNote => _t(
        'Votre proposition et sa source seront vérifiées par notre équipe avant publication.',
        'Your suggestion and its source will be verified by our team before publishing.',
      );
  String get independenceNote => _t(
        'Les données officielles (Ministère / ONG) sont utilisées uniquement comme source citée. Origin ne cède aucun contrôle sur le graphe familial.',
        'Official data (Ministry / NGO) is used only as a cited source. Origin cedes no control over the family graph.',
      );

  String categoryLabel(TourismCategory category) {
    switch (category) {
      case TourismCategory.heritage:
        return _t('Patrimoine', 'Heritage');
      case TourismCategory.nature:
        return _t('Nature', 'Nature');
      case TourismCategory.culture:
        return _t('Culture', 'Culture');
      case TourismCategory.museum:
        return _t('Musée', 'Museum');
      case TourismCategory.chefferie:
        return _t('Chefferie', 'Chefferie');
      case TourismCategory.religious:
        return _t('Religieux', 'Religious');
      case TourismCategory.other:
        return _t('Autre', 'Other');
    }
  }

  String sourceLabelFor(TourismSource source) {
    switch (source) {
      case TourismSource.ministry:
        return _t('Ministère du Tourisme', 'Ministry of Tourism');
      case TourismSource.ngo:
        return _t('ONG', 'NGO');
      case TourismSource.community:
        return _t('Communauté', 'Community');
    }
  }
}
