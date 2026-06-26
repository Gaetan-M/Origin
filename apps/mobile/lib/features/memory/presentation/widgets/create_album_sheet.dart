import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:origin_mobile/core/theme/origin_colors.dart';
import 'package:origin_mobile/core/theme/origin_radius.dart';
import 'package:origin_mobile/core/theme/origin_spacing.dart';
import 'package:origin_mobile/core/theme/origin_text_styles.dart';
import 'package:origin_mobile/features/memory/domain/album.dart';
import 'package:origin_mobile/features/memory/domain/visibility_scope.dart';
import 'package:origin_mobile/features/memory/presentation/i18n/memory_strings.dart';
import 'package:origin_mobile/features/memory/presentation/providers/albums_providers.dart';
import 'package:origin_mobile/features/memory/presentation/widgets/visibility_selector.dart';
import 'package:origin_mobile/shared/widgets/origin_button.dart';
import 'package:origin_mobile/shared/widgets/origin_input.dart';

/// Bottom sheet to create a new album. Returns the created [Album] id via the
/// modal result, so the caller can navigate to it.
class CreateAlbumSheet extends ConsumerStatefulWidget {
  const CreateAlbumSheet({super.key, this.subjectPersonId});

  final String? subjectPersonId;

  static Future<String?> show(
    BuildContext context, {
    String? subjectPersonId,
  }) {
    return showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      backgroundColor: OriginColors.offWhite,
      shape: const RoundedRectangleBorder(
        borderRadius:
            BorderRadius.vertical(top: Radius.circular(OriginRadius.xl)),
      ),
      builder: (_) => CreateAlbumSheet(subjectPersonId: subjectPersonId),
    );
  }

  @override
  ConsumerState<CreateAlbumSheet> createState() => _CreateAlbumSheetState();
}

class _CreateAlbumSheetState extends ConsumerState<CreateAlbumSheet> {
  final TextEditingController _title = TextEditingController();
  final TextEditingController _description = TextEditingController();
  AlbumKind _kind = AlbumKind.personal;
  MemoryVisibilityScope _visibility = MemoryVisibilityScope.privateSelf;
  bool _submitting = false;

  @override
  void dispose() {
    _title.dispose();
    _description.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final title = _title.text.trim();
    if (title.isEmpty || _submitting) return;
    setState(() => _submitting = true);
    try {
      final album = await ref.read(albumsControllerProvider).createAlbum(
            title: title,
            description: _description.text.trim().isEmpty
                ? null
                : _description.text.trim(),
            kind: _kind,
            subjectPersonId: widget.subjectPersonId,
            visibility: _visibility,
          );
      if (!mounted) return;
      Navigator.of(context).pop(album.id);
    } catch (_) {
      if (!mounted) return;
      setState(() => _submitting = false);
      final strings = MemoryStrings.of(context);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(strings.genericError)),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final strings = MemoryStrings.of(context);
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    return Padding(
      padding: EdgeInsets.only(bottom: bottomInset),
      child: SafeArea(
        top: false,
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(
            OriginSpacing.lg,
            OriginSpacing.md,
            OriginSpacing.lg,
            OriginSpacing.lg,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
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
                strings.createAlbumTitle,
                style: OriginTextStyles.sectionTitle
                    .copyWith(fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: OriginSpacing.lg),
              OriginInput(
                controller: _title,
                label: strings.fieldTitle,
                hint: strings.fieldTitleHint,
                maxLength: 200,
                textInputAction: TextInputAction.next,
                onChanged: (_) => setState(() {}),
              ),
              const SizedBox(height: OriginSpacing.md),
              OriginInput(
                controller: _description,
                label: strings.fieldDescription,
                hint: strings.fieldDescriptionHint,
                maxLines: 3,
                minLines: 2,
                maxLength: 500,
              ),
              const SizedBox(height: OriginSpacing.md),
              Text(
                strings.fieldKind,
                style: OriginTextStyles.bodyMedium
                    .copyWith(fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: OriginSpacing.sm),
              Row(
                children: <Widget>[
                  for (final kind in AlbumKind.values) ...<Widget>[
                    Expanded(
                      child: _KindChip(
                        label: strings.albumKind(kind),
                        active: _kind == kind,
                        onTap: () => setState(() => _kind = kind),
                      ),
                    ),
                    if (kind != AlbumKind.values.last)
                      const SizedBox(width: OriginSpacing.sm),
                  ],
                ],
              ),
              const SizedBox(height: OriginSpacing.md),
              VisibilitySelector(
                value: _visibility,
                onChanged: (v) => setState(() => _visibility = v),
              ),
              const SizedBox(height: OriginSpacing.lg),
              OriginButton.primary(
                label: _submitting ? strings.creating : strings.createAlbum,
                icon: Icons.photo_album_outlined,
                isLoading: _submitting,
                onPressed: _title.text.trim().isEmpty ? null : _submit,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _KindChip extends StatelessWidget {
  const _KindChip({
    required this.label,
    required this.active,
    required this.onTap,
  });

  final String label;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(OriginRadius.md),
      onTap: onTap,
      child: Container(
        alignment: Alignment.center,
        padding: const EdgeInsets.symmetric(vertical: OriginSpacing.md),
        decoration: BoxDecoration(
          color: active ? OriginColors.deepBlue50 : OriginColors.offWhite,
          borderRadius: BorderRadius.circular(OriginRadius.md),
          border: Border.all(
            color: active ? OriginColors.deepBlue : OriginColors.border,
            width: active ? 1.5 : 1,
          ),
        ),
        child: Text(
          label,
          style: OriginTextStyles.caption.copyWith(
            color: active ? OriginColors.deepBlue : OriginColors.textSecondary,
            fontWeight: active ? FontWeight.w700 : FontWeight.w500,
          ),
        ),
      ),
    );
  }
}
