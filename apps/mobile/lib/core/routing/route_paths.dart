/// Centralised registry of GoRouter paths.
///
/// Keep these strings in one place so navigation code is grep-able and the
/// router config (see `app_router.dart`) stays the single source of truth.
abstract final class RoutePaths {
  // ────────────── Bootstrap & onboarding ──────────────
  static const String splash = '/splash';
  static const String onboardingWelcome = '/onboarding/welcome';
  static const String onboardingValueProp = '/onboarding/value-prop';

  // ────────────── Auth flow ──────────────
  static const String authPhone = '/auth/phone';
  static const String authOtp = '/auth/otp';
  static const String authName = '/auth/name';
  static const String authPhoto = '/auth/photo';
  static const String authParents = '/auth/parents';
  static const String authSiblings = '/auth/siblings';
  static const String authDone = '/auth/done';

  // ────────────── Home shell + tabs ──────────────
  static const String home = '/home';
  static const String homeDashboard = '/home/dashboard';
  static const String homeTree = '/home/tree';
  static const String homeConnect = '/home/connect';
  static const String homeSearch = '/home/search';
  static const String homeNotifications = '/home/notifications';
  static const String homeProfile = '/home/profile';

  // ────────────── Persons ──────────────
  static const String personNew = '/persons/new';
  static const String personDetailPattern = '/persons/:id';
  static const String personEditPattern = '/persons/:id/edit';
  static String personDetail(String id) => '/persons/$id';
  static String personEdit(String id) => '/persons/$id/edit';

  // ────────────── Identity documents & media ──────────────
  static const String identityDocumentAdd = '/identity-documents/add';
  static String identityDocumentAddFor(String personId) =>
      '$identityDocumentAdd?personId=$personId';

  static const String mediaUpload = '/media/upload';
  static String mediaUploadFor(String personId) =>
      '$mediaUpload?personId=$personId';

  // ────────────── Claims ──────────────
  static const String claimsPending = '/claims/pending';
  static const String claimsMine = '/claims/mine';

  // ────────────── Invitations ──────────────
  static const String invitations = '/invitations';
  static const String invitationRedeem = '/invitations/redeem';
  static String invitationRedeemWith(String token) =>
      '$invitationRedeem?token=$token';

  // ────────────── Family codes ──────────────
  static const String familyCodes = '/family-codes';
  static const String familyCodeUsesPattern = '/family-codes/:id/uses';
  static String familyCodeUses(String id) => '/family-codes/$id/uses';
  static const String familyCodeRedeem = '/family-codes/redeem';

  // ────────────── Kinship probe & matching ──────────────
  static const String kinshipProbe = '/kinship-probe';
  static const String kinshipProbeRespondPattern =
      '/kinship-probe/respond/:probeId';
  static String kinshipProbeRespond(String probeId) =>
      '/kinship-probe/respond/$probeId';

  static const String matchSuggestionPattern = '/match-suggestions/:id';
  static String matchSuggestion(String id) => '/match-suggestions/$id';

  // ────────────── Settings ──────────────
  static const String settingsAccount = '/settings/account';
  static const String settingsSecurity = '/settings/security';
  static const String settingsAccessibility = '/settings/accessibility';
  static const String settingsLanguage = '/settings/language';

  // ────────────── Helpers ──────────────
  /// Paths considered part of the unauthenticated flow.
  static const Set<String> unauthenticatedPrefixes = <String>{
    '/splash',
    '/onboarding',
    '/auth',
    '/invitations/redeem',
  };

  /// Paths the user must reach via the auth flow once authenticated.
  static const Set<String> postAuthRedirectAway = <String>{
    '/auth',
    '/onboarding',
  };

  /// Returns true when [location] starts with any [prefixes].
  static bool matchesAny(String location, Iterable<String> prefixes) {
    for (final p in prefixes) {
      if (location == p || location.startsWith('$p/')) {
        return true;
      }
    }
    return false;
  }
}
