import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:origin_mobile/core/theme/origin_colors.dart';
import 'package:origin_mobile/core/theme/origin_radius.dart';
import 'package:origin_mobile/core/theme/origin_spacing.dart';
import 'package:origin_mobile/core/theme/origin_text_styles.dart';
import 'package:origin_mobile/features/explore/domain/learning_lesson.dart';
import 'package:origin_mobile/features/explore/presentation/i18n/learning_strings.dart';
import 'package:origin_mobile/features/explore/presentation/providers/learning_providers.dart';
import 'package:origin_mobile/shared/widgets/origin_button.dart';

/// Enroll + progress panel for a lesson. Reads the per-lesson controller so it
/// rebuilds when enroll / progress mutations land. Mirrors the web EnrollPanel.
class EnrollPanel extends ConsumerStatefulWidget {
  const EnrollPanel({super.key, required this.lesson});

  final LearningLessonDetail lesson;

  @override
  ConsumerState<EnrollPanel> createState() => _EnrollPanelState();
}

class _EnrollPanelState extends ConsumerState<EnrollPanel> {
  /// Discrete progress steps the learner can mark, keeping the lesson simple.
  static const List<int> _steps = <int>[0, 25, 50, 75, 100];

  bool _busy = false;

  LessonDetailController get _controller =>
      ref.read(lessonDetailControllerProvider(widget.lesson.id).notifier);

  Future<void> _run(Future<void> Function() action, String errorMsg) async {
    if (_busy) return;
    setState(() => _busy = true);
    try {
      await action();
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context)
          ..clearSnackBars()
          ..showSnackBar(SnackBar(content: Text(errorMsg)));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final strings = LearningStrings.of(context);
    final enrollment = widget.lesson.enrollment;

    if (enrollment == null) {
      return _Card(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            Text(strings.enrollPrompt, style: OriginTextStyles.body),
            const SizedBox(height: OriginSpacing.md),
            OriginButton.primary(
              label: _busy ? strings.enrolling : strings.enroll,
              icon: Icons.school_outlined,
              isLoading: _busy,
              onPressed: _busy
                  ? null
                  : () => _run(_controller.enroll, strings.enrollError),
            ),
          ],
        ),
      );
    }

    final progress = enrollment.progressPercent;
    final isCompleted = enrollment.isCompleted;

    return _Card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: <Widget>[
              Row(
                children: <Widget>[
                  Icon(
                    isCompleted
                        ? Icons.check_circle_outline
                        : Icons.school_outlined,
                    size: 18,
                    color: OriginColors.forestGreen,
                  ),
                  const SizedBox(width: 6),
                  Text(
                    isCompleted ? strings.completed : strings.enrolled,
                    style: OriginTextStyles.bodyMedium
                        .copyWith(fontWeight: FontWeight.w700),
                  ),
                ],
              ),
              Text(
                '$progress%',
                style: OriginTextStyles.bodyMedium.copyWith(
                  fontWeight: FontWeight.w700,
                  color: OriginColors.textSecondary,
                ),
              ),
            ],
          ),
          const SizedBox(height: OriginSpacing.sm),
          ClipRRect(
            borderRadius: BorderRadius.circular(OriginRadius.full),
            child: LinearProgressIndicator(
              value: (progress.clamp(0, 100)) / 100,
              minHeight: 8,
              backgroundColor: OriginColors.sand,
              valueColor: AlwaysStoppedAnimation<Color>(
                isCompleted ? OriginColors.forestGreen : OriginColors.ochre,
              ),
            ),
          ),
          const SizedBox(height: OriginSpacing.md),
          Text(
            strings.yourProgress,
            style: OriginTextStyles.caption.copyWith(
              color: OriginColors.textMuted,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 6),
          Row(
            children: <Widget>[
              for (final step in _steps) ...<Widget>[
                Expanded(
                  child: _StepButton(
                    label: '$step%',
                    reached: progress >= step,
                    disabled: _busy || progress == step,
                    onTap: () => _run(
                      () => _controller.updateProgress(step),
                      strings.enrollError,
                    ),
                  ),
                ),
                if (step != _steps.last) const SizedBox(width: 6),
              ],
            ],
          ),
          if (!isCompleted) ...<Widget>[
            const SizedBox(height: OriginSpacing.md),
            OriginButton.secondary(
              label: _busy ? strings.updating : strings.markComplete,
              isLoading: _busy,
              onPressed: _busy
                  ? null
                  : () => _run(
                        () => _controller.updateProgress(100),
                        strings.enrollError,
                      ),
            ),
          ],
        ],
      ),
    );
  }
}

class _Card extends StatelessWidget {
  const _Card({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(OriginSpacing.md),
      decoration: BoxDecoration(
        color: OriginColors.offWhite,
        borderRadius: BorderRadius.circular(OriginRadius.lg),
        border: Border.all(color: OriginColors.border),
      ),
      child: child,
    );
  }
}

class _StepButton extends StatelessWidget {
  const _StepButton({
    required this.label,
    required this.reached,
    required this.disabled,
    required this.onTap,
  });

  final String label;
  final bool reached;
  final bool disabled;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: reached ? OriginColors.forestGreen50 : OriginColors.offWhite,
      borderRadius: BorderRadius.circular(OriginRadius.sm),
      child: InkWell(
        borderRadius: BorderRadius.circular(OriginRadius.sm),
        onTap: disabled ? null : onTap,
        child: Container(
          alignment: Alignment.center,
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(OriginRadius.sm),
            border: Border.all(
              color: reached
                  ? OriginColors.forestGreen
                  : OriginColors.border,
            ),
          ),
          child: Text(
            label,
            style: OriginTextStyles.caption.copyWith(
              fontWeight: FontWeight.w700,
              color: reached
                  ? OriginColors.forestGreen
                  : OriginColors.textSecondary,
            ),
          ),
        ),
      ),
    );
  }
}
