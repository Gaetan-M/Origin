import 'package:flutter/material.dart';

import 'package:origin_mobile/core/theme/origin_colors.dart';
import 'package:origin_mobile/core/theme/origin_radius.dart';
import 'package:origin_mobile/core/theme/origin_spacing.dart';
import 'package:origin_mobile/core/theme/origin_text_styles.dart';
import 'package:origin_mobile/features/memory/domain/album.dart';
import 'package:origin_mobile/features/memory/presentation/i18n/memory_strings.dart';
import 'package:origin_mobile/features/memory/presentation/widgets/memory_network_image.dart';

/// Grid tile for a single album — cover image, kind badge, title + counts.
class AlbumCard extends StatelessWidget {
  const AlbumCard({super.key, required this.album, this.onTap});

  final Album album;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final strings = MemoryStrings.of(context);

    return Material(
      color: OriginColors.offWhite,
      borderRadius: BorderRadius.circular(OriginRadius.lg),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            AspectRatio(
              aspectRatio: 4 / 3,
              child: Stack(
                fit: StackFit.expand,
                children: <Widget>[
                  if (album.coverMediaId != null)
                    MemoryNetworkImage(mediaId: album.coverMediaId!)
                  else
                    const ColoredBox(
                      color: OriginColors.sand,
                      child: Center(
                        child: Icon(
                          Icons.photo_library_outlined,
                          size: 36,
                          color: OriginColors.borderStrong,
                        ),
                      ),
                    ),
                  Positioned(
                    left: OriginSpacing.sm,
                    top: OriginSpacing.sm,
                    child: _KindBadge(label: strings.albumKind(album.kind)),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(OriginSpacing.md),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text(
                    album.title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: OriginTextStyles.bodyMedium
                        .copyWith(fontWeight: FontWeight.w700),
                  ),
                  if (album.subjectPersonName != null) ...<Widget>[
                    const SizedBox(height: 2),
                    Text(
                      strings.albumAbout(album.subjectPersonName!),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: OriginTextStyles.micro,
                    ),
                  ],
                  const SizedBox(height: 4),
                  Text(
                    strings.itemCount(album.itemCount),
                    style: OriginTextStyles.micro
                        .copyWith(color: OriginColors.textMuted),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _KindBadge extends StatelessWidget {
  const _KindBadge({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: OriginColors.offWhite.withValues(alpha: 0.9),
        borderRadius: BorderRadius.circular(OriginRadius.full),
      ),
      child: Text(
        label,
        style: OriginTextStyles.micro.copyWith(
          fontWeight: FontWeight.w600,
          color: OriginColors.charcoal,
        ),
      ),
    );
  }
}
