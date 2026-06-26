import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:origin_mobile/core/theme/origin_colors.dart';
import 'package:origin_mobile/core/theme/origin_radius.dart';
import 'package:origin_mobile/core/theme/origin_spacing.dart';
import 'package:origin_mobile/core/theme/origin_text_styles.dart';
import 'package:origin_mobile/features/discover/domain/cultural_content_item.dart';
import 'package:origin_mobile/features/discover/domain/cultural_enums.dart';
import 'package:origin_mobile/features/discover/presentation/i18n/discover_strings.dart';
import 'package:origin_mobile/features/discover/presentation/providers/discover_providers.dart';
import 'package:origin_mobile/shared/widgets/origin_bottom_sheet.dart';
import 'package:origin_mobile/shared/widgets/origin_button.dart';
import 'package:origin_mobile/shared/widgets/origin_input.dart';
import 'package:origin_mobile/shared/widgets/origin_scaffold.dart';
import 'package:origin_mobile/shared/widgets/toast_service.dart';

/// Form to submit a new PUBLIC cultural-heritage contribution.
///
/// Submitted content is created as PENDING moderation; on success we pop back
/// to the feed and surface a calm confirmation toast.
class SubmitCulturalContentScreen extends ConsumerStatefulWidget {
  const SubmitCulturalContentScreen({super.key});

  @override
  ConsumerState<SubmitCulturalContentScreen> createState() =>
      _SubmitCulturalContentScreenState();
}

class _SubmitCulturalContentScreenState
    extends ConsumerState<SubmitCulturalContentScreen> {
  final TextEditingController _title = TextEditingController();
  final TextEditingController _body = TextEditingController();
  final TextEditingController _language = TextEditingController();
  final TextEditingController _region = TextEditingController();
  final TextEditingController _ethnicGroup = TextEditingController();

  CulturalContentType _contentType = CulturalContentType.tale;
  String? _titleError;

  @override
  void dispose() {
    _title.dispose();
    _body.dispose();
    _language.dispose();
    _region.dispose();
    _ethnicGroup.dispose();
    super.dispose();
  }

  Future<void> _pickType(DiscoverStrings strings) async {
    await OriginBottomSheet.show<void>(
      context: context,
      title: strings.fieldType,
      actions: <OriginBottomSheetAction>[
        for (final type in kCulturalContentTypes)
          OriginBottomSheetAction(
            label: strings.contentTypeLabel(type),
            onTap: () => setState(() => _contentType = type),
          ),
      ],
    );
  }

  Future<void> _submit(DiscoverStrings strings) async {
    FocusScope.of(context).unfocus();
    final title = _title.text.trim();
    if (title.isEmpty) {
      setState(() => _titleError = strings.requiredTitle);
      return;
    }
    setState(() => _titleError = null);

    String? clean(TextEditingController c) {
      final v = c.text.trim();
      return v.isEmpty ? null : v;
    }

    final input = CreateCulturalContentInput(
      contentType: _contentType,
      title: title,
      body: clean(_body),
      languageCode: clean(_language),
      region: clean(_region),
      ethnicGroup: clean(_ethnicGroup),
    );

    final ok =
        await ref.read(submitContentControllerProvider.notifier).submit(input);
    if (!mounted) return;
    if (ok) {
      ref.read(toastServiceProvider).success(strings.submitSuccess);
      Navigator.of(context).maybePop();
    } else {
      ref.read(toastServiceProvider).error(strings.submitError);
    }
  }

  @override
  Widget build(BuildContext context) {
    final strings = DiscoverStrings.of(context);
    final submitState = ref.watch(submitContentControllerProvider);

    return OriginScaffold(
      backgroundColor: OriginColors.sand,
      appBar: AppBar(
        backgroundColor: OriginColors.sand,
        elevation: 0,
        title: Text(
          strings.formTitle,
          style:
              OriginTextStyles.sectionTitle.copyWith(fontWeight: FontWeight.w700),
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

            // ── Content type (bottom-sheet picker) ──
            Text(
              strings.fieldType,
              style: OriginTextStyles.bodyMedium
                  .copyWith(fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 6),
            _TypePickerField(
              label: strings.contentTypeLabel(_contentType),
              onTap: () => _pickType(strings),
            ),
            const SizedBox(height: OriginSpacing.md),

            // ── Title (required) ──
            OriginInput(
              controller: _title,
              label: strings.fieldTitle,
              hint: strings.fieldTitleHint,
              errorText: _titleError,
              maxLength: 255,
              textInputAction: TextInputAction.next,
            ),
            const SizedBox(height: OriginSpacing.md),

            // ── Body (optional) ──
            OriginInput(
              controller: _body,
              label: '${strings.fieldBody} (${strings.optional})',
              hint: strings.fieldBodyHint,
              maxLines: 6,
              minLines: 4,
              textCapitalization: TextCapitalization.sentences,
            ),
            const SizedBox(height: OriginSpacing.md),

            // ── Language (optional) ──
            OriginInput(
              controller: _language,
              label: '${strings.fieldLanguage} (${strings.optional})',
              hint: strings.fieldLanguageHint,
              maxLength: 10,
            ),
            const SizedBox(height: OriginSpacing.md),

            // ── Region (optional) ──
            OriginInput(
              controller: _region,
              label: '${strings.fieldRegion} (${strings.optional})',
              hint: strings.fieldRegionHint,
            ),
            const SizedBox(height: OriginSpacing.md),

            // ── Ethnic group (optional) ──
            OriginInput(
              controller: _ethnicGroup,
              label: '${strings.fieldEthnicGroup} (${strings.optional})',
              hint: strings.fieldEthnicGroupHint,
            ),
            const SizedBox(height: OriginSpacing.lg),

            // ── Moderation note ──
            Container(
              padding: const EdgeInsets.all(OriginSpacing.md),
              decoration: BoxDecoration(
                color: OriginColors.offWhite,
                borderRadius: BorderRadius.circular(OriginRadius.md),
                border: Border.all(color: OriginColors.border),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  const Icon(Icons.info_outline,
                      size: 18, color: OriginColors.forestGreen),
                  const SizedBox(width: OriginSpacing.sm),
                  Expanded(
                    child: Text(
                      strings.moderationNote,
                      style: OriginTextStyles.caption,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: OriginSpacing.lg),

            // ── Actions ──
            OriginButton.primary(
              label: submitState.isSubmitting
                  ? strings.submitting
                  : strings.submit,
              isLoading: submitState.isSubmitting,
              onPressed:
                  submitState.isSubmitting ? null : () => _submit(strings),
            ),
            const SizedBox(height: OriginSpacing.sm),
            OriginButton.ghost(
              label: strings.cancel,
              expand: true,
              onPressed: submitState.isSubmitting
                  ? null
                  : () => Navigator.of(context).maybePop(),
            ),
          ],
        ),
      ),
    );
  }
}

class _TypePickerField extends StatelessWidget {
  const _TypePickerField({required this.label, required this.onTap});

  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: OriginColors.offWhite,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(OriginRadius.md),
        side: const BorderSide(color: OriginColors.border),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(OriginRadius.md),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(
            horizontal: OriginSpacing.md,
            vertical: OriginSpacing.md,
          ),
          child: Row(
            children: <Widget>[
              Expanded(
                child: Text(label, style: OriginTextStyles.body),
              ),
              const Icon(Icons.keyboard_arrow_down,
                  color: OriginColors.textMuted),
            ],
          ),
        ),
      ),
    );
  }
}
