import 'package:flutter/material.dart';
import 'package:origin_mobile/core/theme/origin_colors.dart';
import 'package:origin_mobile/core/theme/origin_radius.dart';
import 'package:origin_mobile/core/theme/origin_text_styles.dart';

/// Origin styled CTA buttons.
enum OriginButtonVariant { primary, secondary, ghost, danger, terracotta }

class OriginButton extends StatelessWidget {
  const OriginButton({
    super.key,
    required this.label,
    this.onPressed,
    this.variant = OriginButtonVariant.primary,
    this.icon,
    this.isLoading = false,
    this.expand = true,
    this.height,
  });

  factory OriginButton.primary({
    Key? key,
    required String label,
    VoidCallback? onPressed,
    IconData? icon,
    bool isLoading = false,
    bool expand = true,
  }) =>
      OriginButton(
        key: key,
        label: label,
        onPressed: onPressed,
        icon: icon,
        isLoading: isLoading,
        expand: expand,
      );

  factory OriginButton.secondary({
    Key? key,
    required String label,
    VoidCallback? onPressed,
    IconData? icon,
    bool isLoading = false,
    bool expand = true,
  }) =>
      OriginButton(
        key: key,
        label: label,
        onPressed: onPressed,
        icon: icon,
        isLoading: isLoading,
        expand: expand,
        variant: OriginButtonVariant.secondary,
      );

  factory OriginButton.ghost({
    Key? key,
    required String label,
    VoidCallback? onPressed,
    IconData? icon,
    bool expand = false,
  }) =>
      OriginButton(
        key: key,
        label: label,
        onPressed: onPressed,
        icon: icon,
        expand: expand,
        variant: OriginButtonVariant.ghost,
      );

  factory OriginButton.terracotta({
    Key? key,
    required String label,
    VoidCallback? onPressed,
    IconData? icon,
    bool isLoading = false,
    bool expand = true,
  }) =>
      OriginButton(
        key: key,
        label: label,
        onPressed: onPressed,
        icon: icon,
        isLoading: isLoading,
        expand: expand,
        variant: OriginButtonVariant.terracotta,
      );

  factory OriginButton.danger({
    Key? key,
    required String label,
    VoidCallback? onPressed,
    IconData? icon,
    bool isLoading = false,
    bool expand = true,
  }) =>
      OriginButton(
        key: key,
        label: label,
        onPressed: onPressed,
        icon: icon,
        isLoading: isLoading,
        expand: expand,
        variant: OriginButtonVariant.danger,
      );

  final String label;
  final VoidCallback? onPressed;
  final OriginButtonVariant variant;
  final IconData? icon;
  final bool isLoading;
  final bool expand;
  final double? height;

  @override
  Widget build(BuildContext context) {
    final disabled = onPressed == null || isLoading;
    final colors = _colorsFor(variant, disabled: disabled);

    final h = height ?? (variant == OriginButtonVariant.ghost ? 44.0 : 56.0);

    final Widget child = isLoading
        ? SizedBox(
            height: 22,
            width: 22,
            child: CircularProgressIndicator(
              strokeWidth: 2.6,
              valueColor: AlwaysStoppedAnimation<Color>(colors.foreground),
            ),
          )
        : Row(
            mainAxisAlignment: MainAxisAlignment.center,
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              if (icon != null) ...<Widget>[
                Icon(icon, size: 20, color: colors.foreground),
                const SizedBox(width: 8),
              ],
              Flexible(
                child: Text(
                  label,
                  textAlign: TextAlign.center,
                  overflow: TextOverflow.ellipsis,
                  style: OriginTextStyles.button.copyWith(
                    color: colors.foreground,
                  ),
                ),
              ),
            ],
          );

    final button = Material(
      color: colors.background,
      shape: RoundedRectangleBorder(
        borderRadius: const BorderRadius.all(Radius.circular(OriginRadius.md)),
        side: colors.border,
      ),
      child: InkWell(
        borderRadius:
            const BorderRadius.all(Radius.circular(OriginRadius.md)),
        onTap: disabled ? null : onPressed,
        child: SizedBox(
          height: h,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Center(child: child),
          ),
        ),
      ),
    );

    return expand ? SizedBox(width: double.infinity, child: button) : button;
  }

  _ButtonColors _colorsFor(OriginButtonVariant v, {required bool disabled}) {
    switch (v) {
      case OriginButtonVariant.primary:
        return _ButtonColors(
          background:
              disabled ? OriginColors.ash100 : OriginColors.deepBlue,
          foreground:
              disabled ? OriginColors.ash700 : OriginColors.offWhite,
          border: BorderSide.none,
        );
      case OriginButtonVariant.secondary:
        return _ButtonColors(
          background: Colors.transparent,
          foreground:
              disabled ? OriginColors.ash700 : OriginColors.deepBlue,
          border: BorderSide(
            color: disabled ? OriginColors.ash100 : OriginColors.deepBlue,
            width: 1.5,
          ),
        );
      case OriginButtonVariant.ghost:
        return _ButtonColors(
          background: Colors.transparent,
          foreground:
              disabled ? OriginColors.ash700 : OriginColors.deepBlue,
          border: BorderSide.none,
        );
      case OriginButtonVariant.terracotta:
        return _ButtonColors(
          background:
              disabled ? OriginColors.ash100 : OriginColors.terracotta,
          foreground:
              disabled ? OriginColors.ash700 : OriginColors.offWhite,
          border: BorderSide.none,
        );
      case OriginButtonVariant.danger:
        return _ButtonColors(
          background: disabled ? OriginColors.ash100 : OriginColors.error,
          foreground:
              disabled ? OriginColors.ash700 : OriginColors.offWhite,
          border: BorderSide.none,
        );
    }
  }
}

class _ButtonColors {
  const _ButtonColors({
    required this.background,
    required this.foreground,
    required this.border,
  });

  final Color background;
  final Color foreground;
  final BorderSide border;
}
