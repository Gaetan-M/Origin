import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

import 'package:origin_mobile/core/theme/origin_colors.dart';
import 'package:origin_mobile/core/theme/origin_radius.dart';
import 'package:origin_mobile/core/theme/origin_spacing.dart';
import 'package:origin_mobile/core/theme/origin_text_styles.dart';
import 'package:origin_mobile/features/memory/data/memory_media.dart';
import 'package:origin_mobile/features/memory/presentation/i18n/memory_strings.dart';
import 'package:origin_mobile/features/memory/presentation/providers/albums_providers.dart';
import 'package:origin_mobile/shared/widgets/origin_button.dart';
import 'package:origin_mobile/shared/widgets/origin_input.dart';

/// Bottom sheet to add a photo (album item): pick image, caption, date.
class AddAlbumItemSheet extends ConsumerStatefulWidget {
  const AddAlbumItemSheet({super.key, required this.albumId});

  final String albumId;

  static Future<bool?> show(BuildContext context, String albumId) {
    return showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: OriginColors.offWhite,
      shape: const RoundedRectangleBorder(
        borderRadius:
            BorderRadius.vertical(top: Radius.circular(OriginRadius.xl)),
      ),
      builder: (_) => AddAlbumItemSheet(albumId: albumId),
    );
  }

  @override
  ConsumerState<AddAlbumItemSheet> createState() => _AddAlbumItemSheetState();
}

class _AddAlbumItemSheetState extends ConsumerState<AddAlbumItemSheet> {
  final TextEditingController _caption = TextEditingController();
  final TextEditingController _takenAtText = TextEditingController();
  final ImagePicker _picker = ImagePicker();

  Uint8List? _bytes;
  String? _fileName;
  String? _mimeType;
  DateTime? _takenAt;
  bool _submitting = false;

  @override
  void dispose() {
    _caption.dispose();
    _takenAtText.dispose();
    super.dispose();
  }

  Future<void> _pick() async {
    final picked = await _picker.pickImage(
      source: ImageSource.gallery,
      imageQuality: 85,
    );
    if (picked == null) return;
    final bytes = await picked.readAsBytes();
    if (!mounted) return;
    setState(() {
      _bytes = bytes;
      _fileName = picked.name;
      _mimeType = picked.mimeType ?? guessMimeType(picked.name);
    });
  }

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _takenAt ?? now,
      firstDate: DateTime(1900),
      lastDate: now,
    );
    if (picked != null) setState(() => _takenAt = picked);
  }

  String? get _takenAtIso {
    final d = _takenAt;
    if (d == null) return null;
    return '${d.year.toString().padLeft(4, '0')}-'
        '${d.month.toString().padLeft(2, '0')}-'
        '${d.day.toString().padLeft(2, '0')}';
  }

  Future<void> _submit() async {
    final bytes = _bytes;
    if (bytes == null || _submitting) return;
    setState(() => _submitting = true);
    final strings = MemoryStrings.of(context);
    try {
      await ref.read(albumsControllerProvider).addPhoto(
            albumId: widget.albumId,
            bytes: bytes,
            fileName: _fileName ?? 'photo.jpg',
            mimeType: _mimeType ?? 'image/jpeg',
            caption: _caption.text.trim().isEmpty ? null : _caption.text.trim(),
            takenAt: _takenAtIso,
            takenAtText: _takenAtText.text.trim().isEmpty
                ? null
                : _takenAtText.text.trim(),
          );
      if (!mounted) return;
      Navigator.of(context).pop(true);
    } catch (_) {
      if (!mounted) return;
      setState(() => _submitting = false);
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
                strings.addPhoto,
                style: OriginTextStyles.sectionTitle
                    .copyWith(fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: OriginSpacing.lg),
              _PhotoPicker(
                bytes: _bytes,
                label: strings.choosePhoto,
                onPick: _pick,
                onClear: () => setState(() {
                  _bytes = null;
                  _fileName = null;
                }),
              ),
              if (_bytes != null) ...<Widget>[
                const SizedBox(height: OriginSpacing.md),
                OriginInput(
                  controller: _caption,
                  label: strings.fieldCaption,
                  hint: strings.fieldCaptionHint,
                  maxLines: 2,
                  maxLength: 500,
                ),
                const SizedBox(height: OriginSpacing.md),
                _DateField(
                  label: strings.fieldTakenAt,
                  value: _takenAt == null
                      ? strings.pickDate
                      : strings.formatDate(_takenAt!),
                  hasValue: _takenAt != null,
                  onTap: _pickDate,
                  onClear:
                      _takenAt == null ? null : () => setState(() => _takenAt = null),
                ),
                const SizedBox(height: OriginSpacing.md),
                OriginInput(
                  controller: _takenAtText,
                  label: strings.fieldTakenAtText,
                  hint: strings.fieldTakenAtTextHint,
                  maxLength: 100,
                ),
                const SizedBox(height: OriginSpacing.lg),
                OriginButton.primary(
                  label: _submitting ? strings.uploading : strings.save,
                  icon: Icons.check_rounded,
                  isLoading: _submitting,
                  onPressed: _submit,
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _PhotoPicker extends StatelessWidget {
  const _PhotoPicker({
    required this.bytes,
    required this.label,
    required this.onPick,
    required this.onClear,
  });

  final Uint8List? bytes;
  final String label;
  final VoidCallback onPick;
  final VoidCallback onClear;

  @override
  Widget build(BuildContext context) {
    if (bytes != null) {
      return Stack(
        alignment: Alignment.topRight,
        children: <Widget>[
          ClipRRect(
            borderRadius: BorderRadius.circular(OriginRadius.md),
            child: AspectRatio(
              aspectRatio: 4 / 3,
              child: Image.memory(bytes!, fit: BoxFit.cover),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(OriginSpacing.sm),
            child: Material(
              color: OriginColors.charcoal.withValues(alpha: 0.7),
              shape: const CircleBorder(),
              child: InkWell(
                customBorder: const CircleBorder(),
                onTap: onClear,
                child: const Padding(
                  padding: EdgeInsets.all(6),
                  child: Icon(Icons.close, size: 18, color: Colors.white),
                ),
              ),
            ),
          ),
        ],
      );
    }
    return InkWell(
      borderRadius: BorderRadius.circular(OriginRadius.md),
      onTap: onPick,
      child: Container(
        height: 160,
        decoration: BoxDecoration(
          color: OriginColors.sand,
          borderRadius: BorderRadius.circular(OriginRadius.md),
          border: Border.all(
            color: OriginColors.borderStrong,
            style: BorderStyle.solid,
          ),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: <Widget>[
            const Icon(Icons.add_photo_alternate_outlined,
                size: 34, color: OriginColors.textMuted),
            const SizedBox(height: OriginSpacing.sm),
            Text(label, style: OriginTextStyles.bodyMedium),
          ],
        ),
      ),
    );
  }
}

class _DateField extends StatelessWidget {
  const _DateField({
    required this.label,
    required this.value,
    required this.hasValue,
    required this.onTap,
    this.onClear,
  });

  final String label;
  final String value;
  final bool hasValue;
  final VoidCallback onTap;
  final VoidCallback? onClear;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Text(
          label,
          style: OriginTextStyles.bodyMedium
              .copyWith(fontWeight: FontWeight.w600),
        ),
        const SizedBox(height: 6),
        InkWell(
          borderRadius: BorderRadius.circular(OriginRadius.md),
          onTap: onTap,
          child: Container(
            padding: const EdgeInsets.symmetric(
              horizontal: OriginSpacing.md,
              vertical: OriginSpacing.md,
            ),
            decoration: BoxDecoration(
              color: OriginColors.offWhite,
              borderRadius: BorderRadius.circular(OriginRadius.md),
              border: Border.all(color: OriginColors.border),
            ),
            child: Row(
              children: <Widget>[
                const Icon(Icons.event_outlined,
                    size: 20, color: OriginColors.textMuted),
                const SizedBox(width: OriginSpacing.sm),
                Expanded(
                  child: Text(
                    value,
                    style: OriginTextStyles.body.copyWith(
                      color: hasValue
                          ? OriginColors.charcoal
                          : OriginColors.textMuted,
                    ),
                  ),
                ),
                if (onClear != null)
                  InkWell(
                    onTap: onClear,
                    child: const Icon(Icons.close,
                        size: 18, color: OriginColors.textMuted),
                  ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
