import 'package:flutter/material.dart';
import 'package:origin_mobile/core/theme/origin_colors.dart';
import 'package:origin_mobile/core/theme/origin_spacing.dart';
import 'package:origin_mobile/core/theme/origin_text_styles.dart';
import 'package:origin_mobile/shared/widgets/origin_button.dart';

/// User-facing error view — shows a friendly message and an optional retry CTA.
class ErrorView extends StatelessWidget {
  const ErrorView({
    super.key,
    this.title,
    this.message,
    this.onRetry,
    this.icon = Icons.cloud_off_outlined,
  });

  final String? title;
  final String? message;
  final VoidCallback? onRetry;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(OriginSpacing.lg),
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            Icon(icon, color: OriginColors.textMuted, size: 56),
            const SizedBox(height: OriginSpacing.md),
            Text(
              title ?? "Ça n'a pas marché",
              textAlign: TextAlign.center,
              style: OriginTextStyles.sectionTitle,
            ),
            const SizedBox(height: OriginSpacing.sm),
            Text(
              message ?? 'Réessaie dans un instant.',
              textAlign: TextAlign.center,
              style: OriginTextStyles.body
                  .copyWith(color: OriginColors.textSecondary),
            ),
            if (onRetry != null) ...<Widget>[
              const SizedBox(height: OriginSpacing.lg),
              OriginButton.secondary(
                label: 'Réessayer',
                onPressed: onRetry,
                expand: false,
              ),
            ],
          ],
        ),
      ),
    );
  }
}
