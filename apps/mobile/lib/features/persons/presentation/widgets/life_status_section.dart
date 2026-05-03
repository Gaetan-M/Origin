import 'package:flutter/material.dart';
import 'package:origin_mobile/core/theme/origin_colors.dart';
import 'package:origin_mobile/core/theme/origin_text_styles.dart';
import 'package:origin_mobile/data/models/enums.dart';
import 'package:origin_mobile/shared/widgets/life_status_badge.dart';

/// Section block on the Person detail screen surfacing the [LifeStatus].
class LifeStatusSection extends StatelessWidget {
  const LifeStatusSection({super.key, required this.status});

  final LifeStatus status;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: <Widget>[
        const Icon(
          Icons.local_florist_outlined,
          size: 18,
          color: OriginColors.textMuted,
        ),
        const SizedBox(width: 8),
        Text(
          'Statut',
          style: OriginTextStyles.bodyMedium.copyWith(
            fontWeight: FontWeight.w600,
            color: OriginColors.textSecondary,
          ),
        ),
        const SizedBox(width: 12),
        LifeStatusBadge(status: status),
      ],
    );
  }
}
