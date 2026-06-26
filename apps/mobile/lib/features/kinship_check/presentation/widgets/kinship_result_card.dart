import 'package:flutter/material.dart';

import 'package:origin_mobile/core/theme/origin_colors.dart';
import 'package:origin_mobile/core/theme/origin_radius.dart';
import 'package:origin_mobile/core/theme/origin_spacing.dart';
import 'package:origin_mobile/core/theme/origin_text_styles.dart';
import 'package:origin_mobile/features/kinship_check/domain/kinship_check.dart';
import 'package:origin_mobile/features/kinship_check/presentation/i18n/kinship_check_strings.dart';

/// Respectful display of a kinship result. Renders ONLY { related, degree,
/// label } — by construction it has nothing else to show. No names, no tree,
/// no path. Mirrors apps/web/src/components/kinship/result-card.tsx.
class KinshipResultCard extends StatelessWidget {
  const KinshipResultCard({
    super.key,
    required this.result,
    required this.strings,
  });

  final KinshipResult result;
  final KinshipStrings strings;

  @override
  Widget build(BuildContext context) {
    final related = result.related;

    final Color accent =
        related ? OriginColors.forestGreen : OriginColors.ash;
    final Color surface =
        related ? OriginColors.forestGreen50 : OriginColors.sand;
    final Color borderColor =
        related ? OriginColors.forestGreen100 : OriginColors.border;

    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: surface,
        borderRadius: BorderRadius.circular(OriginRadius.lg),
        border: Border.all(color: borderColor),
      ),
      padding: const EdgeInsets.all(OriginSpacing.lg),
      child: Column(
        children: <Widget>[
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              color: accent.withValues(alpha: 0.12),
              shape: BoxShape.circle,
            ),
            child: Icon(
              related ? Icons.diversity_1_outlined : Icons.link_off_outlined,
              color: accent,
              size: 26,
            ),
          ),
          const SizedBox(height: OriginSpacing.md),
          Text(
            related
                ? strings.resultRelatedTitle
                : strings.resultUnrelatedTitle,
            textAlign: TextAlign.center,
            style: OriginTextStyles.sectionTitle.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: OriginSpacing.sm),
          if (related) ...<Widget>[
            // The human label is the heart of the reveal — calm and prominent.
            Text(
              strings.resultLabel(result),
              textAlign: TextAlign.center,
              style: OriginTextStyles.bodyLarge.copyWith(
                fontWeight: FontWeight.w600,
                color: OriginColors.forestDark,
              ),
            ),
            if (result.degree != null) ...<Widget>[
              const SizedBox(height: OriginSpacing.sm),
              Text(
                '${strings.resultDegree} : ${result.degree}',
                textAlign: TextAlign.center,
                style: OriginTextStyles.micro.copyWith(
                  letterSpacing: 0.8,
                  color: OriginColors.textMuted,
                ),
              ),
            ],
          ] else
            Text(
              strings.resultUnrelatedBody,
              textAlign: TextAlign.center,
              style: OriginTextStyles.body.copyWith(
                color: OriginColors.textSecondary,
              ),
            ),
          const SizedBox(height: OriginSpacing.md),
          _PrivacyFooter(label: strings.resultPrivacyFooter),
        ],
      ),
    );
  }
}

class _PrivacyFooter extends StatelessWidget {
  const _PrivacyFooter({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        const Icon(
          Icons.lock_outline,
          size: 13,
          color: OriginColors.textMuted,
        ),
        const SizedBox(width: 6),
        Flexible(
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: OriginTextStyles.micro.copyWith(
              color: OriginColors.textMuted,
            ),
          ),
        ),
      ],
    );
  }
}
