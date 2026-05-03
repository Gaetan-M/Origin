/// Application environment configuration.
///
/// All values are resolved at compile time from `--dart-define` flags so
/// secrets and per-environment URLs never live in source. Pass overrides via:
///
/// ```bash
/// flutter run --dart-define=API_BASE_URL=https://api.origin.cm/api/v1
/// ```
abstract final class Env {
  /// Base URL of the Origin REST API (versioned).
  ///
  /// Defaults to the Android emulator alias `10.0.2.2` so a fresh checkout
  /// can talk to a backend running on the developer host.
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:3000/api/v1',
  );

  /// Human-readable application name.
  static const String appName = String.fromEnvironment(
    'APP_NAME',
    defaultValue: 'Origin',
  );

  /// Bundle version surfaced in the UI / About screen.
  static const String appVersion = String.fromEnvironment(
    'APP_VERSION',
    defaultValue: '0.1.0',
  );

  /// When `true`, the logger prints to console at debug level.
  static const bool enableLogging = bool.fromEnvironment(
    'ENABLE_LOGGING',
    defaultValue: true,
  );

  /// IETF locale tag used when no per-account preference is set.
  static const String defaultLocale = String.fromEnvironment(
    'DEFAULT_LOCALE',
    defaultValue: 'fr',
  );

  /// Sentry DSN for production crash reporting (empty disables Sentry).
  static const String sentryDsn = String.fromEnvironment(
    'SENTRY_DSN',
  );

  /// Convenience predicate used by guards / debug banners.
  static bool get isProduction => !enableLogging && sentryDsn.isNotEmpty;
}
