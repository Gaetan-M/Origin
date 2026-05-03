import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:origin_mobile/core/theme/origin_colors.dart';

/// Origin typography scale.
///
/// All text styles are based on Inter (via `google_fonts`) and follow the
/// scale defined in SPEC §13.2. Use [OriginTextStyles.large] when the user
/// has enabled the "grand-mère" accessibility mode (1.3x scale).
abstract final class OriginTextStyles {
  static const double _heroSize = 32;
  static const double _screenTitleSize = 24;
  static const double _sectionTitleSize = 20;
  static const double _bodyLargeSize = 18;
  static const double _bodySize = 16;
  static const double _captionSize = 14;
  static const double _microSize = 12;

  static const double _bodyLineHeight = 1.5;
  static const double _titleLineHeight = 1.3;

  // ---------------------------------------------------------------------------
  // Base styles (generated lazily by GoogleFonts).
  // ---------------------------------------------------------------------------

  static TextStyle get hero => GoogleFonts.inter(
        fontSize: _heroSize,
        fontWeight: FontWeight.w700,
        height: _titleLineHeight,
        color: OriginColors.textPrimary,
      );

  static TextStyle get screenTitle => GoogleFonts.inter(
        fontSize: _screenTitleSize,
        fontWeight: FontWeight.w600,
        height: _titleLineHeight,
        color: OriginColors.textPrimary,
      );

  static TextStyle get sectionTitle => GoogleFonts.inter(
        fontSize: _sectionTitleSize,
        fontWeight: FontWeight.w600,
        height: _titleLineHeight,
        color: OriginColors.textPrimary,
      );

  static TextStyle get bodyLarge => GoogleFonts.inter(
        fontSize: _bodyLargeSize,
        fontWeight: FontWeight.w400,
        height: _bodyLineHeight,
        color: OriginColors.textPrimary,
      );

  static TextStyle get body => GoogleFonts.inter(
        fontSize: _bodySize,
        fontWeight: FontWeight.w400,
        height: _bodyLineHeight,
        color: OriginColors.textPrimary,
      );

  static TextStyle get bodyMedium => GoogleFonts.inter(
        fontSize: _bodySize,
        fontWeight: FontWeight.w500,
        height: _bodyLineHeight,
        color: OriginColors.textPrimary,
      );

  static TextStyle get caption => GoogleFonts.inter(
        fontSize: _captionSize,
        fontWeight: FontWeight.w400,
        height: _bodyLineHeight,
        color: OriginColors.textSecondary,
      );

  static TextStyle get micro => GoogleFonts.inter(
        fontSize: _microSize,
        fontWeight: FontWeight.w400,
        height: _bodyLineHeight,
        color: OriginColors.textMuted,
      );

  static TextStyle get button => GoogleFonts.inter(
        fontSize: _bodyLargeSize,
        fontWeight: FontWeight.w600,
        height: 1.2,
        color: OriginColors.textOnPrimary,
        letterSpacing: 0.2,
      );

  // ---------------------------------------------------------------------------
  // TextTheme — supplied to ThemeData.
  // ---------------------------------------------------------------------------

  static TextTheme get textTheme {
    final base = GoogleFonts.interTextTheme();
    return base.copyWith(
      displayLarge: hero,
      displayMedium: hero.copyWith(fontSize: 28),
      headlineLarge: screenTitle,
      headlineMedium: screenTitle.copyWith(fontSize: 22),
      titleLarge: sectionTitle,
      titleMedium: sectionTitle.copyWith(fontSize: 18),
      titleSmall: bodyMedium,
      bodyLarge: bodyLarge,
      bodyMedium: body,
      bodySmall: caption,
      labelLarge: button,
      labelMedium: caption.copyWith(fontWeight: FontWeight.w500),
      labelSmall: micro,
    );
  }

  /// Returns a [TextTheme] scaled by [scale]. Used when the user enables the
  /// large-text accessibility mode (1.3x).
  static TextTheme scaledTextTheme(double scale) {
    final base = textTheme;
    return base.apply(fontSizeFactor: scale);
  }

  /// Returns the appropriate scale factor for the current context.
  ///
  /// When the settings provider exposes `largeTextMode`, multiply by 1.3.
  /// Until that provider lands (Agent 5), we infer from [MediaQuery.textScaleFactor]:
  /// any value >= 1.3 is considered "grand-mère" mode.
  // ignore: deprecated_member_use
  static double largeTextScale(BuildContext context) {
    final scaler = MediaQuery.textScalerOf(context);
    final scaled = scaler.scale(_bodySize);
    final factor = scaled / _bodySize;
    return factor >= 1.3 ? 1.3 : 1.0;
  }

  /// Convenience helper — returns the current text theme scaled if the user
  /// has opted into large text mode.
  static TextTheme large(BuildContext context) {
    return scaledTextTheme(largeTextScale(context));
  }
}
