import 'package:flutter/material.dart';
import 'package:origin_mobile/core/theme/origin_colors.dart';
import 'package:origin_mobile/core/theme/origin_radius.dart';
import 'package:origin_mobile/core/theme/origin_text_styles.dart';
import 'package:origin_mobile/data/models/enums.dart';

/// Compact pill chip showing a person's [LifeStatus].
class LifeStatusBadge extends StatelessWidget {
  const LifeStatusBadge({
    super.key,
    required this.status,
    this.compact = false,
  });

  final LifeStatus status;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final (label, fg, bg) = _resolve(status);

    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: compact ? 8 : 12,
        vertical: compact ? 4 : 6,
      ),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(OriginRadius.full),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(
              color: fg,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 6),
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
  }

  (String, Color, Color) _resolve(LifeStatus s) {
    switch (s) {
      case LifeStatus.alive:
        return ('Avec nous', OriginColors.forestGreen, OriginColors.forestGreen50);
      case LifeStatus.deceased:
        return ('Nous a quittés', OriginColors.ash700, OriginColors.ash50);
      case LifeStatus.unknown:
        return ('Inconnu', OriginColors.textMuted, OriginColors.unknownBg);
    }
  }
}
