import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import 'package:origin_mobile/core/theme/origin_colors.dart';
import 'package:origin_mobile/core/theme/origin_radius.dart';
import 'package:origin_mobile/core/theme/origin_spacing.dart';
import 'package:origin_mobile/core/theme/origin_text_styles.dart';
import 'package:origin_mobile/features/family_feed/domain/feed_enums.dart';
import 'package:origin_mobile/features/family_feed/domain/feed_media.dart';
import 'package:origin_mobile/features/family_feed/presentation/i18n/family_feed_strings.dart';

/// Renders a single piece of feed media with a low-data strategy:
///   * Audio is "light" → always offered first with a play affordance.
///   * Images/video are "heavy" → in low-data mode they are deferred behind a
///     tap-to-load placeholder so no bytes are spent until the user opts in.
class LowDataMediaTile extends StatefulWidget {
  const LowDataMediaTile({
    super.key,
    required this.media,
    required this.dataSaver,
    this.onPlayAudio,
  });

  final FeedMedia media;
  final bool dataSaver;
  final ValueChanged<FeedMedia>? onPlayAudio;

  @override
  State<LowDataMediaTile> createState() => _LowDataMediaTileState();
}

class _LowDataMediaTileState extends State<LowDataMediaTile> {
  bool _revealed = false;

  @override
  Widget build(BuildContext context) {
    final strings = FeedStrings.of(context);
    final media = widget.media;

    if (media.kind == FeedMediaKind.audio) {
      return _AudioTile(
        media: media,
        label: strings.playAudio,
        onTap: () => widget.onPlayAudio?.call(media),
      );
    }

    final shouldDefer = widget.dataSaver && !_revealed;
    if (shouldDefer) {
      return _DeferredMediaPlaceholder(
        media: media,
        strings: strings,
        onReveal: () => setState(() => _revealed = true),
      );
    }

    final url = media.url ?? media.thumbUrl;
    if (url == null || url.isEmpty) {
      return const SizedBox.shrink();
    }

    return ClipRRect(
      borderRadius: BorderRadius.circular(OriginRadius.md),
      child: AspectRatio(
        aspectRatio: _aspectRatio(media),
        child: CachedNetworkImage(
          imageUrl: url,
          fit: BoxFit.cover,
          placeholder: (_, __) => Container(
            color: OriginColors.sandDark,
            alignment: Alignment.center,
            child: const SizedBox(
              width: 22,
              height: 22,
              child: CircularProgressIndicator(strokeWidth: 2.2),
            ),
          ),
          errorWidget: (_, __, ___) => Container(
            color: OriginColors.sandDark,
            alignment: Alignment.center,
            child: const Icon(
              Icons.broken_image_outlined,
              color: OriginColors.textMuted,
            ),
          ),
        ),
      ),
    );
  }

  double _aspectRatio(FeedMedia media) {
    final w = media.width;
    final h = media.height;
    if (w != null && h != null && w > 0 && h > 0) {
      return (w / h).clamp(0.6, 2.0);
    }
    return 4 / 3;
  }
}

class _DeferredMediaPlaceholder extends StatelessWidget {
  const _DeferredMediaPlaceholder({
    required this.media,
    required this.strings,
    required this.onReveal,
  });

  final FeedMedia media;
  final FeedStrings strings;
  final VoidCallback onReveal;

  @override
  Widget build(BuildContext context) {
    final kb = media.byteSize != null ? (media.byteSize! / 1024).round() : null;
    return InkWell(
      borderRadius: BorderRadius.circular(OriginRadius.md),
      onTap: onReveal,
      child: AspectRatio(
        aspectRatio: 4 / 3,
        child: DecoratedBox(
          decoration: BoxDecoration(
            color: OriginColors.sandDark,
            borderRadius: BorderRadius.circular(OriginRadius.md),
            border: Border.all(color: OriginColors.border),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: <Widget>[
              const Icon(
                Icons.image_outlined,
                size: 32,
                color: OriginColors.textMuted,
              ),
              const SizedBox(height: OriginSpacing.sm),
              Text(strings.showMedia, style: OriginTextStyles.bodyMedium),
              const SizedBox(height: 2),
              Text(
                kb != null
                    ? '${strings.lowDataNote} · ~${kb} Ko'
                    : strings.lowDataNote,
                style: OriginTextStyles.micro,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _AudioTile extends StatelessWidget {
  const _AudioTile({
    required this.media,
    required this.label,
    required this.onTap,
  });

  final FeedMedia media;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final seconds = media.durationSeconds;
    final duration = seconds != null
        ? '${(seconds ~/ 60).toString().padLeft(1, '0')}:${(seconds % 60).toString().padLeft(2, '0')}'
        : null;
    return InkWell(
      borderRadius: BorderRadius.circular(OriginRadius.full),
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(
          horizontal: OriginSpacing.md,
          vertical: OriginSpacing.sm,
        ),
        decoration: BoxDecoration(
          color: OriginColors.forestGreen50,
          borderRadius: BorderRadius.circular(OriginRadius.full),
          border: Border.all(color: OriginColors.forestGreen100),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            const Icon(
              Icons.play_circle_fill,
              color: OriginColors.forestGreen,
              size: 28,
            ),
            const SizedBox(width: OriginSpacing.sm),
            Text(
              label,
              style: OriginTextStyles.bodyMedium.copyWith(
                color: OriginColors.forestGreen700,
              ),
            ),
            if (duration != null) ...<Widget>[
              const SizedBox(width: OriginSpacing.sm),
              Text(duration, style: OriginTextStyles.micro),
            ],
          ],
        ),
      ),
    );
  }
}
