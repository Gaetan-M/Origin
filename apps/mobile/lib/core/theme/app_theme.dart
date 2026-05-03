import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:origin_mobile/core/theme/origin_colors.dart';
import 'package:origin_mobile/core/theme/origin_radius.dart';
import 'package:origin_mobile/core/theme/origin_spacing.dart';
import 'package:origin_mobile/core/theme/origin_text_styles.dart';

// Re-export tokens so consumers can `import 'core/theme/app_theme.dart'` only.
export 'package:origin_mobile/core/theme/origin_colors.dart';
export 'package:origin_mobile/core/theme/origin_radius.dart';
export 'package:origin_mobile/core/theme/origin_spacing.dart';
export 'package:origin_mobile/core/theme/origin_text_styles.dart';

/// Origin theme builders.
///
/// Both [lightTheme] and [darkTheme] are Material 3, share the same warm
/// african-inspired palette, and use Inter as the default typeface.
abstract final class AppTheme {
  static const double _buttonHeightPrimary = 56;
  static const double _buttonHeightSecondary = 48;
  static const double _inputHeight = 56;

  // ---------------------------------------------------------------------------
  // Light theme
  // ---------------------------------------------------------------------------

  static ThemeData get lightTheme {
    final colorScheme = ColorScheme.light(
      primary: OriginColors.deepBlue,
      onPrimary: OriginColors.offWhite,
      primaryContainer: OriginColors.deepBlue50,
      onPrimaryContainer: OriginColors.deepBlue900,
      secondary: OriginColors.terracotta,
      onSecondary: OriginColors.offWhite,
      secondaryContainer: OriginColors.terracotta50,
      onSecondaryContainer: OriginColors.terracotta900,
      tertiary: OriginColors.ochre,
      onTertiary: OriginColors.charcoal,
      tertiaryContainer: OriginColors.ochre50,
      onTertiaryContainer: OriginColors.ochre900,
      error: OriginColors.error,
      onError: OriginColors.offWhite,
      errorContainer: OriginColors.errorBg,
      onErrorContainer: OriginColors.error,
      surface: OriginColors.offWhite,
      onSurface: OriginColors.charcoal,
      surfaceContainerHighest: OriginColors.sand,
      surfaceContainerHigh: OriginColors.offWhite,
      surfaceContainer: OriginColors.offWhite,
      surfaceContainerLow: OriginColors.sand,
      surfaceContainerLowest: OriginColors.sand,
      onSurfaceVariant: OriginColors.textSecondary,
      outline: OriginColors.borderStrong,
      outlineVariant: OriginColors.border,
      shadow: Colors.black,
    );

    final textTheme = OriginTextStyles.textTheme;

    return ThemeData(
      useMaterial3: true,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: OriginColors.sand,
      textTheme: textTheme,
      iconTheme: const IconThemeData(color: OriginColors.charcoal, size: 24),
      primaryIconTheme:
          const IconThemeData(color: OriginColors.offWhite, size: 24),
      dividerColor: OriginColors.divider,
      splashFactory: InkSparkle.splashFactory,
      appBarTheme: _appBarTheme(colorScheme, textTheme),
      elevatedButtonTheme: _elevatedButtonTheme(),
      filledButtonTheme: _filledButtonTheme(),
      outlinedButtonTheme: _outlinedButtonTheme(),
      textButtonTheme: _textButtonTheme(),
      inputDecorationTheme: _inputDecorationTheme(),
      cardTheme: _cardTheme(),
      bottomSheetTheme: _bottomSheetTheme(),
      dialogTheme: _dialogTheme(textTheme),
      chipTheme: _chipTheme(textTheme),
      snackBarTheme: _snackBarTheme(textTheme),
      bottomNavigationBarTheme: _bottomNavTheme(),
      navigationBarTheme: _navigationBarTheme(textTheme),
      progressIndicatorTheme: const ProgressIndicatorThemeData(
        color: OriginColors.deepBlue,
      ),
      visualDensity: VisualDensity.standard,
    );
  }

  // ---------------------------------------------------------------------------
  // Dark theme — placeholder, retains warm african tones.
  // ---------------------------------------------------------------------------

  static ThemeData get darkTheme {
    final colorScheme = ColorScheme.dark(
      primary: OriginColors.deepBlue100,
      onPrimary: OriginColors.deepBlue900,
      primaryContainer: OriginColors.deepBlue700,
      onPrimaryContainer: OriginColors.deepBlue50,
      secondary: OriginColors.terracotta100,
      onSecondary: OriginColors.terracotta900,
      secondaryContainer: OriginColors.terracotta700,
      onSecondaryContainer: OriginColors.terracotta50,
      tertiary: OriginColors.ochre100,
      onTertiary: OriginColors.ochre900,
      tertiaryContainer: OriginColors.ochre700,
      onTertiaryContainer: OriginColors.ochre50,
      error: const Color(0xFFE07A6F),
      onError: const Color(0xFF3D0E0A),
      errorContainer: const Color(0xFF6B2017),
      onErrorContainer: OriginColors.errorBg,
      surface: const Color(0xFF1A1A1A),
      onSurface: OriginColors.offWhite,
      surfaceContainerHighest: const Color(0xFF2A2A2A),
      surfaceContainerHigh: const Color(0xFF242424),
      surfaceContainer: const Color(0xFF1F1F1F),
      surfaceContainerLow: const Color(0xFF181818),
      surfaceContainerLowest: const Color(0xFF111111),
      onSurfaceVariant: const Color(0xFFCFCAB8),
      outline: const Color(0xFF6B6B6B),
      outlineVariant: const Color(0xFF3D3D3D),
      shadow: Colors.black,
    );

    final textTheme = OriginTextStyles.textTheme.apply(
      bodyColor: OriginColors.offWhite,
      displayColor: OriginColors.offWhite,
    );

    return ThemeData(
      useMaterial3: true,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: const Color(0xFF111111),
      textTheme: textTheme,
      iconTheme: const IconThemeData(color: OriginColors.offWhite, size: 24),
      appBarTheme: _appBarTheme(colorScheme, textTheme),
      elevatedButtonTheme: _elevatedButtonTheme(dark: true),
      filledButtonTheme: _filledButtonTheme(dark: true),
      outlinedButtonTheme: _outlinedButtonTheme(dark: true),
      textButtonTheme: _textButtonTheme(dark: true),
      inputDecorationTheme: _inputDecorationTheme(dark: true),
      cardTheme: _cardTheme(dark: true),
      bottomSheetTheme: _bottomSheetTheme(dark: true),
      dialogTheme: _dialogTheme(textTheme, dark: true),
      chipTheme: _chipTheme(textTheme, dark: true),
      snackBarTheme: _snackBarTheme(textTheme, dark: true),
    );
  }

  // ---------------------------------------------------------------------------
  // Component themes
  // ---------------------------------------------------------------------------

  static AppBarTheme _appBarTheme(ColorScheme colorScheme, TextTheme textTheme) {
    return AppBarTheme(
      backgroundColor: colorScheme.surface,
      foregroundColor: colorScheme.onSurface,
      elevation: 0,
      scrolledUnderElevation: 0.5,
      centerTitle: false,
      titleTextStyle: textTheme.headlineMedium,
      systemOverlayStyle: SystemUiOverlayStyle.dark,
      iconTheme: IconThemeData(color: colorScheme.onSurface),
    );
  }

  static ElevatedButtonThemeData _elevatedButtonTheme({bool dark = false}) {
    return ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        minimumSize: const Size.fromHeight(_buttonHeightPrimary),
        backgroundColor:
            dark ? OriginColors.deepBlue100 : OriginColors.deepBlue,
        foregroundColor:
            dark ? OriginColors.deepBlue900 : OriginColors.offWhite,
        disabledBackgroundColor: OriginColors.ash100,
        disabledForegroundColor: OriginColors.ash700,
        elevation: 0,
        shape: const RoundedRectangleBorder(borderRadius: OriginRadii.button),
        padding: const EdgeInsets.symmetric(horizontal: OriginSpacing.lg),
        textStyle: OriginTextStyles.button,
      ),
    );
  }

  static FilledButtonThemeData _filledButtonTheme({bool dark = false}) {
    return FilledButtonThemeData(
      style: FilledButton.styleFrom(
        minimumSize: const Size.fromHeight(_buttonHeightPrimary),
        backgroundColor:
            dark ? OriginColors.deepBlue100 : OriginColors.deepBlue,
        foregroundColor:
            dark ? OriginColors.deepBlue900 : OriginColors.offWhite,
        shape: const RoundedRectangleBorder(borderRadius: OriginRadii.button),
        textStyle: OriginTextStyles.button,
      ),
    );
  }

  static OutlinedButtonThemeData _outlinedButtonTheme({bool dark = false}) {
    return OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        minimumSize: const Size.fromHeight(_buttonHeightSecondary),
        foregroundColor:
            dark ? OriginColors.offWhite : OriginColors.deepBlue,
        side: BorderSide(
          color: dark ? OriginColors.ash500 : OriginColors.deepBlue,
          width: 1.5,
        ),
        shape: const RoundedRectangleBorder(borderRadius: OriginRadii.button),
        padding: const EdgeInsets.symmetric(horizontal: OriginSpacing.lg),
        textStyle: OriginTextStyles.button.copyWith(
          color: dark ? OriginColors.offWhite : OriginColors.deepBlue,
        ),
      ),
    );
  }

  static TextButtonThemeData _textButtonTheme({bool dark = false}) {
    return TextButtonThemeData(
      style: TextButton.styleFrom(
        foregroundColor:
            dark ? OriginColors.offWhite : OriginColors.deepBlue,
        minimumSize: const Size(48, 48),
        padding: const EdgeInsets.symmetric(
          horizontal: OriginSpacing.md,
          vertical: OriginSpacing.sm,
        ),
        textStyle: OriginTextStyles.bodyMedium,
        shape: const RoundedRectangleBorder(borderRadius: OriginRadii.button),
      ),
    );
  }

  static InputDecorationTheme _inputDecorationTheme({bool dark = false}) {
    final fill = dark ? const Color(0xFF1F1F1F) : OriginColors.offWhite;
    OutlineInputBorder border(Color color, {double width = 1}) =>
        OutlineInputBorder(
          borderRadius: OriginRadii.input,
          borderSide: BorderSide(color: color, width: width),
        );
    return InputDecorationTheme(
      filled: true,
      fillColor: fill,
      isDense: false,
      contentPadding: const EdgeInsets.symmetric(
        horizontal: OriginSpacing.md,
        vertical: OriginSpacing.md,
      ),
      constraints: const BoxConstraints(minHeight: _inputHeight),
      labelStyle: OriginTextStyles.caption.copyWith(
        color: OriginColors.textSecondary,
      ),
      floatingLabelBehavior: FloatingLabelBehavior.always,
      hintStyle: OriginTextStyles.body.copyWith(color: OriginColors.textMuted),
      helperStyle: OriginTextStyles.caption,
      errorStyle: OriginTextStyles.caption.copyWith(color: OriginColors.error),
      prefixIconColor: OriginColors.textSecondary,
      suffixIconColor: OriginColors.textSecondary,
      border: border(OriginColors.border),
      enabledBorder: border(OriginColors.border),
      focusedBorder: border(OriginColors.deepBlue, width: 2),
      errorBorder: border(OriginColors.error),
      focusedErrorBorder: border(OriginColors.error, width: 2),
      disabledBorder: border(OriginColors.ash100),
    );
  }

  static CardThemeData _cardTheme({bool dark = false}) {
    return CardThemeData(
      color: dark ? const Color(0xFF1F1F1F) : OriginColors.offWhite,
      elevation: 0,
      shape: const RoundedRectangleBorder(borderRadius: OriginRadii.card),
      margin: EdgeInsets.zero,
      clipBehavior: Clip.antiAlias,
      surfaceTintColor: Colors.transparent,
    );
  }

  static BottomSheetThemeData _bottomSheetTheme({bool dark = false}) {
    return BottomSheetThemeData(
      backgroundColor: dark ? const Color(0xFF1A1A1A) : OriginColors.offWhite,
      modalBackgroundColor:
          dark ? const Color(0xFF1A1A1A) : OriginColors.offWhite,
      shape: const RoundedRectangleBorder(borderRadius: OriginRadii.bottomSheet),
      modalElevation: 4,
      elevation: 4,
      showDragHandle: true,
      dragHandleColor: OriginColors.borderStrong,
      surfaceTintColor: Colors.transparent,
      clipBehavior: Clip.antiAlias,
    );
  }

  static DialogThemeData _dialogTheme(TextTheme textTheme, {bool dark = false}) {
    return DialogThemeData(
      backgroundColor: dark ? const Color(0xFF1F1F1F) : OriginColors.offWhite,
      elevation: 2,
      shape: const RoundedRectangleBorder(borderRadius: OriginRadii.card),
      titleTextStyle: textTheme.titleLarge,
      contentTextStyle: textTheme.bodyMedium,
    );
  }

  static ChipThemeData _chipTheme(TextTheme textTheme, {bool dark = false}) {
    return ChipThemeData(
      backgroundColor: dark ? const Color(0xFF2A2A2A) : OriginColors.sand,
      selectedColor: OriginColors.deepBlue50,
      disabledColor: OriginColors.ash100,
      labelStyle: textTheme.labelMedium ?? OriginTextStyles.caption,
      side: const BorderSide(color: OriginColors.border),
      shape: const RoundedRectangleBorder(borderRadius: OriginRadii.chip),
      padding: const EdgeInsets.symmetric(
        horizontal: OriginSpacing.md,
        vertical: OriginSpacing.sm,
      ),
    );
  }

  static SnackBarThemeData _snackBarTheme(TextTheme textTheme, {bool dark = false}) {
    return SnackBarThemeData(
      behavior: SnackBarBehavior.floating,
      backgroundColor: dark ? OriginColors.offWhite : OriginColors.charcoal,
      contentTextStyle: (textTheme.bodyMedium ?? OriginTextStyles.body).copyWith(
        color: dark ? OriginColors.charcoal : OriginColors.offWhite,
      ),
      shape: const RoundedRectangleBorder(borderRadius: OriginRadii.button),
      insetPadding: const EdgeInsets.all(OriginSpacing.md),
    );
  }

  static BottomNavigationBarThemeData _bottomNavTheme() {
    return const BottomNavigationBarThemeData(
      backgroundColor: OriginColors.offWhite,
      selectedItemColor: OriginColors.deepBlue,
      unselectedItemColor: OriginColors.textMuted,
      showUnselectedLabels: true,
      type: BottomNavigationBarType.fixed,
      elevation: 4,
    );
  }

  static NavigationBarThemeData _navigationBarTheme(TextTheme textTheme) {
    return NavigationBarThemeData(
      backgroundColor: OriginColors.offWhite,
      surfaceTintColor: Colors.transparent,
      indicatorColor: OriginColors.deepBlue50,
      labelTextStyle: WidgetStatePropertyAll<TextStyle>(
        textTheme.labelMedium ?? OriginTextStyles.caption,
      ),
      iconTheme: const WidgetStatePropertyAll<IconThemeData>(
        IconThemeData(color: OriginColors.deepBlue, size: 24),
      ),
      height: 72,
    );
  }
}
