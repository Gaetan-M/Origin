import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:origin_mobile/core/routing/route_paths.dart';

// Auth feature — provided by Agent 5. See SHARED_CONTEXT.md.
import 'package:origin_mobile/features/auth/presentation/providers/auth_state_provider.dart';
import 'package:origin_mobile/features/auth/presentation/screens/done_screen.dart';
import 'package:origin_mobile/features/auth/presentation/screens/name_screen.dart';
import 'package:origin_mobile/features/auth/presentation/screens/otp_screen.dart';
import 'package:origin_mobile/features/auth/presentation/screens/parents_screen.dart';
import 'package:origin_mobile/features/auth/presentation/screens/phone_screen.dart';
import 'package:origin_mobile/features/auth/presentation/screens/photo_screen.dart';
import 'package:origin_mobile/features/auth/presentation/screens/siblings_screen.dart';
import 'package:origin_mobile/features/auth/presentation/screens/splash_screen.dart';

// Claims — provided by Agent 9.
import 'package:origin_mobile/features/claims/presentation/screens/claims_mine_screen.dart';
import 'package:origin_mobile/features/claims/presentation/screens/claims_pending_screen.dart';

// Family codes — provided by Agent 9.
import 'package:origin_mobile/features/family_codes/presentation/screens/family_code_redeem_screen.dart';
import 'package:origin_mobile/features/family_codes/presentation/screens/family_code_uses_screen.dart';
import 'package:origin_mobile/features/family_codes/presentation/screens/family_codes_screen.dart';

// Family tree — provided by Agent 7.
import 'package:origin_mobile/features/family_tree/presentation/screens/tree_screen.dart';

// Home shell — provided by Agent 5.
import 'package:origin_mobile/features/home_shell/presentation/home_shell.dart';

// Identity documents — provided by Agent 6.
import 'package:origin_mobile/features/identity_documents/presentation/screens/identity_doc_add_screen.dart';

// Invitations — provided by Agent 9.
import 'package:origin_mobile/features/invitations/presentation/screens/invitation_redeem_screen.dart';
import 'package:origin_mobile/features/invitations/presentation/screens/invitations_screen.dart';

// Kinship probe — provided by Agent 8.
import 'package:origin_mobile/features/kinship_probe/presentation/screens/kinship_probe_respond_screen.dart';
import 'package:origin_mobile/features/kinship_probe/presentation/screens/kinship_probe_screen.dart';

// Matching — provided by Agent 8.
import 'package:origin_mobile/features/matching/presentation/screens/match_suggestion_screen.dart';

// Media — provided by Agent 6.
import 'package:origin_mobile/features/media/presentation/screens/media_upload_screen.dart';

// Notifications — provided by Agent 9.
import 'package:origin_mobile/features/notifications/presentation/screens/notifications_screen.dart';

// Onboarding — provided by Agent 5.
import 'package:origin_mobile/features/onboarding/presentation/screens/value_prop_screen.dart';
import 'package:origin_mobile/features/onboarding/presentation/screens/welcome_screen.dart';

// Persons — provided by Agent 6.
import 'package:origin_mobile/features/persons/presentation/screens/person_detail_screen.dart';
import 'package:origin_mobile/features/persons/presentation/screens/person_edit_screen.dart';
import 'package:origin_mobile/features/persons/presentation/screens/person_new_screen.dart';

// Search — provided by Agent 8.
import 'package:origin_mobile/features/search/presentation/screens/search_screen.dart';

// Settings — provided by Agent 5.
import 'package:origin_mobile/features/settings/presentation/screens/settings_accessibility_screen.dart';
import 'package:origin_mobile/features/settings/presentation/screens/settings_account_screen.dart';
import 'package:origin_mobile/features/settings/presentation/screens/settings_home_screen.dart';
import 'package:origin_mobile/features/settings/presentation/screens/settings_language_screen.dart';
import 'package:origin_mobile/features/settings/presentation/screens/settings_security_screen.dart';

/// Root navigator key (top-level navigation, dialogs, etc.).
final GlobalKey<NavigatorState> _rootNavigatorKey =
    GlobalKey<NavigatorState>(debugLabel: 'rootNav');

/// Shell navigator key for the home tabs.
final GlobalKey<NavigatorState> _shellNavigatorKey =
    GlobalKey<NavigatorState>(debugLabel: 'shellNav');

/// Provides the app-wide [GoRouter] instance.
///
/// The router rebuilds when [authStateProvider] changes so the redirect
/// guard always sees the latest auth state. [authStateProvider] is an
/// `AsyncNotifierProvider<AuthStateNotifier, AuthState>` (Agent 5), so we
/// receive an [AsyncValue] which we collapse to a phase below.
final Provider<GoRouter> appRouterProvider = Provider<GoRouter>((ref) {
  final authAsync = ref.watch(authStateProvider);

  return GoRouter(
    navigatorKey: _rootNavigatorKey,
    initialLocation: RoutePaths.splash,
    debugLogDiagnostics: false,
    redirect: (context, state) => _redirect(authAsync, state),
    errorBuilder: (context, state) => const _NotFoundScreen(),
    routes: <RouteBase>[
      GoRoute(
        path: RoutePaths.splash,
        name: 'splash',
        builder: (context, state) => const SplashScreen(),
      ),

      // ── Onboarding ──
      GoRoute(
        path: RoutePaths.onboardingWelcome,
        name: 'onboarding-welcome',
        builder: (context, state) => const OnboardingWelcomeScreen(),
      ),
      GoRoute(
        path: RoutePaths.onboardingValueProp,
        name: 'onboarding-value-prop',
        builder: (context, state) => const OnboardingValuePropScreen(),
      ),

      // ── Auth flow ──
      GoRoute(
        path: RoutePaths.authPhone,
        name: 'auth-phone',
        builder: (context, state) => const AuthPhoneScreen(),
      ),
      GoRoute(
        path: RoutePaths.authOtp,
        name: 'auth-otp',
        builder: (context, state) => const AuthOtpScreen(),
      ),
      GoRoute(
        path: RoutePaths.authName,
        name: 'auth-name',
        builder: (context, state) => const AuthNameScreen(),
      ),
      GoRoute(
        path: RoutePaths.authPhoto,
        name: 'auth-photo',
        builder: (context, state) => const AuthPhotoScreen(),
      ),
      GoRoute(
        path: RoutePaths.authParents,
        name: 'auth-parents',
        builder: (context, state) => const AuthParentsScreen(),
      ),
      GoRoute(
        path: RoutePaths.authSiblings,
        name: 'auth-siblings',
        builder: (context, state) => const AuthSiblingsScreen(),
      ),
      GoRoute(
        path: RoutePaths.authDone,
        name: 'auth-done',
        builder: (context, state) => const AuthDoneScreen(),
      ),

      // ── Home shell with bottom-nav tabs ──
      ShellRoute(
        navigatorKey: _shellNavigatorKey,
        builder: (context, state, child) => HomeShell(child: child),
        routes: <RouteBase>[
          GoRoute(
            path: RoutePaths.homeTree,
            name: 'home-tree',
            pageBuilder: (context, state) => const NoTransitionPage<void>(
              child: FamilyTreeScreen(),
            ),
          ),
          GoRoute(
            path: RoutePaths.homeSearch,
            name: 'home-search',
            pageBuilder: (context, state) => const NoTransitionPage<void>(
              child: SearchScreen(),
            ),
          ),
          GoRoute(
            path: RoutePaths.homeNotifications,
            name: 'home-notifications',
            pageBuilder: (context, state) => const NoTransitionPage<void>(
              child: NotificationsScreen(),
            ),
          ),
          GoRoute(
            path: RoutePaths.homeProfile,
            name: 'home-profile',
            pageBuilder: (context, state) => const NoTransitionPage<void>(
              child: SettingsHomeScreen(),
            ),
          ),
        ],
      ),

      // ── Persons ──
      GoRoute(
        path: RoutePaths.personNew,
        name: 'person-new',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const PersonNewScreen(),
      ),
      GoRoute(
        path: RoutePaths.personDetailPattern,
        name: 'person-detail',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => PersonDetailScreen(
          personId: state.pathParameters['id'] ?? '',
        ),
      ),
      GoRoute(
        path: RoutePaths.personEditPattern,
        name: 'person-edit',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => PersonEditScreen(
          personId: state.pathParameters['id'] ?? '',
        ),
      ),

      // ── Identity documents & media ──
      GoRoute(
        path: RoutePaths.identityDocumentAdd,
        name: 'identity-doc-add',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => IdentityDocAddScreen(
          personId: state.uri.queryParameters['personId'],
        ),
      ),
      GoRoute(
        path: RoutePaths.mediaUpload,
        name: 'media-upload',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => MediaUploadScreen(
          personId: state.uri.queryParameters['personId'],
        ),
      ),

      // ── Claims ──
      GoRoute(
        path: RoutePaths.claimsPending,
        name: 'claims-pending',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const ClaimsPendingScreen(),
      ),
      GoRoute(
        path: RoutePaths.claimsMine,
        name: 'claims-mine',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const ClaimsMineScreen(),
      ),

      // ── Invitations ──
      GoRoute(
        path: RoutePaths.invitations,
        name: 'invitations',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const InvitationsScreen(),
      ),
      GoRoute(
        path: RoutePaths.invitationRedeem,
        name: 'invitation-redeem',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => InvitationRedeemScreen(
          token: state.uri.queryParameters['token'],
        ),
      ),

      // ── Family codes ──
      GoRoute(
        path: RoutePaths.familyCodes,
        name: 'family-codes',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const FamilyCodesScreen(),
      ),
      GoRoute(
        path: RoutePaths.familyCodeUsesPattern,
        name: 'family-code-uses',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => FamilyCodeUsesScreen(
          codeId: state.pathParameters['id'] ?? '',
        ),
      ),
      GoRoute(
        path: RoutePaths.familyCodeRedeem,
        name: 'family-code-redeem',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const FamilyCodeRedeemScreen(),
      ),

      // ── Kinship probe ──
      GoRoute(
        path: RoutePaths.kinshipProbe,
        name: 'kinship-probe',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const KinshipProbeScreen(),
      ),
      GoRoute(
        path: RoutePaths.kinshipProbeRespondPattern,
        name: 'kinship-probe-respond',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => KinshipProbeRespondScreen(
          probeId: state.pathParameters['probeId'] ?? '',
        ),
      ),

      // ── Matching ──
      GoRoute(
        path: RoutePaths.matchSuggestionPattern,
        name: 'match-suggestion',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => MatchSuggestionScreen(
          proposalId: state.pathParameters['id'] ?? '',
        ),
      ),

      // ── Settings ──
      GoRoute(
        path: RoutePaths.settingsAccount,
        name: 'settings-account',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const SettingsAccountScreen(),
      ),
      GoRoute(
        path: RoutePaths.settingsSecurity,
        name: 'settings-security',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const SettingsSecurityScreen(),
      ),
      GoRoute(
        path: RoutePaths.settingsAccessibility,
        name: 'settings-accessibility',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const SettingsAccessibilityScreen(),
      ),
      GoRoute(
        path: RoutePaths.settingsLanguage,
        name: 'settings-language',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const SettingsLanguageScreen(),
      ),
    ],
  );
});

/// Global redirect guard.
///
/// Rules:
/// 1. Auth state still loading → keep the splash screen.
/// 2. Unauthenticated user trying to reach a protected route → onboarding.
/// 3. Authenticated user lingering on auth/onboarding → home.
///
/// We pattern-match by runtime type name so the guard does not break if
/// Agent 5 names the sealed variants `AuthState.loading()` (freezed
/// union) or `AuthStateLoading` (plain sealed class). Both are
/// supported.
String? _redirect(AuthState authState, GoRouterState state) {
  final loc = state.matchedLocation;
  final phase = _phaseOf(authState);

  // 1) Loading: hold on splash, do not bounce around.
  if (phase == _AuthPhase.loading) {
    return loc == RoutePaths.splash ? null : RoutePaths.splash;
  }

  final isUnauthenticatedFlow =
      RoutePaths.matchesAny(loc, RoutePaths.unauthenticatedPrefixes);

  // 2) Unauthenticated.
  if (phase == _AuthPhase.unauthenticated) {
    if (isUnauthenticatedFlow) {
      return null;
    }
    return RoutePaths.onboardingWelcome;
  }

  // 3) Authenticated.
  if (phase == _AuthPhase.authenticated) {
    final inPostAuthBlocked =
        RoutePaths.matchesAny(loc, RoutePaths.postAuthRedirectAway) ||
            loc == RoutePaths.splash;
    if (inPostAuthBlocked) {
      return RoutePaths.homeTree;
    }
    return null;
  }

  return null;
}

/// Internal phase derived from [AuthState] runtime type.
enum _AuthPhase { loading, unauthenticated, authenticated, unknown }

_AuthPhase _phaseOf(AuthState s) {
  final n = s.runtimeType.toString().toLowerCase();
  // Order matters: 'unauthenticated' must be tested BEFORE 'authenticated'.
  if (n.contains('loading')) return _AuthPhase.loading;
  if (n.contains('unauthenticated')) return _AuthPhase.unauthenticated;
  if (n.contains('authenticated')) return _AuthPhase.authenticated;
  return _AuthPhase.unknown;
}

/// Minimal "page not found" view.
class _NotFoundScreen extends StatelessWidget {
  const _NotFoundScreen();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Page introuvable')),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              const Icon(Icons.help_outline, size: 64),
              const SizedBox(height: 16),
              const Text(
                "On n'a pas trouvé cette page.",
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 8),
              const Text(
                "Reviens à l'accueil et réessaie.",
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 24),
              FilledButton(
                onPressed: () =>
                    GoRouter.of(context).go(RoutePaths.homeTree),
                child: const Text("Retour à l'accueil"),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
