import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

import 'package:origin_mobile/core/theme/origin_colors.dart';
import 'package:origin_mobile/core/theme/origin_radius.dart';
import 'package:origin_mobile/core/theme/origin_spacing.dart';
import 'package:origin_mobile/core/theme/origin_text_styles.dart';
import 'package:origin_mobile/features/memory/data/memory_media.dart';
import 'package:origin_mobile/features/memory/domain/memorial.dart';
import 'package:origin_mobile/features/memory/domain/visibility_scope.dart';
import 'package:origin_mobile/features/memory/presentation/i18n/memory_strings.dart';
import 'package:origin_mobile/features/memory/presentation/providers/memorial_providers.dart';
import 'package:origin_mobile/features/memory/presentation/widgets/visibility_selector.dart';
import 'package:origin_mobile/shared/widgets/origin_button.dart';

/// Bottom sheet to add a tribute (candle / message / photo / video) to a
/// person's memorial. Sober tone throughout. Mirrors the web AddTributeForm.
class AddTributeSheet extends ConsumerStatefulWidget {
  const AddTributeSheet({super.key, required this.personId});

  final String personId;

  static Future<bool?> show(BuildContext context, String personId) {
    return showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xFFFAF7F2),
      shape: const RoundedRectangleBorder(
        borderRadius:
            BorderRadius.vertical(top: Radius.circular(OriginRadius.xl)),
      ),
      builder: (_) => AddTributeSheet(personId: personId),
    );
  }

  @override
  ConsumerState<AddTributeSheet> createState() => _AddTributeSheetState();
}

class _AddTributeSheetState extends ConsumerState<AddTributeSheet> {
  final TextEditingController _message = TextEditingController();
  final ImagePicker _picker = ImagePicker();

  MemorialTributeKind _kind = MemorialTributeKind.candle;
  MemoryVisibilityScope _visibility = MemoryVisibilityScope.family;
  Uint8List? _bytes;
  String? _fileName;
  String? _mimeType;
  bool _submitting = false;

  @override
  void dispose() {
    _message.dispose();
    super.dispose();
  }

  void _switchKind(MemorialTributeKind kind) {
    setState(() {
      _kind = kind;
      _bytes = null;
      _fileName = null;
      _mimeType = null;
    });
  }

  Future<void> _pickMedia() async {
    final isVideo = _kind == MemorialTributeKind.video;
    final picked = isVideo
        ? await _picker.pickVideo(source: ImageSource.gallery)
        : await _picker.pickImage(source: ImageSource.gallery, imageQuality: 85);
    if (picked == null) return;
    final data = await picked.readAsBytes();
    if (!mounted) return;
    setState(() {
      _bytes = data;
      _fileName = picked.name;
      _mimeType =
          picked.mimeType ?? guessMimeType(picked.name, video: isVideo);
    });
  }

  bool get _canSubmit {
    switch (_kind) {
      case MemorialTributeKind.candle:
        return true;
      case MemorialTributeKind.message:
        return _message.text.trim().isNotEmpty;
      case MemorialTributeKind.photo:
      case MemorialTributeKind.video:
        return _bytes != null;
    }
  }

  Future<void> _submit() async {
    if (!_canSubmit || _submitting) return;
    setState(() => _submitting = true);
    final strings = MemoryStrings.of(context);
    try {
      await ref.read(memorialControllerProvider).addTribute(
            personId: widget.personId,
            kind: _kind,
            message:
                _message.text.trim().isEmpty ? null : _message.text.trim(),
            bytes: _bytes,
            fileName: _fileName,
            mimeType: _mimeType,
            visibility: _visibility,
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
    final needsMedia = _kind.needsMedia;

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
                strings.addTribute,
                style: OriginTextStyles.sectionTitle
                    .copyWith(fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: OriginSpacing.lg),
              Row(
                children: <Widget>[
                  for (final kind in MemorialTributeKind.values) ...<Widget>[
                    Expanded(
                      child: _KindTab(
                        icon: _iconFor(kind),
                        label: strings.tributeKindLabel(kind),
                        active: _kind == kind,
                        onTap: () => _switchKind(kind),
                      ),
                    ),
                    if (kind != MemorialTributeKind.values.last)
                      const SizedBox(width: OriginSpacing.sm),
                  ],
                ],
              ),
              const SizedBox(height: OriginSpacing.md),
              if (_kind != MemorialTributeKind.candle) ...<Widget>[
                TextField(
                  controller: _message,
                  minLines: 2,
                  maxLines: 5,
                  maxLength: 1000,
                  onChanged: (_) => setState(() {}),
                  style: OriginTextStyles.body,
                  decoration: InputDecoration(
                    hintText: strings.tributeMessageHint,
                    filled: true,
                    fillColor: OriginColors.offWhite,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(OriginRadius.md),
                      borderSide: const BorderSide(color: OriginColors.border),
                    ),
                  ),
                ),
              ],
              if (needsMedia) ...<Widget>[
                const SizedBox(height: OriginSpacing.sm),
                _MediaPicker(
                  bytes: _bytes,
                  isVideo: _kind == MemorialTributeKind.video,
                  label: _kind == MemorialTributeKind.video
                      ? strings.chooseTributeVideo
                      : strings.chooseTributePhoto,
                  videoLabel: strings.videoTribute,
                  onPick: _pickMedia,
                ),
              ],
              const SizedBox(height: OriginSpacing.md),
              VisibilitySelector(
                value: _visibility,
                onChanged: (v) => setState(() => _visibility = v),
              ),
              const SizedBox(height: OriginSpacing.lg),
              OriginButton.primary(
                label: _submitting
                    ? strings.submitting
                    : (_kind == MemorialTributeKind.candle
                        ? strings.lightCandle
                        : strings.addTribute),
                icon: _kind == MemorialTributeKind.candle
                    ? Icons.local_fire_department_outlined
                    : Icons.send_rounded,
                isLoading: _submitting,
                onPressed: _canSubmit ? _submit : null,
              ),
            ],
          ),
        ),
      ),
    );
  }

  IconData _iconFor(MemorialTributeKind kind) {
    switch (kind) {
      case MemorialTributeKind.candle:
        return Icons.local_fire_department_outlined;
      case MemorialTributeKind.message:
        return Icons.favorite_border;
      case MemorialTributeKind.photo:
        return Icons.add_photo_alternate_outlined;
      case MemorialTributeKind.video:
        return Icons.videocam_outlined;
    }
  }
}

class _KindTab extends StatelessWidget {
  const _KindTab({
    required this.icon,
    required this.label,
    required this.active,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final color = active ? OriginColors.ochreDark : OriginColors.textSecondary;
    return InkWell(
      borderRadius: BorderRadius.circular(OriginRadius.md),
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: OriginSpacing.md),
        decoration: BoxDecoration(
          color: active ? OriginColors.ochre50 : OriginColors.offWhite,
          borderRadius: BorderRadius.circular(OriginRadius.md),
          border: Border.all(
            color: active ? OriginColors.ochre : OriginColors.border,
            width: active ? 1.5 : 1,
          ),
        ),
        child: Column(
          children: <Widget>[
            Icon(icon, size: 20, color: color),
            const SizedBox(height: 6),
            Text(
              label,
              textAlign: TextAlign.center,
              style: OriginTextStyles.micro.copyWith(
                color: color,
                fontWeight: active ? FontWeight.w700 : FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _MediaPicker extends StatelessWidget {
  const _MediaPicker({
    required this.bytes,
    required this.isVideo,
    required this.label,
    required this.videoLabel,
    required this.onPick,
  });

  final Uint8List? bytes;
  final bool isVideo;
  final String label;
  final String videoLabel;
  final VoidCallback onPick;

  @override
  Widget build(BuildContext context) {
    if (bytes != null) {
      return InkWell(
        borderRadius: BorderRadius.circular(OriginRadius.md),
        onTap: onPick,
        child: ClipRRect(
          borderRadius: BorderRadius.circular(OriginRadius.md),
          child: isVideo
              ? Container(
                  height: 120,
                  alignment: Alignment.center,
                  color: OriginColors.sandDark,
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: <Widget>[
                      const Icon(Icons.play_circle_outline,
                          color: OriginColors.deepBlue),
                      const SizedBox(width: OriginSpacing.sm),
                      Text(videoLabel, style: OriginTextStyles.bodyMedium),
                    ],
                  ),
                )
              : AspectRatio(
                  aspectRatio: 4 / 3,
                  child: Image.memory(bytes!, fit: BoxFit.cover),
                ),
        ),
      );
    }
    return InkWell(
      borderRadius: BorderRadius.circular(OriginRadius.md),
      onTap: onPick,
      child: Container(
        height: 120,
        decoration: BoxDecoration(
          color: OriginColors.offWhite,
          borderRadius: BorderRadius.circular(OriginRadius.md),
          border: Border.all(color: OriginColors.borderStrong),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: <Widget>[
            Icon(
              isVideo
                  ? Icons.videocam_outlined
                  : Icons.add_photo_alternate_outlined,
              size: 30,
              color: OriginColors.textMuted,
            ),
            const SizedBox(height: OriginSpacing.sm),
            Text(label, style: OriginTextStyles.bodyMedium),
          ],
        ),
      ),
    );
  }
}
