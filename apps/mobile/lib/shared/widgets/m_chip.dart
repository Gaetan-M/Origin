import 'package:flutter/material.dart';
import 'package:origin_mobile/core/theme/origin_colors.dart';
import 'package:origin_mobile/core/theme/origin_radius.dart';
import 'package:origin_mobile/core/theme/origin_text_styles.dart';

/// Origin pill / chip — used in hero sections and lists.
class MChip extends StatelessWidget {
  const MChip({
    super.key,
    required this.label,
    this.icon,
    this.background,
    this.foreground,
    this.borderColor,
    this.dense = false,
    this.onTap,
  });

  final String label;
  final IconData? icon;
  final Color? background;
  final Color? foreground;
  final Color? borderColor;
  final bool dense;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final fg = foreground ?? OriginColors.charcoal;
    final bg = background ?? OriginColors.sand;
    final body = Container(
      padding: EdgeInsets.symmetric(
        horizontal: dense ? 8 : 12,
        vertical: dense ? 4 : 6,
      ),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(OriginRadius.full),
        border: borderColor != null
            ? Border.all(color: borderColor!)
            : null,
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          if (icon != null) ...<Widget>[
            Icon(icon, color: fg, size: dense ? 12 : 14),
            const SizedBox(width: 4),
          ],
          Text(
            label,
            style: OriginTextStyles.micro.copyWith(
              color: fg,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );

    if (onTap == null) return body;
    return InkWell(
      borderRadius: BorderRadius.circular(OriginRadius.full),
      onTap: onTap,
      child: body,
    );
  }
}
