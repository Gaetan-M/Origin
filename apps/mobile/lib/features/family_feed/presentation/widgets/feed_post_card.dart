import 'package:flutter/material.dart';

import 'package:origin_mobile/core/theme/origin_colors.dart';
import 'package:origin_mobile/core/theme/origin_radius.dart';
import 'package:origin_mobile/core/theme/origin_spacing.dart';
import 'package:origin_mobile/core/theme/origin_text_styles.dart';
import 'package:origin_mobile/core/utils/formatters.dart';
import 'package:origin_mobile/features/family_feed/domain/feed_enums.dart';
import 'package:origin_mobile/features/family_feed/domain/feed_media.dart';
import 'package:origin_mobile/features/family_feed/domain/feed_post.dart';
import 'package:origin_mobile/features/family_feed/presentation/i18n/family_feed_strings.dart';
import 'package:origin_mobile/features/family_feed/presentation/widgets/feed_reaction_bar.dart';
import 'package:origin_mobile/features/family_feed/presentation/widgets/low_data_media_tile.dart';
import 'package:origin_mobile/shared/widgets/person_avatar.dart';

/// A single feed post card. Text/audio-first; heavy media is deferred in
/// low-data mode by [LowDataMediaTile].
class FeedPostCard extends StatelessWidget {
  const FeedPostCard({
    super.key,
    required this.post,
    required this.dataSaver,
    required this.onReact,
    required this.onComment,
    this.onOpenSubject,
  });

  final FeedPost post;
  final bool dataSaver;
  final ValueChanged<FeedReactionType> onReact;
  final VoidCallback onComment;
  final VoidCallback? onOpenSubject;

  @override
  Widget build(BuildContext context) {
    final strings = FeedStrings.of(context);
    return Container(
      decoration: BoxDecoration(
        color: OriginColors.offWhite,
        borderRadius: BorderRadius.circular(OriginRadius.lg),
        border: Border.all(color: OriginColors.border),
      ),
      padding: const EdgeInsets.all(OriginSpacing.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          _Header(post: post, strings: strings, onOpenSubject: onOpenSubject),
          if (_headline(strings) != null) ...<Widget>[
            const SizedBox(height: OriginSpacing.sm),
            Text(
              _headline(strings)!,
              style: OriginTextStyles.bodyLarge
                  .copyWith(fontWeight: FontWeight.w600),
            ),
          ],
          if (post.body != null && post.body!.isNotEmpty) ...<Widget>[
            const SizedBox(height: OriginSpacing.xs),
            Text(post.body!, style: OriginTextStyles.body),
          ],
          if (post.media.isNotEmpty) ...<Widget>[
            const SizedBox(height: OriginSpacing.md),
            _MediaSection(media: post.media, dataSaver: dataSaver),
          ],
          if (post.pending) ...<Widget>[
            const SizedBox(height: OriginSpacing.sm),
            _PendingChip(label: strings.pending),
          ],
          const SizedBox(height: OriginSpacing.sm),
          const Divider(height: 1, color: OriginColors.divider),
          const SizedBox(height: OriginSpacing.xs),
          FeedReactionBar(
            myReaction: post.myReaction,
            reactionCount: post.reactionCount,
            commentCount: post.commentCount,
            onReact: onReact,
            onComment: onComment,
          ),
        ],
      ),
    );
  }

  String? _headline(FeedStrings strings) {
    if (post.postType == FeedPostType.lifeEvent && post.lifeEventKind != null) {
      return strings.lifeEventHeadline(
        post.lifeEventKind!,
        post.subjectDisplayName,
      );
    }
    return null;
  }
}

class _Header extends StatelessWidget {
  const _Header({
    required this.post,
    required this.strings,
    this.onOpenSubject,
  });

  final FeedPost post;
  final FeedStrings strings;
  final VoidCallback? onOpenSubject;

  @override
  Widget build(BuildContext context) {
    final title = post.subjectDisplayName ?? post.authorDisplayName ?? '—';
    return Row(
      children: <Widget>[
        PersonAvatar(
          photoUrl: post.subjectPhotoUrl ?? post.authorPhotoUrl,
          displayName: title,
          lifeStatus: post.subjectLifeStatus,
          size: 44,
        ),
        const SizedBox(width: OriginSpacing.sm),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              GestureDetector(
                onTap: onOpenSubject,
                child: Text(
                  title,
                  style: OriginTextStyles.bodyMedium
                      .copyWith(fontWeight: FontWeight.w700),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              Text(
                Formatters.relativeTime(post.sortAt),
                style: OriginTextStyles.micro,
              ),
            ],
          ),
        ),
        _KindBadge(post: post),
      ],
    );
  }
}

class _KindBadge extends StatelessWidget {
  const _KindBadge({required this.post});

  final FeedPost post;

  @override
  Widget build(BuildContext context) {
    final (icon, color) = _iconFor(post);
    if (icon == null) return const SizedBox.shrink();
    return Container(
      width: 30,
      height: 30,
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        shape: BoxShape.circle,
      ),
      child: Icon(icon, size: 16, color: color),
    );
  }

  (IconData?, Color) _iconFor(FeedPost post) {
    if (post.lifeEventKind != null) {
      switch (post.lifeEventKind!) {
        case FeedLifeEventKind.birth:
          return (Icons.child_friendly, OriginColors.forestGreen);
        case FeedLifeEventKind.death:
          return (Icons.local_florist_outlined, OriginColors.ash);
        case FeedLifeEventKind.union:
          return (Icons.favorite, OriginColors.terracotta);
        case FeedLifeEventKind.unknown:
          return (null, OriginColors.textMuted);
      }
    }
    switch (post.postType) {
      case FeedPostType.announcement:
        return (Icons.campaign_outlined, OriginColors.ochre);
      case FeedPostType.memory:
        return (Icons.photo_album_outlined, OriginColors.deepBlue);
      case FeedPostType.lifeEvent:
      case FeedPostType.text:
      case FeedPostType.unknown:
        return (null, OriginColors.textMuted);
    }
  }
}

class _MediaSection extends StatelessWidget {
  const _MediaSection({required this.media, required this.dataSaver});

  final List<FeedMedia> media;
  final bool dataSaver;

  @override
  Widget build(BuildContext context) {
    // Audio first (light), then heavy media — text/audio-first low-data order.
    final ordered = <FeedMedia>[...media]
      ..sort((a, b) {
        if (a.kind.isHeavy == b.kind.isHeavy) return 0;
        return a.kind.isHeavy ? 1 : -1;
      });
    return Column(
      children: <Widget>[
        for (final m in ordered) ...<Widget>[
          LowDataMediaTile(media: m, dataSaver: dataSaver),
          const SizedBox(height: OriginSpacing.sm),
        ],
      ],
    );
  }
}

class _PendingChip extends StatelessWidget {
  const _PendingChip({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: OriginSpacing.sm,
        vertical: 4,
      ),
      decoration: BoxDecoration(
        color: OriginColors.ochre50,
        borderRadius: BorderRadius.circular(OriginRadius.full),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          const Icon(Icons.schedule, size: 12, color: OriginColors.ochre700),
          const SizedBox(width: 4),
          Text(
            label,
            style: OriginTextStyles.micro.copyWith(color: OriginColors.ochre700),
          ),
        ],
      ),
    );
  }
}
