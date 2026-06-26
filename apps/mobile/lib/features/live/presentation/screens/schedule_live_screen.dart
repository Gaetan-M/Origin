import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import 'package:origin_mobile/core/theme/origin_colors.dart';
import 'package:origin_mobile/core/theme/origin_radius.dart';
import 'package:origin_mobile/core/theme/origin_spacing.dart';
import 'package:origin_mobile/core/theme/origin_text_styles.dart';
import 'package:origin_mobile/features/live/domain/live_enums.dart';
import 'package:origin_mobile/features/live/domain/live_session.dart';
import 'package:origin_mobile/features/live/presentation/i18n/live_strings.dart';
import 'package:origin_mobile/features/live/presentation/providers/live_providers.dart';
import 'package:origin_mobile/features/live/presentation/screens/lives_screen.dart';
import 'package:origin_mobile/shared/widgets/origin_bottom_sheet.dart';
import 'package:origin_mobile/shared/widgets/origin_button.dart';
import 'package:origin_mobile/shared/widgets/origin_input.dart';
import 'package:origin_mobile/shared/widgets/origin_scaffold.dart';
import 'package:origin_mobile/shared/widgets/toast_service.dart';

/// Schedule a live session. Mirrors the web `/lives/new` form: title, kind,
/// visibility, optional date/time, optional description. On success navigates
/// to the room. Uses bottom sheets for selectors (never OK-only modals).
class ScheduleLiveScreen extends ConsumerStatefulWidget {
  const ScheduleLiveScreen({super.key});

  @override
  ConsumerState<ScheduleLiveScreen> createState() => _ScheduleLiveScreenState();
}

class _ScheduleLiveScreenState extends ConsumerState<ScheduleLiveScreen> {
  final TextEditingController _titleController = TextEditingController();
  final TextEditingController _descriptionController = TextEditingController();

  LiveSessionKind _kind = LiveSessionKind.ceremony;
  LiveVisibilityScope _visibility = LiveVisibilityScope.family;
  DateTime? _scheduledAt;
  String? _titleError;

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  Future<void> _pickKind(LiveStrings strings) async {
    await OriginBottomSheet.show<void>(
      context: context,
      title: strings.fieldKind,
      actions: <OriginBottomSheetAction>[
        for (final kind in LiveSessionKind.choices)
          OriginBottomSheetAction(
            label: strings.kindLabel(kind),
            onTap: () => setState(() => _kind = kind),
          ),
      ],
    );
  }

  Future<void> _pickVisibility(LiveStrings strings) async {
    await OriginBottomSheet.show<void>(
      context: context,
      title: strings.fieldVisibility,
      actions: <OriginBottomSheetAction>[
        for (final scope in LiveVisibilityScope.choices)
          OriginBottomSheetAction(
            label: strings.visibilityLabel(scope),
            icon: scope == LiveVisibilityScope.public
                ? Icons.public
                : Icons.groups_2_outlined,
            onTap: () => setState(() => _visibility = scope),
          ),
      ],
    );
  }

  Future<void> _pickDateTime() async {
    final now = DateTime.now();
    final date = await showDatePicker(
      context: context,
      initialDate: _scheduledAt ?? now.add(const Duration(hours: 1)),
      firstDate: now,
      lastDate: now.add(const Duration(days: 365 * 2)),
    );
    if (date == null || !mounted) return;
    final time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(
        _scheduledAt ?? now.add(const Duration(hours: 1)),
      ),
    );
    if (!mounted) return;
    setState(() {
      _scheduledAt = DateTime(
        date.year,
        date.month,
        date.day,
        time?.hour ?? 0,
        time?.minute ?? 0,
      );
    });
  }

  Future<void> _submit(LiveStrings strings) async {
    final title = _titleController.text.trim();
    if (title.isEmpty) {
      setState(() => _titleError = strings.requiredTitle);
      return;
    }
    setState(() => _titleError = null);

    final description = _descriptionController.text.trim();
    final input = CreateLiveSessionInput(
      title: title,
      kind: _kind,
      visibilityScope: _visibility,
      description: description.isEmpty ? null : description,
      scheduledAt: _scheduledAt,
    );

    final session =
        await ref.read(scheduleLiveControllerProvider.notifier).submit(input);
    if (!mounted) return;

    if (session == null) {
      ref.read(toastServiceProvider).error(strings.submitError);
      return;
    }
    // Replace the form with the room so back returns to the list.
    context.pushReplacement(LivesScreen.roomRoutePath(session.id));
  }

  @override
  Widget build(BuildContext context) {
    final strings = LiveStrings.of(context);
    final state = ref.watch(scheduleLiveControllerProvider);
    final locale = Localizations.localeOf(context).toString();

    final whenLabel = _scheduledAt != null
        ? DateFormat.yMMMEd(locale).add_jm().format(_scheduledAt!)
        : strings.startNow;

    return OriginScaffold(
      backgroundColor: OriginColors.sand,
      appBar: AppBar(
        backgroundColor: OriginColors.sand,
        elevation: 0,
        title: Text(
          strings.formTitle,
          style: OriginTextStyles.sectionTitle
              .copyWith(fontWeight: FontWeight.w700),
        ),
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(OriginSpacing.md),
          children: <Widget>[
            Text(
              strings.formSubtitle,
              style: OriginTextStyles.body
                  .copyWith(color: OriginColors.textSecondary),
            ),
            const SizedBox(height: OriginSpacing.lg),

            // Title
            OriginInput(
              controller: _titleController,
              label: strings.fieldTitle,
              hint: strings.fieldTitlePlaceholder,
              maxLength: 200,
              errorText: _titleError,
              textInputAction: TextInputAction.next,
            ),
            const SizedBox(height: OriginSpacing.md),

            // Kind
            _SelectorTile(
              label: strings.fieldKind,
              value: strings.kindLabel(_kind),
              icon: Icons.category_outlined,
              onTap: () => _pickKind(strings),
            ),
            const SizedBox(height: OriginSpacing.md),

            // Visibility
            _SelectorTile(
              label: strings.fieldVisibility,
              value: strings.visibilityLabel(_visibility),
              icon: _visibility == LiveVisibilityScope.public
                  ? Icons.public
                  : Icons.groups_2_outlined,
              onTap: () => _pickVisibility(strings),
            ),
            const SizedBox(height: OriginSpacing.md),

            // Scheduled at (optional)
            _SelectorTile(
              label: '${strings.fieldScheduledAt} · ${strings.optional}',
              value: whenLabel,
              icon: Icons.event_outlined,
              onTap: _pickDateTime,
              onClear: _scheduledAt == null
                  ? null
                  : () => setState(() => _scheduledAt = null),
            ),
            const SizedBox(height: OriginSpacing.md),

            // Description (optional)
            OriginInput(
              controller: _descriptionController,
              label: '${strings.fieldDescription} · ${strings.optional}',
              hint: strings.fieldDescriptionPlaceholder,
              maxLines: 5,
              minLines: 3,
              maxLength: 1000,
            ),
            const SizedBox(height: OriginSpacing.lg),

            OriginButton.primary(
              label: state.isSubmitting ? strings.submitting : strings.submit,
              icon: Icons.sensors,
              isLoading: state.isSubmitting,
              onPressed: state.isSubmitting ? null : () => _submit(strings),
            ),
            const SizedBox(height: OriginSpacing.sm),
            OriginButton.ghost(
              label: strings.cancel,
              expand: true,
              onPressed:
                  state.isSubmitting ? null : () => Navigator.of(context).maybePop(),
            ),
          ],
        ),
      ),
    );
  }
}

/// A tappable row that opens a selector (kind / visibility / date) — styled
/// like an input field for visual consistency with [OriginInput].
class _SelectorTile extends StatelessWidget {
  const _SelectorTile({
    required this.label,
    required this.value,
    required this.icon,
    required this.onTap,
    this.onClear,
  });

  final String label;
  final String value;
  final IconData icon;
  final VoidCallback onTap;
  final VoidCallback? onClear;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        Text(
          label,
          style: OriginTextStyles.bodyMedium.copyWith(
            fontWeight: FontWeight.w600,
            color: OriginColors.charcoal,
          ),
        ),
        const SizedBox(height: 6),
        Material(
          color: OriginColors.offWhite,
          borderRadius: BorderRadius.circular(OriginRadius.md),
          child: InkWell(
            onTap: onTap,
            borderRadius: BorderRadius.circular(OriginRadius.md),
            child: Container(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(OriginRadius.md),
                border: Border.all(color: OriginColors.border),
              ),
              padding: const EdgeInsets.symmetric(
                horizontal: OriginSpacing.md,
                vertical: 14,
              ),
              child: Row(
                children: <Widget>[
                  Icon(icon, size: 18, color: OriginColors.textMuted),
                  const SizedBox(width: OriginSpacing.sm),
                  Expanded(
                    child: Text(
                      value,
                      style: OriginTextStyles.body,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  if (onClear != null)
                    GestureDetector(
                      onTap: onClear,
                      child: const Icon(Icons.close,
                          size: 18, color: OriginColors.textMuted),
                    )
                  else
                    const Icon(Icons.expand_more,
                        size: 20, color: OriginColors.textMuted),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}
