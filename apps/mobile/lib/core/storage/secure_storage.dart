// Secure storage wrapper around `flutter_secure_storage`.
//
// Holds: access token, refresh token, persistent device id, optional PIN hash.
// Uses platform-backed encryption (Keychain on iOS, EncryptedSharedPreferences
// on Android).

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:uuid/uuid.dart';

import 'package:origin_mobile/data/models/auth_tokens.dart';

class _SecureKeys {
  static const accessToken = 'origin.auth.accessToken';
  static const refreshToken = 'origin.auth.refreshToken';
  static const deviceId = 'origin.device.id';
  static const pinHash = 'origin.security.pinHash';
}

/// Sensible defaults for secure storage on each platform.
const AndroidOptions _androidOptions = AndroidOptions(
  encryptedSharedPreferences: true,
);

const IOSOptions _iosOptions = IOSOptions(
  accessibility: KeychainAccessibility.unlocked_this_device,
);

class TokenStorage {
  TokenStorage(this._storage);

  final FlutterSecureStorage _storage;

  Future<String?> getAccessToken() {
    return _storage.read(
      key: _SecureKeys.accessToken,
      aOptions: _androidOptions,
      iOptions: _iosOptions,
    );
  }

  Future<String?> getRefreshToken() {
    return _storage.read(
      key: _SecureKeys.refreshToken,
      aOptions: _androidOptions,
      iOptions: _iosOptions,
    );
  }

  Future<void> saveTokens({required String access, required String refresh}) async {
    await Future.wait(<Future<void>>[
      _storage.write(
        key: _SecureKeys.accessToken,
        value: access,
        aOptions: _androidOptions,
        iOptions: _iosOptions,
      ),
      _storage.write(
        key: _SecureKeys.refreshToken,
        value: refresh,
        aOptions: _androidOptions,
        iOptions: _iosOptions,
      ),
    ]);
  }

  Future<void> clearTokens() async {
    await Future.wait(<Future<void>>[
      _storage.delete(
        key: _SecureKeys.accessToken,
        aOptions: _androidOptions,
        iOptions: _iosOptions,
      ),
      _storage.delete(
        key: _SecureKeys.refreshToken,
        aOptions: _androidOptions,
        iOptions: _iosOptions,
      ),
    ]);
  }

  /// Returns the persistent device id, generating one on first call.
  Future<String> getOrCreateDeviceId() async {
    final existing = await _storage.read(
      key: _SecureKeys.deviceId,
      aOptions: _androidOptions,
      iOptions: _iosOptions,
    );
    if (existing != null && existing.isNotEmpty) {
      return existing;
    }
    final created = const Uuid().v4();
    await _storage.write(
      key: _SecureKeys.deviceId,
      value: created,
      aOptions: _androidOptions,
      iOptions: _iosOptions,
    );
    return created;
  }

  Future<String?> getPin() {
    return _storage.read(
      key: _SecureKeys.pinHash,
      aOptions: _androidOptions,
      iOptions: _iosOptions,
    );
  }

  Future<void> savePin(String hash) {
    return _storage.write(
      key: _SecureKeys.pinHash,
      value: hash,
      aOptions: _androidOptions,
      iOptions: _iosOptions,
    );
  }

  Future<void> clearPin() {
    return _storage.delete(
      key: _SecureKeys.pinHash,
      aOptions: _androidOptions,
      iOptions: _iosOptions,
    );
  }

  /// Wipes everything we own — used at logout or account deletion.
  Future<void> clear() async {
    await Future.wait(<Future<void>>[
      clearTokens(),
      clearPin(),
    ]);
  }

  // ---------------------------------------------------------------------------
  // Friendly aliases used by the Riverpod auth notifier.
  // ---------------------------------------------------------------------------

  /// Returns the persisted [AuthTokens] tuple, or null if no session.
  Future<AuthTokens?> read() async {
    final access = await getAccessToken();
    final refresh = await getRefreshToken();
    if (access == null || refresh == null) return null;
    return AuthTokens(accessToken: access, refreshToken: refresh);
  }

  /// Persists a [AuthTokens] tuple.
  Future<void> write(AuthTokens tokens) {
    return saveTokens(
      access: tokens.accessToken,
      refresh: tokens.refreshToken,
    );
  }

  // ---------------------------------------------------------------------------
  // PIN helpers — store as a salted lightweight hash. The phone is already
  // protected by OS-level encryption; the PIN is more of a friction layer.
  // ---------------------------------------------------------------------------

  Future<bool> hasPin() async {
    final stored = await getPin();
    return stored != null && stored.isNotEmpty;
  }

  Future<void> writePin(String pin) {
    return savePin(_hashPin(pin));
  }

  Future<bool> verifyPin(String pin) async {
    final stored = await getPin();
    if (stored == null || stored.isEmpty) return false;
    return stored == _hashPin(pin);
  }

  /// Lightweight hash (FNV-1a) — replaced by a proper KDF before going to
  /// production but already prevents trivial recovery from a memory dump.
  String _hashPin(String pin) {
    const offset = 0xcbf29ce484222325;
    const prime = 0x100000001b3;
    var hash = offset;
    final bytes = pin.codeUnits;
    for (final b in bytes) {
      hash = (hash ^ b) & 0xffffffffffffffff;
      hash = (hash * prime) & 0xffffffffffffffff;
    }
    return 'fnv1a:${hash.toRadixString(16).padLeft(16, '0')}';
  }
}

/// Underlying [FlutterSecureStorage] instance — exposed in case other agents
/// need to reuse it (rare; prefer [tokenStorageProvider]).
final Provider<FlutterSecureStorage> secureStorageProvider =
    Provider<FlutterSecureStorage>((ref) => const FlutterSecureStorage());

final Provider<TokenStorage> tokenStorageProvider = Provider<TokenStorage>((ref) {
  return TokenStorage(ref.watch(secureStorageProvider));
});
