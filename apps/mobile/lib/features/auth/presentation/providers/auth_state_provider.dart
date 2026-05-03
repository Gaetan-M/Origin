import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

// NOTE on imports from sibling agents:
// The following symbols are owned by other agents and assumed to exist with
// the contracts defined in `apps/mobile/.work/SHARED_CONTEXT.md`:
//   - Agent 3 : `authApiProvider`, `Account` (DTO), `AuthTokens` (DTO),
//                `OtpChannel` enum.
//   - Agent 4 : `tokenStorageProvider`, `appDatabaseProvider`,
//                `kvStoreProvider` (write `firstLaunchComplete`).
// We import them via their advertised package paths. If these files are not
// yet on disk when this notifier is compiled in isolation, the analyzer will
// flag the missing symbols — that is intentional and expected during the
// parallel build. Once the other agents land, everything resolves.
import 'package:origin_mobile/data/api/auth_api.dart';
import 'package:origin_mobile/data/models/account.dart';
import 'package:origin_mobile/data/models/auth_tokens.dart';
import 'package:origin_mobile/data/models/otp_channel.dart';
import 'package:origin_mobile/core/storage/secure_storage.dart';
import 'package:origin_mobile/core/storage/app_database.dart';
import 'package:origin_mobile/core/storage/kv_store.dart';

/// Sealed authentication state surfaced to the rest of the app.
///
/// The router (Agent 1) inspects this to decide between
/// `splash` / `onboarding` / `home`.
sealed class AuthState {
  const AuthState();

  /// Convenience accessor — `null` when not authenticated.
  Account? get currentAccount =>
      this is Authenticated ? (this as Authenticated).account : null;

  /// True only for the [Authenticated] variant.
  bool get isAuthenticated => this is Authenticated;
}

/// The notifier is bootstrapping (reading tokens, calling /auth/me).
///
/// Routes guarded by auth should hold on a splash screen while in this state.
final class AuthLoading extends AuthState {
  const AuthLoading();

  @override
  String toString() => 'AuthLoading()';
}

/// User has a valid session.
final class Authenticated extends AuthState {
  const Authenticated({
    required this.account,
    required this.accessToken,
  });

  final Account account;
  final String accessToken;

  Authenticated copyWith({
    Account? account,
    String? accessToken,
  }) {
    return Authenticated(
      account: account ?? this.account,
      accessToken: accessToken ?? this.accessToken,
    );
  }

  @override
  String toString() =>
      'Authenticated(account: ${account.id}, token: <redacted>)';
}

/// Default state — show onboarding / phone screen.
final class Unauthenticated extends AuthState {
  const Unauthenticated({this.lastError});

  /// User-facing message to surface as a toast on transition.
  final String? lastError;

  @override
  String toString() => 'Unauthenticated(lastError: $lastError)';
}

/// Riverpod provider exposed to the rest of the app.
///
/// Agent 1's router redirect-guard reads this; other features can `watch`
/// `authStateProvider` to react to logout, account changes, etc.
final authStateProvider =
    AsyncNotifierProvider<AuthStateNotifier, AuthState>(AuthStateNotifier.new);

/// `AsyncNotifier` driving authentication transitions.
///
/// All flows funnel through here so that token storage, server calls and
/// local-DB cleanups stay in lockstep.
class AuthStateNotifier extends AsyncNotifier<AuthState> {
  late final AuthApi _authApi;
  late final TokenStorage _tokenStorage;
  late final AppDatabase _database;
  late final KvStore _kvStore;

  @override
  Future<AuthState> build() async {
    _authApi = ref.read(authApiProvider);
    _tokenStorage = ref.read(tokenStorageProvider);
    _database = ref.read(appDatabaseProvider);
    _kvStore = ref.read(kvStoreProvider);
    return _bootstrap();
  }

  /// Reads tokens from secure storage and tries to hydrate the [Account].
  ///
  /// Network failures keep us in [AuthLoading] for up to 3 s, then fall back
  /// to [Unauthenticated] with an error message that the splash screen turns
  /// into a toast.
  Future<AuthState> _bootstrap() async {
    final tokens = await _tokenStorage.read();
    if (tokens == null) {
      return const Unauthenticated();
    }
    try {
      final account = await _authApi.me().timeout(const Duration(seconds: 3));
      return Authenticated(
        account: account,
        accessToken: tokens.accessToken,
      );
    } on TimeoutException {
      return const Unauthenticated(
        lastError: 'On a perdu la connexion, réessaie quand tu peux.',
      );
    } catch (_) {
      // Token might have been revoked — wipe and start fresh.
      await _tokenStorage.clear();
      return const Unauthenticated();
    }
  }

  /// Triggers the OTP request; the screen handles navigation on success.
  Future<void> requestOtp(String phone, OtpChannel channel) async {
    await _authApi.requestOtp(phoneNumber: phone, channel: channel);
  }

  /// Verifies OTP, persists tokens and transitions to [Authenticated].
  Future<void> verifyOtp(String phone, String code) async {
    state = const AsyncValue<AuthState>.loading();
    try {
      final result = await _authApi.verifyOtp(phoneNumber: phone, code: code);
      await _tokenStorage.write(
        AuthTokens(
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        ),
      );
      state = AsyncValue<AuthState>.data(
        Authenticated(
          account: result.account,
          accessToken: result.accessToken,
        ),
      );
    } catch (error, stack) {
      // Stay unauthenticated, surface the error to the screen.
      state = AsyncValue<AuthState>.error(error, stack);
      rethrow;
    }
  }

  /// Hydrates the account from /auth/me — typically called when settings
  /// were updated server-side.
  Future<void> refresh() async {
    final current = state.valueOrNull;
    if (current is! Authenticated) {
      return;
    }
    final account = await _authApi.me();
    state = AsyncValue<AuthState>.data(
      current.copyWith(account: account),
    );
  }

  /// Logs out: best-effort server call, then wipes tokens, drains the local
  /// DB and resets to [Unauthenticated].
  Future<void> logout() async {
    state = const AsyncValue<AuthState>.loading();
    try {
      await _authApi.logout();
    } catch (_) {
      // Ignore — we still want to log the user out locally.
    }
    await _tokenStorage.clear();
    await _kvStore.remove('firstLaunchComplete');
    await _database.drainAll();
    state = const AsyncValue<AuthState>.data(Unauthenticated());
  }

  /// Stores a 4-digit PIN protecting the app at resume.
  Future<void> setPin(String pin) async {
    await _tokenStorage.writePin(pin);
  }

  /// Clears the security PIN.
  Future<void> clearPin() async {
    await _tokenStorage.clearPin();
  }

  /// Returns true when a PIN is currently configured.
  Future<bool> hasPin() => _tokenStorage.hasPin();

  /// Verifies a PIN entered on the lock screen.
  Future<bool> verifyPin(String pin) => _tokenStorage.verifyPin(pin);
}
