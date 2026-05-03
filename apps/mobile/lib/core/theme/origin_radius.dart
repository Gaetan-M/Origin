import 'package:flutter/widgets.dart';

/// Origin corner radius scale.
abstract final class OriginRadius {
  /// 8 px — inputs, small chips.
  static const double sm = 8;

  /// 12 px — buttons, default inputs.
  static const double md = 12;

  /// 16 px — cards.
  static const double lg = 16;

  /// 24 px — bottom sheets, large surfaces.
  static const double xl = 24;

  /// Effectively pill — used for chips and badges.
  static const double full = 999;
}

/// Pre-baked [BorderRadius] helpers.
abstract final class OriginRadii {
  static const BorderRadius button = BorderRadius.all(
    Radius.circular(OriginRadius.md),
  );

  static const BorderRadius input = BorderRadius.all(
    Radius.circular(OriginRadius.md),
  );

  static const BorderRadius card = BorderRadius.all(
    Radius.circular(OriginRadius.lg),
  );

  /// Top-only radius used by bottom sheets.
  static const BorderRadius bottomSheet = BorderRadius.only(
    topLeft: Radius.circular(OriginRadius.xl),
    topRight: Radius.circular(OriginRadius.xl),
  );

  static const BorderRadius pill = BorderRadius.all(
    Radius.circular(OriginRadius.full),
  );

  static const BorderRadius chip = BorderRadius.all(
    Radius.circular(OriginRadius.full),
  );
}
