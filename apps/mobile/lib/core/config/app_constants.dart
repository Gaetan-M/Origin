/// Hard-coded constants used across the app.
///
/// Keep this file dependency-free so it can be imported anywhere.
abstract final class AppConstants {
  // ────────────── Auth ──────────────
  /// Length of an OTP code received by SMS / WhatsApp.
  static const int otpLength = 6;

  /// Length of the optional security PIN.
  static const int pinLength = 4;

  /// Seconds the user must wait before requesting a new OTP.
  static const int otpResendCooldownSeconds = 30;

  /// OTP validity window (must mirror backend value).
  static const Duration otpValidity = Duration(minutes: 5);

  // ────────────── Phone ──────────────
  /// Default country dialling code (Cameroon).
  static const String defaultCountryCode = '+237';

  /// Min / max digits accepted in an E.164 number (excluding the +).
  static const int phoneMinDigits = 8;
  static const int phoneMaxDigits = 15;

  // ────────────── Family graph ──────────────
  /// Max persons created on the free tier.
  static const int maxFreePersons = 10;

  /// Default depth used when calling `/persons/:id/family-tree`.
  static const int defaultTreeDegrees = 2;

  /// Hard cap accepted by the backend.
  static const int maxTreeDegrees = 5;

  // ────────────── Pagination ──────────────
  static const int defaultPageSize = 20;
  static const int maxPageSize = 100;

  // ────────────── Media ──────────────
  /// Max upload size for photos/scans (10 MiB).
  static const int maxMediaSizeBytes = 10 * 1024 * 1024;

  /// Max dimension (px) before client-side image compression kicks in.
  static const int maxImageEdgePx = 1920;

  /// JPEG quality used by `flutter_image_compress`.
  static const int imageCompressQuality = 82;

  // ────────────── Network ──────────────
  static const Duration httpConnectTimeout = Duration(seconds: 10);
  static const Duration httpReceiveTimeout = Duration(seconds: 20);
  static const Duration httpSendTimeout = Duration(seconds: 30);

  /// Number of retry attempts for idempotent requests.
  static const int httpRetryAttempts = 3;

  // ────────────── UI ──────────────
  /// Multiplier applied when "grand-mère" mode is enabled.
  static const double largeTextScaleFactor = 1.30;

  /// Animation duration for sheet / route transitions.
  static const Duration defaultAnimationDuration = Duration(milliseconds: 220);

  /// Debounce window applied to search input.
  static const Duration searchDebounce = Duration(milliseconds: 350);

  // ────────────── Storage ──────────────
  static const String secureStorageNamespace = 'origin_mobile';
  static const String tokenStorageKey = 'auth_tokens_v1';
  static const String pinStorageKey = 'app_pin_v1';
  static const String deviceIdStorageKey = 'device_id_v1';
}
