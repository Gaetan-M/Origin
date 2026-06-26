import 'package:flutter/widgets.dart';

import 'package:origin_mobile/features/explore/domain/learning_enums.dart';

/// Self-contained bilingual (FR/EN) strings for the LEARNING surface.
///
/// Mirrors the web `learning-i18n.ts` table. Kept local (per-feature) to stay
/// parallel-safe; INTEGRATION lists folding these into the central ARB later.
class LearningStrings {
  const LearningStrings(this.isFr);

  final bool isFr;

  factory LearningStrings.of(BuildContext context) {
    final code = Localizations.localeOf(context).languageCode.toLowerCase();
    return LearningStrings(code == 'fr');
  }

  String _t(String fr, String en) => isFr ? fr : en;

  String get title => _t('Apprendre', 'Learn');
  String get subtitle => _t(
        'Mini-leçons pour préserver les langues et la culture',
        'Mini-lessons to preserve languages and culture',
      );

  String get empty => _t('Aucune leçon pour le moment', 'No lessons yet');
  String get emptyHint => _t(
        'Les leçons de langue et de culture apparaîtront ici.',
        'Language and culture lessons will appear here.',
      );

  String get errorTitle => _t('Impossible de charger les leçons', 'Could not load lessons');
  String get errorSubtitle =>
      _t('Vérifie ta connexion et réessaie.', 'Check your connection and retry.');
  String get retry => _t('Réessayer', 'Try again');

  String get verified => _t('Vérifié', 'Verified');
  String get verifiedAuthority => _t('Autorité vérifiée', 'Verified authority');
  String get ticketed => _t('Accès premium', 'Premium access');
  String get filterLanguageHint => _t('Filtrer par langue', 'Filter by language');
  String get filterAllLevels => _t('Tous', 'All');
  String get by => _t('Par', 'By');

  // Lesson detail
  String get notFound => _t('Leçon introuvable', 'Lesson not found');
  String get backToLessons => _t('Retour aux leçons', 'Back to lessons');
  String get enroll => _t("S'inscrire", 'Enrol');
  String get enrolling => _t('Inscription…', 'Enrolling…');
  String get enrolled => _t('Inscrit', 'Enrolled');
  String get progress => _t('Progression', 'Progress');
  String get markComplete => _t('Marquer comme terminé', 'Mark as complete');
  String get completed => _t('Terminé', 'Completed');
  String get updating => _t('Mise à jour…', 'Updating…');
  String get yourProgress => _t('Votre progression', 'Your progress');
  String get lessonContent => _t('Contenu de la leçon', 'Lesson content');
  String get noContent => _t(
        'Le contenu de cette leçon sera bientôt disponible.',
        'The content for this lesson is coming soon.',
      );
  String get ticketedNote => _t(
        'Cette leçon est premium et peut être liée à une session live. Inscrivez-vous pour y accéder.',
        'This lesson is premium and may be linked to a live session. Enrol to access it.',
      );
  String get joinLive => _t('Rejoindre le live', 'Join live');
  String get enrollPrompt => _t(
        'Inscrivez-vous pour suivre votre progression.',
        'Enrol to track your progress.',
      );
  String get enrollError =>
      _t("Échec. Réessayez dans un instant.", 'Failed. Try again in a moment.');

  String levelLabel(LearningLevel level) {
    switch (level) {
      case LearningLevel.beginner:
        return _t('Débutant', 'Beginner');
      case LearningLevel.intermediate:
        return _t('Intermédiaire', 'Intermediate');
      case LearningLevel.advanced:
        return _t('Avancé', 'Advanced');
    }
  }
}
