import 'package:flutter/widgets.dart';

import 'package:origin_mobile/features/kinship_check/domain/kinship_check.dart';

/// Self-contained bilingual (FR/EN) strings for the "Sommes-nous parents ?"
/// feature.
///
/// Kept local (rather than in the generated ARB dictionaries) so the feature
/// ships as NEW files only and stays parallel-safe. INTEGRATION lists the keys
/// to fold into `app_fr.arb` / `app_en.arb` later. Ported from the web copy in
/// apps/web/src/components/kinship/kinship-i18n.ts.
class KinshipStrings {
  const KinshipStrings(this.isFr);

  final bool isFr;

  factory KinshipStrings.of(BuildContext context) {
    final code = Localizations.localeOf(context).languageCode.toLowerCase();
    return KinshipStrings(code == 'fr');
  }

  String _t(String fr, String en) => isFr ? fr : en;

  // ── Header ──────────────────────────────────────────────────────────────
  String get title => _t('Sommes-nous parents ?', 'Are we related?');
  String get subtitle => _t(
        'Vérifiez en toute discrétion si vous partagez un lien familial avec une autre personne.',
        'Discreetly check whether you share a family connection with another person.',
      );
  String get privacyTitle => _t('Confidentialité avant tout', 'Privacy first');
  String get privacyBody => _t(
        "Nous ne révélons jamais votre arbre, vos ancêtres ni aucun nom. Le résultat indique uniquement s'il existe un lien et, le cas échéant, sa nature. Les deux personnes doivent donner leur accord avant tout calcul.",
        'We never reveal your tree, your ancestors or any names. The result only tells you whether a connection exists and, if so, its nature. Both people must agree before anything is computed.',
      );

  // ── Initiate form ───────────────────────────────────────────────────────
  String get initiateTitle => _t('Lancer une vérification', 'Start a check');
  String get initiateHint => _t(
        "Indiquez le numéro de téléphone d'un proche ou un code famille. L'autre personne devra accepter avant que le lien ne soit calculé.",
        'Enter a relative’s phone number or a family code. The other person must accept before the connection is computed.',
      );
  String get methodPhone => _t('Par téléphone', 'By phone');
  String get methodCode => _t('Par code famille', 'By family code');
  String get phoneLabel => _t('Numéro de téléphone', 'Phone number');
  String get phonePlaceholder => '+237 6 XX XX XX XX';
  String get codeLabel => _t('Code famille', 'Family code');
  String get codePlaceholder => _t('ex. MBALLA-2847', 'e.g. MBALLA-2847');
  String get consentNote => _t(
        "En lançant la vérification, vous consentez à ce que votre lien soit calculé. L'autre personne sera invitée à consentir à son tour.",
        'By starting the check, you consent to your connection being computed. The other person will be invited to consent in turn.',
      );
  String get submit => _t('Demander le consentement', 'Request consent');
  String get submitting => _t('Envoi...', 'Sending...');
  String get invalidPhone => _t(
        'Entrez un numéro au format international (+237...).',
        'Enter a number in international format (+237...).',
      );
  String get invalidCode => _t(
        'Entrez un code famille valide.',
        'Enter a valid family code.',
      );
  String get initiateSuccess => _t(
        'Demande envoyée. En attente du consentement.',
        'Request sent. Awaiting consent.',
      );
  String get initiateError => _t(
        "La demande n'a pas pu être envoyée. Réessayez.",
        'The request could not be sent. Please try again.',
      );

  // ── Lists ───────────────────────────────────────────────────────────────
  String get incomingTitle => _t('Demandes reçues', 'Requests received');
  String get outgoingTitle => _t('Mes demandes', 'My requests');
  String get incomingEmpty =>
      _t('Aucune demande reçue pour le moment.', 'No requests received yet.');
  String get outgoingEmpty => _t(
        "Vous n'avez lancé aucune vérification.",
        'You have not started any checks.',
      );
  String get listError =>
      _t('Impossible de charger les vérifications.', 'Could not load the checks.');
  String get retry => _t('Réessayer', 'Try again');
  String get someone => _t('Une personne', 'Someone');
  String get invitedByPhoneLabel =>
      _t('Invité par téléphone', 'Invited by phone');
  String get requestedBy => _t('Demande de', 'Request from');
  String get sentTo => _t('Demande à', 'Request to');

  // ── Actions ─────────────────────────────────────────────────────────────
  String get consent => _t('Consentir', 'Consent');
  String get decline => _t('Refuser', 'Decline');
  String get cancel => _t('Annuler la demande', 'Cancel request');
  String get consenting => _t('Calcul en cours...', 'Computing...');
  String get consentBody => _t(
        'Acceptez-vous de vérifier votre lien familial ? Aucun détail de votre arbre ne sera partagé.',
        'Do you agree to check your family connection? No detail of your tree will be shared.',
      );
  String get actionError => _t(
        "L'action n'a pas pu aboutir. Réessayez.",
        'The action could not be completed. Please try again.',
      );

  // ── Result ──────────────────────────────────────────────────────────────
  String get resultRelatedTitle => _t(
        'Vous partagez un lien familial',
        'You share a family connection',
      );
  String get resultUnrelatedTitle =>
      _t('Aucun lien trouvé', 'No connection found');
  String get resultUnrelatedBody => _t(
        "Aucun lien familial n'a été détecté entre vous, dans la limite de ce que notre graphe connaît aujourd'hui.",
        'No family connection was detected between you, within what our graph knows today.',
      );
  String get resultDegree => _t('Degré de parenté', 'Degree of kinship');
  String get resultPrivacyFooter => _t(
        "Seul le lien est révélé — jamais les noms, les ancêtres ni l'arbre de l'une ou l'autre personne.",
        'Only the connection is revealed — never the names, ancestors or tree of either person.',
      );

  /// Locale-aware status label for a check, given its [direction].
  String statusLabel(KinshipCheckStatus status, KinshipCheckDirection direction) {
    final isIncoming = direction == KinshipCheckDirection.incoming;
    switch (status) {
      case KinshipCheckStatus.pendingConsent:
        return isIncoming
            ? _t('En attente de votre réponse', 'Awaiting your response')
            : _t('En attente du consentement', 'Awaiting consent');
      case KinshipCheckStatus.consented:
        return _t('Consentement donné — calcul...', 'Consent given — computing...');
      case KinshipCheckStatus.declined:
        return _t('Refusée', 'Declined');
      case KinshipCheckStatus.computed:
        return _t('Résultat disponible', 'Result available');
      case KinshipCheckStatus.expired:
        return _t('Expirée', 'Expired');
      case KinshipCheckStatus.cancelled:
        return _t('Annulée', 'Cancelled');
      case KinshipCheckStatus.unknown:
        return _t('Statut inconnu', 'Unknown status');
    }
  }

  /// Localised relationship label from the server-computed result.
  String resultLabel(KinshipResult result) =>
      isFr ? result.labelFr : result.labelEn;
}
