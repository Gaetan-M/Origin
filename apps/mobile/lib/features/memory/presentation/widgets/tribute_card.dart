import 'package:flutter/material.dart';

import 'package:origin_mobile/core/theme/origin_colors.dart';
import 'package:origin_mobile/core/theme/origin_radius.dart';
import 'package:origin_mobile/core/theme/origin_spacing.dart';
import 'package:origin_mobile/core/theme/origin_text_styles.dart';
import 'package:origin_mobile/features/memory/domain/memorial.dart';
import 'package:origin_mobile/features/memory/presentation/i18n/memory_strings.dart';
import 'package:origin_mobile/features/memory/presentation/widgets/memory_network_image.dart';

/// A single tribute on the memorial wall. Sober, sepia-toned treatment for the
/// deceased; candles and messages are quiet by design.
class TributeCard extends StatelessWidget {
  const TributeCard({
    super.key,
    required this.tribute,
    this.canDelete = false,
    this.onDelete,
  });

  final MemorialTribute tribute;
  final bool canDelete;
  final VoidCallback? onDelete;

  IconData get _icon {
    switch (tribute.kind) {
      case MemorialTributeKind.candle:
        return Icons.local_fire_department_outlined;
      case MemorialTributeKind.message:
        return Icons.favorite_border;
      case MemorialTributeKind.photo:
        return Icons.photo_outlined;
      case MemorialTributeKind.video:
        return Icons.videocam_outlined;
    }
  }

  @override
  Widget build(BuildContext context) {
    final strings = MemoryStrings.of(context);
    final author = (tribute.authorDisplayName?.trim().isNotEmpty ?? false)
        ? tribute.authorDisplayName!.trim()
        : strings.someone;
    final isCandle = tribute.kind == MemorialTributeKind.candle;

    return Container(
      padding: const EdgeInsets.all(OriginSpacing.md),
      decoration: BoxDecoration(
        // Warm dove/sepia surface, mirroring the web memorial treatment.
        color: const Color(0xFFFAF7F2),
        borderRadius: BorderRadius.circular(OriginRadius.lg),
        border: Border.all(color: OriginColors.sandDark),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: isCandle
                  ? OriginColors.ochre50
                  : OriginColors.forestGreen50,
              shape: BoxShape.circle,
            ),
            child: Icon(
              _icon,
              size: 18,
              color: isCandle
                  ? OriginColors.ochreDark
                  : OriginColors.forestGreen700,
            ),
          ),
          const SizedBox(width: OriginSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text.rich(
                  TextSpan(
                    children: <InlineSpan>[
                      TextSpan(
                        text: author,
                        style: OriginTextStyles.bodyMedium
                            .copyWith(fontWeight: FontWeight.w700),
                      ),
                      const TextSpan(text: ' '),
                      TextSpan(
                        text: strings.tributeKindVerb(tribute.kind),
                        style: OriginTextStyles.body
                            .copyWith(color: OriginColors.textSecondary),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  strings.formatDate(tribute.createdAt),
                  style: OriginTextStyles.micro,
                ),
                if (tribute.message != null &&
                    tribute.message!.trim().isNotEmpty) ...<Widget>[
                  const SizedBox(height: OriginSpacing.sm),
                  Text(
                    '“${tribute.message!.trim()}”',
                    style: OriginTextStyles.body.copyWith(
                      fontStyle: FontStyle.italic,
                      color: OriginColors.textSecondary,
                    ),
                  ),
                ],
                if (tribute.mediaId != null &&
                    tribute.kind == MemorialTributeKind.photo) ...<Widget>[
                  const SizedBox(height: OriginSpacing.md),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(OriginRadius.md),
                    child: AspectRatio(
                      aspectRatio: 4 / 3,
                      child: MemoryNetworkImage(
                        mediaId: tribute.mediaId!,
                        sober: true,
                      ),
                    ),
                  ),
                ],
                if (tribute.mediaId != null &&
                    tribute.kind == MemorialTributeKind.video) ...<Widget>[
                  const SizedBox(height: OriginSpacing.md),
                  _VideoChip(label: strings.videoTribute),
                ],
              ],
            ),
          ),
          if (canDelete && onDelete != null)
            InkWell(
              borderRadius: BorderRadius.circular(OriginRadius.full),
              onTap: onDelete,
              child: const Padding(
                padding: EdgeInsets.all(4),
                child: Icon(Icons.delete_outline,
                    size: 18, color: OriginColors.textMuted),
              ),
            ),
        ],
      ),
    );
  }
}

class _VideoChip extends StatelessWidget {
  const _VideoChip({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: OriginSpacing.md,
        vertical: OriginSpacing.sm,
      ),
      decoration: BoxDecoration(
        color: OriginColors.sand,
        borderRadius: BorderRadius.circular(OriginRadius.md),
        border: Border.all(color: OriginColors.border),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          const Icon(Icons.play_circle_outline,
              size: 22, color: OriginColors.deepBlue),
          const SizedBox(width: OriginSpacing.sm),
          Text(label, style: OriginTextStyles.bodyMedium),
        ],
      ),
    );
  }
}
