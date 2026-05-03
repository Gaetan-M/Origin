import 'package:flutter/material.dart';
import 'package:origin_mobile/core/theme/origin_colors.dart';
import 'package:origin_mobile/core/theme/origin_spacing.dart';
import 'package:origin_mobile/core/theme/origin_text_styles.dart';
import 'package:origin_mobile/shared/widgets/origin_button.dart';

/// Empty list / placeholder view.
class EmptyStateView extends StatelessWidget {
  const EmptyStateView({
    super.key,
    this.icon = Icons.inbox_outlined,
    this.title,
    this.subtitle,
    this.actionLabel,
    this.onAction,
  });

  final IconData icon;
  final String? title;
  final String? subtitle;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(OriginSpacing.lg),
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            Container(
              width: 80,
              height: 80,
              decoration: const BoxDecoration(
                color: OriginColors.sand,
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: OriginColors.textMuted, size: 36),
            ),
            const SizedBox(height: OriginSpacing.md),
            if (title != null)
              Text(
                title!,
                textAlign: TextAlign.center,
                style: OriginTextStyles.sectionTitle,
              ),
            if (subtitle != null) ...<Widget>[
              const SizedBox(height: OriginSpacing.xs),
              Text(
                subtitle!,
                textAlign: TextAlign.center,
                style: OriginTextStyles.body
                    .copyWith(color: OriginColors.textSecondary),
              ),
            ],
            if (actionLabel != null && onAction != null) ...<Widget>[
              const SizedBox(height: OriginSpacing.lg),
              OriginButton.primary(
                label: actionLabel!,
                onPressed: onAction,
                expand: false,
              ),
            ],
          ],
        ),
      ),
    );
  }
}
