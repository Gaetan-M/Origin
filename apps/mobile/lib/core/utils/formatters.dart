import 'package:origin_mobile/core/config/app_constants.dart';

// NOTE on enum imports:
// The full enum types (LifeStatus, DatePrecision) are owned by Agent 3 in
// `package:origin_mobile/data/models/...`. To avoid a hard import cycle while
// the multi-agent build is still in flight, this file relies on duck-typed
// `name` access for [LifeStatusLike] and [DatePrecisionLike] mixins that any
// enum (Dart enums implicitly implement `Enum` with a `name` getter) will
// satisfy. Once the Agent 3 enums land, callers can pass the real values
// directly and this layer keeps working unchanged.

/// Subset of any "life status" enum understood by the formatters.
///
/// Dart enums automatically expose `name` (string) which is enough here.
typedef LifeStatusLike = Enum;

/// Subset of any "date precision" enum understood by the formatters.
typedef DatePrecisionLike = Enum;

/// Pure formatting helpers — no Flutter dependencies, no I/O.
abstract final class Formatters {
  /// Normalises a raw user-typed phone number to E.164.
  ///
  /// Accepted inputs (Cameroon defaults):
  ///   - `+237 6XX XX XX XX`
  ///   - `00237 6XXXXXXXX`
  ///   - `6XXXXXXXX` (no prefix → defaults to `+237`)
  ///
  /// Returns `null` when the input cannot be normalised.
  static String? phoneE164(
    String raw, {
    String defaultCountryCode = AppConstants.defaultCountryCode,
  }) {
    final trimmed = raw.trim();
    if (trimmed.isEmpty) {
      return null;
    }

    var digits = trimmed.replaceAll(RegExp(r'[\s\-().]'), '');

    // International prefix `00` → `+`.
    if (digits.startsWith('00')) {
      digits = '+${digits.substring(2)}';
    }

    if (!digits.startsWith('+')) {
      // Strip an embedded country code without `+` (e.g. `2376...`).
      final stripped = defaultCountryCode.replaceFirst('+', '');
      if (digits.startsWith(stripped) &&
          digits.length > stripped.length + AppConstants.phoneMinDigits - 1) {
        digits = '+$digits';
      } else {
        digits = '$defaultCountryCode$digits';
      }
    }

    final body = digits.substring(1);
    if (!RegExp(r'^[0-9]+$').hasMatch(body)) {
      return null;
    }
    if (body.length < AppConstants.phoneMinDigits ||
        body.length > AppConstants.phoneMaxDigits) {
      return null;
    }
    return '+$body';
  }

  /// Pretty-prints an E.164 number for display.
  ///
  /// Cameroon: `+237 6XX XX XX XX`. Falls back to a generic grouping for
  /// other country codes.
  static String formatPhoneDisplay(String e164) {
    if (e164.isEmpty || !e164.startsWith('+')) {
      return e164;
    }
    if (e164.startsWith('+237') && e164.length == 13) {
      // +237 6 XX XX XX XX
      final n = e164.substring(4);
      return '+237 ${n.substring(0, 1)}${n.substring(1, 3)} '
          '${n.substring(3, 5)} ${n.substring(5, 7)} ${n.substring(7, 9)}';
    }
    // Generic: +CC NNN NNN NNNN
    final body = e164.substring(1);
    final buf = StringBuffer('+');
    for (var i = 0; i < body.length; i++) {
      if (i > 0 && i % 3 == 0) {
        buf.write(' ');
      }
      buf.write(body[i]);
    }
    return buf.toString();
  }

  /// Formats a date for display in the user's locale (currently FR-only).
  ///
  /// [precision] (a `DatePrecision`-like enum) tells us whether to surface
  /// the day, the month, or only the year / decade.
  static String formatDate(
    DateTime date, {
    DatePrecisionLike? precision,
    String? approximateText,
  }) {
    final precisionName = precision?.name.toUpperCase() ?? 'EXACT';
    switch (precisionName) {
      case 'UNKNOWN':
        return '—';
      case 'APPROXIMATE':
        if (approximateText != null && approximateText.isNotEmpty) {
          return approximateText;
        }
        return '~${date.year}';
      case 'DECADE':
        final decade = (date.year ~/ 10) * 10;
        return 'années $decade';
      case 'YEAR':
        return '${date.year}';
      case 'MONTH':
        return '${_monthFr(date.month)} ${date.year}';
      case 'EXACT':
      default:
        return '${date.day.toString().padLeft(2, '0')} '
            '${_monthFr(date.month)} ${date.year}';
    }
  }

  /// Returns the localised label for a life status ("Avec nous" etc.).
  ///
  /// Accepts the enum value duck-typed via its `name`, so we can format
  /// even before [Agent 3]'s real enum is wired up. The localisation lookup
  /// is intentionally done by string key on `l10n` to avoid a hard
  /// compile-time dependency on the generated strings — Agent 2 owns the
  /// ARB files and will provide these keys:
  ///   `lifeStatusAlive`, `lifeStatusDeceased`, `lifeStatusUnknown`.
  ///
  /// Pass `l10n` as `Object?` to keep this util free of Flutter imports.
  static String lifeStatusLabel(
    LifeStatusLike status,
    Object? l10n, {
    String? aliveFallback,
    String? deceasedFallback,
    String? unknownFallback,
  }) {
    final name = status.name.toUpperCase();
    switch (name) {
      case 'ALIVE':
        return aliveFallback ?? 'Avec nous';
      case 'DECEASED':
        return deceasedFallback ?? 'Nous a quittés';
      case 'UNKNOWN':
      default:
        return unknownFallback ?? 'Statut inconnu';
    }
  }

  /// Computes age in completed years.
  ///
  /// Returns `null` when [birth] is missing. When [deceased] is non-null,
  /// the age is frozen at the death date.
  static int? ageFromBirth(DateTime? birth, [DateTime? deceased]) {
    if (birth == null) {
      return null;
    }
    final reference = deceased ?? DateTime.now();
    if (reference.isBefore(birth)) {
      return 0;
    }
    var years = reference.year - birth.year;
    final hadBirthday = (reference.month > birth.month) ||
        (reference.month == birth.month && reference.day >= birth.day);
    if (!hadBirthday) {
      years -= 1;
    }
    return years < 0 ? 0 : years;
  }

  /// Human-friendly relative time, FR-leaning ("il y a 2 h").
  static String relativeTime(DateTime ts, {DateTime? now}) {
    final ref = now ?? DateTime.now();
    final diff = ref.difference(ts);

    if (diff.isNegative) {
      return 'à l\'instant';
    }
    if (diff.inSeconds < 45) {
      return 'à l\'instant';
    }
    if (diff.inMinutes < 60) {
      final m = diff.inMinutes;
      return 'il y a $m min';
    }
    if (diff.inHours < 24) {
      final h = diff.inHours;
      return 'il y a $h h';
    }
    if (diff.inDays < 7) {
      final d = diff.inDays;
      return 'il y a $d j';
    }
    if (diff.inDays < 30) {
      final w = diff.inDays ~/ 7;
      return 'il y a $w sem';
    }
    if (diff.inDays < 365) {
      final mo = diff.inDays ~/ 30;
      return 'il y a $mo mois';
    }
    final y = diff.inDays ~/ 365;
    return 'il y a $y an${y > 1 ? 's' : ''}';
  }

  static String _monthFr(int month) {
    const names = <String>[
      'janv.',
      'févr.',
      'mars',
      'avr.',
      'mai',
      'juin',
      'juil.',
      'août',
      'sept.',
      'oct.',
      'nov.',
      'déc.',
    ];
    final idx = (month - 1).clamp(0, 11);
    return names[idx];
  }
}
