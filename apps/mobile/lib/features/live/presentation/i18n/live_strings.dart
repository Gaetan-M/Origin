import 'package:flutter/widgets.dart';

import 'package:origin_mobile/features/live/domain/live_enums.dart';

/// Self-contained bilingual (FR/EN) strings for the LIVE (Phase 5) feature.
///
/// Kept local (rather than in the central ARB dictionaries) to stay
/// parallel-safe — see INTEGRATION about folding these keys into
/// `app_fr.arb` / `app_en.arb` later, plus a `nav.lives` entry.
class LiveStrings {
  const LiveStrings(this.isFr);

  final bool isFr;

  factory LiveStrings.of(BuildContext context) {
    final code = Localizations.localeOf(context).languageCode.toLowerCase();
    return LiveStrings(code == 'fr');
  }

  String _t(String fr, String en) => isFr ? fr : en;

  // List screen
  String get title => _t('En direct', 'Live');
  String get subtitle => _t(
        'Cérémonies, conseils de famille, leçons et masterclass en direct',
        'Ceremonies, family councils, lessons and masterclasses, live',
      );
  String get schedule => _t('Programmer', 'Schedule');
  String get sectionLive => _t('En cours', 'Happening now');
  String get sectionUpcoming => _t('À venir', 'Upcoming');
  String get sectionPast => _t('Terminés', 'Past');
  String get empty => _t('Aucun direct pour le moment', 'No live sessions yet');
  String get emptyHint => _t(
        'Programmez une cérémonie, un conseil de famille ou une leçon en direct.',
        'Schedule a ceremony, a family council or a live lesson.',
      );
  String get error => _t('Impossible de charger les directs', 'Could not load live sessions');
  String get retry => _t('Réessayer', 'Try again');
  String get join => _t('Rejoindre', 'Join');
  String get watchReplay => _t('Voir le replay', 'Watch replay');
  String get liveBadge => _t('EN DIRECT', 'LIVE');
  String get hostedBy => _t('Animé par', 'Hosted by');
  String get scheduledFor => _t('Prévu le', 'Scheduled for');

  // Live room
  String get roomLoading => _t('Connexion au direct…', 'Connecting to the live…');
  String get comingSoonTitle =>
      _t('Le direct s’ouvre sur le web pour l’instant', 'Live opens on web for now');
  String get comingSoonBody => _t(
        "L'appli mobile rejoindra bientôt le direct nativement. En attendant, "
            'ouvrez ce direct depuis le web pour participer.',
        'The mobile app will join lives natively soon. In the meantime, open '
            'this live from the web to take part.',
      );
  String get notConfigured => _t(
        "La diffusion en direct n'est pas encore configurée sur ce serveur.",
        'Live streaming is not configured on this server yet.',
      );
  String get backToList => _t('Retour aux directs', 'Back to live sessions');
  String get audioFirstNote => _t(
        'Les directs sont audio d’abord, pensés pour les connexions lentes.',
        'Lives are audio-first, designed for slow connections.',
      );

  // Replay
  String get replayPreparing =>
      _t('Le replay est en cours de préparation.', 'The replay is being prepared.');
  String get replayUnavailable =>
      _t("Le replay n'est pas disponible.", 'The replay is not available.');
  String get replayAudio => _t('Replay audio', 'Audio replay');
  String get replayVideo => _t('Replay vidéo', 'Video replay');
  String get openReplay => _t('Ouvrir le replay', 'Open replay');

  // Schedule form
  String get formTitle => _t('Programmer un direct', 'Schedule a live');
  String get formSubtitle => _t(
        'Préparez une diffusion en direct pour votre famille ou le public.',
        'Set up a live broadcast for your family or the public.',
      );
  String get fieldTitle => _t('Titre', 'Title');
  String get fieldTitlePlaceholder =>
      _t('Ex : Veillée en hommage à…', 'E.g. Tribute vigil for…');
  String get fieldKind => _t('Type de direct', 'Live type');
  String get fieldDescription => _t('Description', 'Description');
  String get fieldDescriptionPlaceholder =>
      _t('De quoi parle ce direct ?', 'What is this live about?');
  String get fieldVisibility => _t('Visibilité', 'Visibility');
  String get fieldScheduledAt => _t('Date et heure', 'Date and time');
  String get pickDateTime => _t('Choisir une date', 'Pick a date');
  String get startNow => _t('Démarrer maintenant', 'Start now');
  String get optional => _t('facultatif', 'optional');
  String get submit => _t('Programmer', 'Schedule');
  String get submitting => _t('Programmation…', 'Scheduling…');
  String get cancel => _t('Annuler', 'Cancel');
  String get requiredTitle => _t('Le titre est obligatoire', 'A title is required');
  String get submitError =>
      _t('Échec de la programmation. Réessayez.', 'Scheduling failed. Try again.');

  String kindLabel(LiveSessionKind kind) {
    switch (kind) {
      case LiveSessionKind.ceremony:
        return _t('Cérémonie', 'Ceremony');
      case LiveSessionKind.familyCouncil:
        return _t('Conseil de famille', 'Family council');
      case LiveSessionKind.lesson:
        return _t('Leçon', 'Lesson');
      case LiveSessionKind.storytelling:
        return _t('Conte', 'Storytelling');
      case LiveSessionKind.masterclass:
        return _t('Masterclass', 'Masterclass');
      case LiveSessionKind.other:
        return _t('Autre', 'Other');
    }
  }

  String visibilityLabel(LiveVisibilityScope scope) {
    switch (scope) {
      case LiveVisibilityScope.privateSelf:
        return _t('Privé', 'Private');
      case LiveVisibilityScope.family:
        return _t('Famille', 'Family');
      case LiveVisibilityScope.public:
        return _t('Public', 'Public');
    }
  }

  String statusLabel(LiveSessionStatus status) {
    switch (status) {
      case LiveSessionStatus.scheduled:
        return _t('Programmé', 'Scheduled');
      case LiveSessionStatus.live:
        return _t('En direct', 'Live');
      case LiveSessionStatus.ended:
        return _t('Terminé', 'Ended');
      case LiveSessionStatus.cancelled:
        return _t('Annulé', 'Cancelled');
      case LiveSessionStatus.unknown:
        return _t('Direct', 'Live');
    }
  }
}
