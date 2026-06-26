import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import 'package:origin_mobile/core/theme/origin_colors.dart';
import 'package:origin_mobile/core/theme/origin_radius.dart';
import 'package:origin_mobile/core/theme/origin_spacing.dart';
import 'package:origin_mobile/core/theme/origin_text_styles.dart';
import 'package:origin_mobile/features/explore/domain/learning_lesson.dart';
import 'package:origin_mobile/features/explore/presentation/i18n/learning_strings.dart';
import 'package:origin_mobile/features/explore/presentation/providers/learning_providers.dart';
import 'package:origin_mobile/features/explore/presentation/widgets/enroll_panel.dart';
import 'package:origin_mobile/features/explore/presentation/widgets/lesson_reader.dart';
import 'package:origin_mobile/shared/widgets/error_view.dart';
import 'package:origin_mobile/shared/widgets/loading_view.dart';
import 'package:origin_mobile/shared/widgets/origin_button.dart';
import 'package:origin_mobile/shared/widgets/origin_scaffold.dart';

/// Full lesson view — header, ticketed note, enroll/progress, mini-lesson body.
class LessonViewScreen extends ConsumerWidget {
  const LessonViewScreen({super.key, required this.lessonId});

  final String lessonId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final strings = LearningStrings.of(context);
    final async = ref.watch(lessonDetailControllerProvider(lessonId));

    return OriginScaffold(
      backgroundColor: OriginColors.sand,
      appBar: AppBar(
        backgroundColor: OriginColors.sand,
        elevation: 0,
        title: Text(
          strings.title,
          style: OriginTextStyles.sectionTitle
              .copyWith(fontWeight: FontWeight.w700),
        ),
      ),
      body: SafeArea(
        child: async.when(
          loading: () => const LoadingView(),
          error: (_, __) => ErrorView(
            title: strings.notFound,
            message: strings.errorSubtitle,
            onRetry: () =>
                ref.read(lessonDetailControllerProvider(lessonId).notifier).load(),
          ),
          data: (lesson) => _LessonBody(lesson: lesson),
        ),
      ),
    );
  }
}

class _LessonBody extends StatelessWidget {
  const _LessonBody({required this.lesson});

  final LearningLessonDetail lesson;

  @override
  Widget build(BuildContext context) {
    final strings = LearningStrings.of(context);
    final date = DateFormat.yMMMd(
      Localizations.localeOf(context).toString(),
    ).format(lesson.createdAt.toLocal());

    return ListView(
      padding: const EdgeInsets.all(OriginSpacing.md),
      children: <Widget>[
        // Facet pills
        Wrap(
          spacing: 6,
          runSpacing: 6,
          children: <Widget>[
            _Pill(
              label: strings.levelLabel(lesson.level),
              background: OriginColors.sand,
              foreground: OriginColors.textSecondary,
            ),
            if (lesson.languageCode != null)
              _Pill(
                label: lesson.languageCode!,
                icon: Icons.translate_outlined,
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
        const SizedBox(height: OriginSpacing.sm),
        Text(
          lesson.title,
          style:
              OriginTextStyles.screenTitle.copyWith(fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: OriginSpacing.xs),
        Wrap(
          spacing: 6,
          runSpacing: 4,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: <Widget>[
            Text(
              '${strings.by} ${lesson.bylineName}',
              style:
                  OriginTextStyles.caption.copyWith(color: OriginColors.textMuted),
            ),
            if (lesson.isVerified)
              _Pill(
                label: strings.verified,
                icon: Icons.verified_outlined,
                background: OriginColors.forestGreen50,
                foreground: OriginColors.forestGreen,
              ),
            Text(
              '· $date',
              style:
                  OriginTextStyles.caption.copyWith(color: OriginColors.textMuted),
            ),
          ],
        ),
        if (lesson.description != null &&
            lesson.description!.isNotEmpty) ...<Widget>[
          const SizedBox(height: OriginSpacing.sm),
          Text(
            lesson.description!,
            style: OriginTextStyles.body
                .copyWith(color: OriginColors.textSecondary),
          ),
        ],
        if (lesson.isTicketed) ...<Widget>[
          const SizedBox(height: OriginSpacing.md),
          _TicketedNote(lesson: lesson, strings: strings),
        ],
        const SizedBox(height: OriginSpacing.md),
        EnrollPanel(lesson: lesson),
        const SizedBox(height: OriginSpacing.md),
        LessonReader(content: lesson.content),
        const SizedBox(height: OriginSpacing.xl),
      ],
    );
  }
}

class _TicketedNote extends StatelessWidget {
  const _TicketedNote({required this.lesson, required this.strings});

  final LearningLessonDetail lesson;
  final LearningStrings strings;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(OriginSpacing.md),
      decoration: BoxDecoration(
        color: OriginColors.ochre50,
        borderRadius: BorderRadius.circular(OriginRadius.md),
        border: Border.all(color: OriginColors.ochre100),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              const Icon(Icons.lock_outline,
                  size: 16, color: OriginColors.ochreDark),
              const SizedBox(width: OriginSpacing.sm),
              Expanded(
                child: Text(
                  strings.ticketedNote,
                  style: OriginTextStyles.caption
                      .copyWith(color: OriginColors.textSecondary),
                ),
              ),
            ],
          ),
          if (lesson.liveSessionId != null) ...<Widget>[
            const SizedBox(height: OriginSpacing.sm),
            OriginButton.secondary(
              label: strings.joinLive,
              icon: Icons.radio_button_checked,
              expand: false,
              onPressed: () =>
                  context.push('/lives/${lesson.liveSessionId}'),
            ),
          ],
        ],
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
