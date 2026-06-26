import 'package:flutter/material.dart';

import 'package:origin_mobile/core/theme/origin_colors.dart';
import 'package:origin_mobile/core/theme/origin_radius.dart';
import 'package:origin_mobile/core/theme/origin_spacing.dart';
import 'package:origin_mobile/core/theme/origin_text_styles.dart';
import 'package:origin_mobile/features/explore/domain/tourism_enums.dart';
import 'package:origin_mobile/features/explore/domain/tourism_place.dart';
import 'package:origin_mobile/features/explore/presentation/i18n/tourism_strings.dart';
import 'package:origin_mobile/shared/widgets/origin_button.dart';
import 'package:origin_mobile/shared/widgets/origin_input.dart';

/// Bottom sheet form to submit a community-sourced tourism place.
///
/// [onSubmit] performs the network call; the sheet owns its pending state and
/// pops itself on success. Mirrors the web `SubmitPlaceForm` UX.
class SubmitPlaceSheet extends StatefulWidget {
  const SubmitPlaceSheet({super.key, required this.onSubmit});

  final Future<void> Function(SubmitTourismPlaceInput input) onSubmit;

  /// Opens the sheet. Resolves to `true` when a place was submitted.
  static Future<bool?> show(
    BuildContext context, {
    required Future<void> Function(SubmitTourismPlaceInput input) onSubmit,
  }) {
    return showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: OriginColors.offWhite,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(
          top: Radius.circular(OriginRadius.xl),
        ),
      ),
      builder: (_) => SubmitPlaceSheet(onSubmit: onSubmit),
    );
  }

  @override
  State<SubmitPlaceSheet> createState() => _SubmitPlaceSheetState();
}

class _SubmitPlaceSheetState extends State<SubmitPlaceSheet> {
  final TextEditingController _name = TextEditingController();
  final TextEditingController _description = TextEditingController();
  final TextEditingController _region = TextEditingController();
  final TextEditingController _sourceRef = TextEditingController();
  final TextEditingController _latitude = TextEditingController();
  final TextEditingController _longitude = TextEditingController();

  TourismCategory _category = TourismCategory.heritage;
  TourismSource _source = TourismSource.community;
  bool _pending = false;
  String? _error;

  @override
  void dispose() {
    _name.dispose();
    _description.dispose();
    _region.dispose();
    _sourceRef.dispose();
    _latitude.dispose();
    _longitude.dispose();
    super.dispose();
  }

  Future<void> _submit(TourismStrings strings) async {
    setState(() => _error = null);

    final name = _name.text.trim();
    if (name.isEmpty) {
      setState(() => _error = strings.requiredName);
      return;
    }

    final sourceRef = _sourceRef.text.trim();
    // Provenance is mandatory for non-community sources.
    if (_source != TourismSource.community && sourceRef.isEmpty) {
      setState(() => _error = strings.requiredSourceRef);
      return;
    }

    final input = SubmitTourismPlaceInput(
      name: name,
      description:
          _description.text.trim().isEmpty ? null : _description.text.trim(),
      region: _region.text.trim().isEmpty ? null : _region.text.trim(),
      category: _category,
      source: _source,
      sourceRef: sourceRef.isEmpty ? null : sourceRef,
      latitude:
          _latitude.text.trim().isEmpty ? null : _latitude.text.trim(),
      longitude:
          _longitude.text.trim().isEmpty ? null : _longitude.text.trim(),
    );

    setState(() => _pending = true);
    try {
      await widget.onSubmit(input);
      if (mounted) Navigator.of(context).pop(true);
    } catch (_) {
      if (mounted) {
        setState(() {
          _pending = false;
          _error = strings.submitError;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final strings = TourismStrings.of(context);
    final viewInsets = MediaQuery.of(context).viewInsets.bottom;

    return Padding(
      padding: EdgeInsets.only(bottom: viewInsets),
      child: DraggableScrollableSheet(
        initialChildSize: 0.85,
        minChildSize: 0.5,
        maxChildSize: 0.95,
        expand: false,
        builder: (context, scrollController) {
          return SafeArea(
            top: false,
            child: ListView(
              controller: scrollController,
              padding: const EdgeInsets.fromLTRB(
                OriginSpacing.lg,
                OriginSpacing.md,
                OriginSpacing.lg,
                OriginSpacing.lg,
              ),
              children: <Widget>[
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: OriginColors.borderStrong,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                const SizedBox(height: OriginSpacing.md),
                Text(
                  strings.formTitle,
                  style: OriginTextStyles.sectionTitle
                      .copyWith(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: OriginSpacing.xs),
                Text(strings.formSubtitle, style: OriginTextStyles.body),
                const SizedBox(height: OriginSpacing.md),

                _NoteBox(
                  icon: Icons.shield_outlined,
                  text: strings.independenceNote,
                  tone: _NoteTone.forest,
                ),
                const SizedBox(height: OriginSpacing.md),

                OriginInput(
                  controller: _name,
                  label: strings.fieldName,
                  hint: strings.fieldNameHint,
                  maxLength: 200,
                  textInputAction: TextInputAction.next,
                ),
                const SizedBox(height: OriginSpacing.sm),

                OriginInput(
                  controller: _description,
                  label: '${strings.fieldDescription} (${strings.optional})',
                  hint: strings.fieldDescriptionHint,
                  maxLines: 4,
                  minLines: 3,
                ),
                const SizedBox(height: OriginSpacing.sm),

                OriginInput(
                  controller: _region,
                  label: '${strings.fieldRegion} (${strings.optional})',
                  hint: strings.fieldRegionHint,
                  maxLength: 120,
                ),
                const SizedBox(height: OriginSpacing.md),

                _FieldLabel(strings.fieldCategory),
                const SizedBox(height: 6),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: <Widget>[
                    for (final category in TourismCategory.all)
                      _SelectChip(
                        label: strings.categoryLabel(category),
                        selected: _category == category,
                        onTap: () => setState(() => _category = category),
                      ),
                  ],
                ),
                const SizedBox(height: OriginSpacing.md),

                _FieldLabel(strings.fieldSource),
                const SizedBox(height: 6),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: <Widget>[
                    for (final source in TourismSource.all)
                      _SelectChip(
                        label: strings.sourceLabelFor(source),
                        selected: _source == source,
                        onTap: () => setState(() => _source = source),
                      ),
                  ],
                ),
                const SizedBox(height: OriginSpacing.md),

                OriginInput(
                  controller: _sourceRef,
                  label: _source == TourismSource.community
                      ? '${strings.fieldSourceRef} (${strings.optional})'
                      : strings.fieldSourceRef,
                  hint: strings.fieldSourceRefHint,
                  maxLength: 300,
                ),
                const SizedBox(height: OriginSpacing.sm),

                Row(
                  children: <Widget>[
                    Expanded(
                      child: OriginInput(
                        controller: _latitude,
                        label: '${strings.fieldLatitude} (${strings.optional})',
                        hint: '3.848',
                        keyboardType: const TextInputType.numberWithOptions(
                            decimal: true, signed: true),
                      ),
                    ),
                    const SizedBox(width: OriginSpacing.sm),
                    Expanded(
                      child: OriginInput(
                        controller: _longitude,
                        label: '${strings.fieldLongitude} (${strings.optional})',
                        hint: '11.502',
                        keyboardType: const TextInputType.numberWithOptions(
                            decimal: true, signed: true),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: OriginSpacing.md),

                _NoteBox(
                  icon: Icons.info_outline,
                  text: strings.moderationNote,
                  tone: _NoteTone.sand,
                ),

                if (_error != null) ...<Widget>[
                  const SizedBox(height: OriginSpacing.sm),
                  Text(
                    _error!,
                    style: OriginTextStyles.caption
                        .copyWith(color: OriginColors.error),
                  ),
                ],

                const SizedBox(height: OriginSpacing.md),
                OriginButton.primary(
                  label: _pending ? strings.submitting : strings.submitAction,
                  isLoading: _pending,
                  onPressed: _pending ? null : () => _submit(strings),
                ),
                const SizedBox(height: OriginSpacing.sm),
                OriginButton.ghost(
                  label: strings.cancel,
                  expand: true,
                  onPressed: _pending
                      ? null
                      : () => Navigator.of(context).maybePop(),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _FieldLabel extends StatelessWidget {
  const _FieldLabel(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: OriginTextStyles.bodyMedium.copyWith(
        fontWeight: FontWeight.w600,
        color: OriginColors.charcoal,
      ),
    );
  }
}

class _SelectChip extends StatelessWidget {
  const _SelectChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: selected ? OriginColors.forestGreen : OriginColors.offWhite,
      borderRadius: BorderRadius.circular(OriginRadius.full),
      child: InkWell(
        borderRadius: BorderRadius.circular(OriginRadius.full),
        onTap: onTap,
        child: Container(
          padding:
              const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(OriginRadius.full),
            border: Border.all(
              color: selected
                  ? OriginColors.forestGreen
                  : OriginColors.border,
            ),
          ),
          child: Text(
            label,
            style: OriginTextStyles.caption.copyWith(
              color: selected
                  ? OriginColors.offWhite
                  : OriginColors.textSecondary,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ),
    );
  }
}

enum _NoteTone { forest, sand }

class _NoteBox extends StatelessWidget {
  const _NoteBox({
    required this.icon,
    required this.text,
    required this.tone,
  });

  final IconData icon;
  final String text;
  final _NoteTone tone;

  @override
  Widget build(BuildContext context) {
    final bg =
        tone == _NoteTone.forest ? OriginColors.forestGreen50 : OriginColors.sand;
    final fg = tone == _NoteTone.forest
        ? OriginColors.forestGreen
        : OriginColors.ochreDark;
    return Container(
      padding: const EdgeInsets.all(OriginSpacing.sm),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(OriginRadius.md),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Icon(icon, size: 16, color: fg),
          const SizedBox(width: OriginSpacing.sm),
          Expanded(
            child: Text(
              text,
              style: OriginTextStyles.caption
                  .copyWith(color: OriginColors.textSecondary),
            ),
          ),
        ],
      ),
    );
  }
}
