/// Origin spacing scale — base 4 px.
///
/// Use these tokens instead of hardcoded paddings to keep rhythm consistent
/// across the app. All values are in logical pixels (`double`).
abstract final class OriginSpacing {
  /// 4 px — micro gutters, icon padding inside chips.
  static const double xs = 4;

  /// 8 px — tight stacks (label/input gap).
  static const double sm = 8;

  /// 16 px — default content padding.
  static const double md = 16;

  /// 24 px — section padding, card inner padding.
  static const double lg = 24;

  /// 32 px — vertical rhythm between major blocks.
  static const double xl = 32;

  /// 48 px — generous separation, hero spacing.
  static const double xxl = 48;

  /// 64 px — full-screen breathing room (auth flows).
  static const double xxxl = 64;
}
