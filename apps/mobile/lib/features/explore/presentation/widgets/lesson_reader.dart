import 'package:flutter/material.dart';

import 'package:origin_mobile/core/theme/origin_colors.dart';
import 'package:origin_mobile/core/theme/origin_radius.dart';
import 'package:origin_mobile/core/theme/origin_spacing.dart';
import 'package:origin_mobile/core/theme/origin_text_styles.dart';
import 'package:origin_mobile/features/explore/presentation/i18n/learning_strings.dart';

/// Simple, low-data mini-lesson reader. Renders the lesson body as readable
/// paragraphs (plain text — no HTML). Splits on blank lines for pleasant
/// spacing. Mirrors the web `LessonReader`.
class LessonReader extends StatelessWidget {
  const LessonReader({super.key, this.content});

  final String? content;

  @override
  Widget build(BuildContext context) {
    final strings = LearningStrings.of(context);
    final trimmed = content?.trim() ?? '';

    if (trimmed.isEmpty) {
      return DottedPlaceholder(text: strings.noContent);
    }

    final paragraphs = trimmed
        .split(RegExp(r'\n{2,}'))
        .map((p) => p.trim())
        .where((p) => p.isNotEmpty)
        .toList();

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(OriginSpacing.md),
      decoration: BoxDecoration(
        color: OriginColors.offWhite,
        borderRadius: BorderRadius.circular(OriginRadius.lg),
        border: Border.all(color: OriginColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            children: <Widget>[
              const Icon(Icons.menu_book_outlined,
                  size: 16, color: OriginColors.forestGreen),
              const SizedBox(width: OriginSpacing.sm),
              Text(
                strings.lessonContent,
                style: OriginTextStyles.bodyMedium.copyWith(
                  fontWeight: FontWeight.w600,
                  color: OriginColors.textSecondary,
                ),
              ),
            ],
          ),
          const SizedBox(height: OriginSpacing.sm),
          for (final para in paragraphs)
            Padding(
              padding: const EdgeInsets.only(bottom: OriginSpacing.sm),
              child: Text(
                para,
                style: OriginTextStyles.body
                    .copyWith(color: OriginColors.textSecondary),
              ),
            ),
        ],
      ),
    );
  }
}

/// Dashed-look placeholder shown when a lesson has no body yet.
class DottedPlaceholder extends StatelessWidget {
  const DottedPlaceholder({super.key, required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(OriginSpacing.lg),
      decoration: BoxDecoration(
        color: OriginColors.sand,
        borderRadius: BorderRadius.circular(OriginRadius.lg),
        border: Border.all(color: OriginColors.border),
      ),
      child: Text(
        text,
        textAlign: TextAlign.center,
        style: OriginTextStyles.body.copyWith(color: OriginColors.textMuted),
      ),
    );
  }
}
