import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import 'package:origin_mobile/core/theme/origin_colors.dart';
import 'package:origin_mobile/features/memory/data/memory_media.dart';

/// Renders a media item (by its `media_id`) streamed from `GET /media/:id/file`.
///
/// [sober] applies a gentle sepia/desaturation, used on memorial surfaces for a
/// respectful treatment of the deceased.
class MemoryNetworkImage extends StatelessWidget {
  const MemoryNetworkImage({
    super.key,
    required this.mediaId,
    this.fit = BoxFit.cover,
    this.sober = false,
  });

  final String mediaId;
  final BoxFit fit;
  final bool sober;

  @override
  Widget build(BuildContext context) {
    final image = CachedNetworkImage(
      imageUrl: memoryMediaUrl(mediaId),
      fit: fit,
      placeholder: (_, __) => const ColoredBox(
        color: OriginColors.sandDark,
        child: Center(
          child: SizedBox(
            width: 22,
            height: 22,
            child: CircularProgressIndicator(strokeWidth: 2.2),
          ),
        ),
      ),
      errorWidget: (_, __, ___) => const ColoredBox(
        color: OriginColors.sandDark,
        child: Center(
          child: Icon(
            Icons.broken_image_outlined,
            color: OriginColors.textMuted,
          ),
        ),
      ),
    );

    if (!sober) return image;

    // Subtle warm desaturation for memorial photos.
    return ColorFiltered(
      colorFilter: const ColorFilter.matrix(<double>[
        0.45, 0.45, 0.08, 0, 6,
        0.38, 0.52, 0.08, 0, 6,
        0.30, 0.40, 0.20, 0, 4,
        0, 0, 0, 1, 0,
      ]),
      child: image,
    );
  }
}
