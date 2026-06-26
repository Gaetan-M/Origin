import 'package:flutter/material.dart';

import 'package:origin_mobile/core/theme/origin_colors.dart';
import 'package:origin_mobile/core/theme/origin_radius.dart';
import 'package:origin_mobile/core/theme/origin_spacing.dart';
import 'package:origin_mobile/core/theme/origin_text_styles.dart';
import 'package:origin_mobile/features/explore/domain/learning_lesson.dart';
import 'package:origin_mobile/features/explore/presentation/i18n/learning_strings.dart';

/// A tappable lesson card used in the lessons list. Mirrors the web LessonCard.
class LessonCard extends StatelessWidget {
  const LessonCard({super.key, required this.lesson, this.onTap});

  final LearningLessonSummary lesson;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final strings = LearningStrings.of(context);
    final enrollment = lesson.enrollment;
    final progress = enrollment?.progressPercent;
    final isCompleted = enrollment?.isCompleted ?? false;

    return Material(
      color: OriginColors.offWhite,
      borderRadius: BorderRadius.circular(OriginRadius.lg),
      child: InkWell(
        borderRadius: BorderRadius.circular(OriginRadius.lg),
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.all(OriginSpacing.md),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(OriginRadius.lg),
            border: Border.all(color: OriginColors.border),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Container(
                    width: 40,
                    height: 40,
                    decoration: const BoxDecoration(
                      color: OriginColors.forestGreen50,
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      lesson.languageCode != null
                          ? Icons.translate_outlined
                          : Icons.school_outlined,
                      size: 20,
                      color: OriginColors.forestGreen,
                    ),
                  ),
                  const SizedBox(width: OriginSpacing.sm),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: <Widget>[
                            Expanded(
                              child: Text(
                                lesson.title,
                                style: OriginTextStyles.bodyLarge
                                    .copyWith(fontWeight: FontWeight.w700),
                              ),
                            ),
                            const SizedBox(width: OriginSpacing.sm),
                            _Pill(
                              label: strings.levelLabel(lesson.level),
                              background: OriginColors.sand,
                              foreground: OriginColors.textSecondary,
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Wrap(
                          spacing: 6,
                          runSpacing: 4,
                          crossAxisAlignment: WrapCrossAlignment.center,
                          children: <Widget>[
                            Text(
                              '${strings.by} ${lesson.bylineName}',
                              style: OriginTextStyles.caption
                                  .copyWith(color: OriginColors.textMuted),
                            ),
                            if (lesson.isVerified)
                              _Pill(
                                label: strings.verified,
                                icon: Icons.verified_outlined,
                                background: OriginColors.forestGreen50,
                                foreground: OriginColors.forestGreen,
                              ),
                            if (lesson.isTicketed)
                              _Pill(
                                label: strings.ticketed,
                                icon: Icons.lock_outline,
                                background: OriginColors.ochre50,
                                foreground: OriginColors.ochreDark,
                              ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              if (lesson.description != null &&
                  lesson.description!.isNotEmpty) ...<Widget>[
                const SizedBox(height: OriginSpacing.sm),
                Text(
                  lesson.description!,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: OriginTextStyles.body
                      .copyWith(color: OriginColors.textSecondary),
                ),
              ],
              if (lesson.languageCode != null ||
                  lesson.ethnicGroup != null) ...<Widget>[
                const SizedBox(height: OriginSpacing.sm),
                Wrap(
                  spacing: 6,
                  runSpacing: 4,
                  children: <Widget>[
                    if (lesson.languageCode != null)
                      _Pill(
                        label: lesson.languageCode!,
                        background: OriginColors.sand,
                        foreground: OriginColors.textSecondary,
                      ),
                    if (lesson.ethnicGroup != null)
                      _Pill(
                        label: lesson.ethnicGroup!,
                        background: OriginColors.sand,
                        foreground: OriginColors.textSecondary,
                      ),
                  ],
                ),
              ],
              if (progress != null) ...<Widget>[
                const SizedBox(height: OriginSpacing.sm),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: <Widget>[
                    Row(
                      children: <Widget>[
                        if (isCompleted)
                          const Padding(
                            padding: EdgeInsets.only(right: 4),
                            child: Icon(Icons.check_circle_outline,
                                size: 13, color: OriginColors.forestGreen),
                          ),
                        Text(
                          isCompleted ? strings.completed : strings.progress,
                          style: OriginTextStyles.micro.copyWith(
                            color: OriginColors.textMuted,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                    Text(
                      '$progress%',
                      style: OriginTextStyles.micro.copyWith(
                        color: OriginColors.textMuted,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                ClipRRect(
                  borderRadius: BorderRadius.circular(OriginRadius.full),
                  child: LinearProgressIndicator(
                    value: (progress.clamp(0, 100)) / 100,
                    minHeight: 6,
                    backgroundColor: OriginColors.sand,
                    valueColor: AlwaysStoppedAnimation<Color>(
                      isCompleted
                          ? OriginColors.forestGreen
                          : OriginColors.ochre,
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _Pill extends StatelessWidget {
  const _Pill({
    required this.label,
    required this.background,
    required this.foreground,
    this.icon,
  });

  final String label;
  final Color background;
  final Color foreground;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(OriginRadius.full),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          if (icon != null) ...<Widget>[
            Icon(icon, size: 12, color: foreground),
            const SizedBox(width: 3),
          ],
          Text(
            label,
            style: OriginTextStyles.micro
                .copyWith(color: foreground, fontWeight: FontWeight.w700),
          ),
        ],
      ),
    );
  }
}
