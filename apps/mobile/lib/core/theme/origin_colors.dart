import 'package:flutter/material.dart';

/// Origin design system colors.
///
/// Palette inspired by warm West/Central African tones, intentionally avoiding
/// cliches. All values target WCAG AA contrast on the Origin background tokens.
///
/// Use these tokens via [OriginColors]; never hardcode hex values in widgets.
abstract final class OriginColors {
  // ---------------------------------------------------------------------------
  // Brand core
  // ---------------------------------------------------------------------------

  /// Forest green — represents living people, success states.
  static const Color forestGreen = Color(0xFF2D7A4B);
  static const Color forestGreen50 = Color(0xFFE8F2EB);
  static const Color forestGreen100 = Color(0xFFC8E0CF);
  static const Color forestGreen500 = forestGreen;
  static const Color forestGreen700 = Color(0xFF1F5635);
  static const Color forestGreen900 = Color(0xFF123320);

  /// Lighter forest tone used in gradients and decorative canopy clusters.
  /// Lifted from the design package (`tokens.css --forest-light`).
  static const Color forestLight = Color(0xFF3D9A5F);

  /// Darker forest tone used for hero gradients and emphasis.
  /// Lifted from the design package (`tokens.css --forest-dark`).
  static const Color forestDark = Color(0xFF1D5A35);

  /// Terracotta — secondary CTA, warm accents.
  static const Color terracotta = Color(0xFFC8663B);
  static const Color terracotta50 = Color(0xFFF8E8E0);
  static const Color terracotta100 = Color(0xFFEFCBB7);
  static const Color terracotta500 = terracotta;
  static const Color terracotta700 = Color(0xFF8E4626);
  static const Color terracotta900 = Color(0xFF522815);

  /// Lighter terracotta — used in decorative canopy fills.
  /// Lifted from the design package (`tokens.css --terracotta-light`).
  static const Color terracottaLight = Color(0xFFD8865B);

  /// Darker terracotta — used for tree trunks and roots in branding.
  /// Lifted from the design package (`tokens.css --terracotta-dark`).
  static const Color terracottaDark = Color(0xFFA8462B);

  /// Ochre — cultural badges, attention.
  static const Color ochre = Color(0xFFD9A441);
  static const Color ochre50 = Color(0xFFFAF1DC);
  static const Color ochre100 = Color(0xFFF1DDA8);
  static const Color ochre500 = ochre;
  static const Color ochre700 = Color(0xFF96712C);
  static const Color ochre900 = Color(0xFF553F18);

  /// Lighter ochre — used in soft warning surfaces.
  /// Lifted from the design package (`tokens.css --ochre-light`).
  static const Color ochreLight = Color(0xFFE9C461);

  /// Darker ochre — used for emphasized badges and CTAs over warm surfaces.
  /// Lifted from the design package (`tokens.css --ochre-dark`).
  static const Color ochreDark = Color(0xFFB98421);

  /// Deep blue — primary CTA, navigation.
  static const Color deepBlue = Color(0xFF1E3A5F);
  static const Color deepBlue50 = Color(0xFFE3E8EF);
  static const Color deepBlue100 = Color(0xFFB7C2D2);
  static const Color deepBlue500 = deepBlue;
  static const Color deepBlue700 = Color(0xFF142844);
  static const Color deepBlue900 = Color(0xFF0B1726);

  /// Lighter deep blue — used in hero gradients with the dark variant.
  /// Lifted from the design package (`tokens.css --deep-blue-light`).
  static const Color deepBlueLight = Color(0xFF2E5A8F);

  // ---------------------------------------------------------------------------
  // Neutrals
  // ---------------------------------------------------------------------------

  /// Ash — deceased people (respectful neutral).
  static const Color ash = Color(0xFF6B6B6B);
  static const Color ash50 = Color(0xFFEFEFEF);
  static const Color ash100 = Color(0xFFD9D9D9);
  static const Color ash500 = ash;
  static const Color ash700 = Color(0xFF4A4A4A);
  static const Color ash900 = Color(0xFF2A2A2A);

  /// Sand — primary background.
  static const Color sand = Color(0xFFF5EFE0);

  /// Slightly darker sand — used for borders and dividers on warm surfaces.
  /// Lifted from the design package (`tokens.css --sand-dark`).
  static const Color sandDark = Color(0xFFE5DFD0);

  /// Off-white — cards, surfaces.
  static const Color offWhite = Color(0xFFFAFAF5);

  /// Charcoal — primary text.
  static const Color charcoal = Color(0xFF1A1A1A);

  // ---------------------------------------------------------------------------
  // Functional
  // ---------------------------------------------------------------------------

  /// Error red — softened brick tone (never aggressive pure red).
  static const Color error = Color(0xFFC8453B);
  static const Color errorBg = Color(0xFFFBE9E7);

  /// Success — alias of forest green.
  static const Color success = forestGreen;
  static const Color successBg = Color(0xFFE8F2EB);

  /// Warning — alias of ochre.
  static const Color warning = ochre;
  static const Color warningBg = Color(0xFFFAF1DC);

  /// Info — alias of deep blue.
  static const Color info = deepBlue;
  static const Color infoBg = Color(0xFFE3E8EF);

  // ---------------------------------------------------------------------------
  // Semantic — life status
  // ---------------------------------------------------------------------------

  /// Color used for an [LifeStatus.alive] person.
  static const Color alive = forestGreen;
  static const Color aliveBg = forestGreen50;

  /// Color used for an [LifeStatus.deceased] person (respectful neutral).
  static const Color deceased = ash;
  static const Color deceasedBg = ash50;

  /// Color used for an [LifeStatus.unknown] life status.
  static const Color unknown = Color(0xFF8E8E8E);
  static const Color unknownBg = Color(0xFFEFEFEF);

  // ---------------------------------------------------------------------------
  // Borders / dividers
  // ---------------------------------------------------------------------------

  static const Color border = Color(0xFFE2DDCB);
  static const Color borderStrong = Color(0xFFB8B098);
  static const Color divider = Color(0xFFE8E2D2);

  // ---------------------------------------------------------------------------
  // Text
  // ---------------------------------------------------------------------------

  static const Color textPrimary = charcoal;
  static const Color textSecondary = Color(0xFF4A4A4A);
  static const Color textMuted = Color(0xFF7A7A7A);
  static const Color textOnPrimary = offWhite;
  static const Color textOnDark = offWhite;

  // ---------------------------------------------------------------------------
  // Avatar palette — used to colorize initials when no photo is available.
  // ---------------------------------------------------------------------------

  static const List<Color> avatarPalette = <Color>[
    Color(0xFF2D7A4B), // forest green
    Color(0xFFC8663B), // terracotta
    Color(0xFFD9A441), // ochre
    Color(0xFF1E3A5F), // deep blue
    Color(0xFF7B4B6E), // plum
    Color(0xFF3F7A7A), // teal
    Color(0xFF8A5A2B), // chestnut
    Color(0xFF5C6E3F), // olive
  ];

  /// Returns a deterministic color from [avatarPalette] for the given seed.
  static Color avatarColorFor(String seed) {
    if (seed.isEmpty) return avatarPalette.first;
    var hash = 0;
    for (var i = 0; i < seed.length; i++) {
      hash = (hash * 31 + seed.codeUnitAt(i)) & 0x7fffffff;
    }
    return avatarPalette[hash % avatarPalette.length];
  }
}
