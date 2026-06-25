import 'package:flutter/material.dart';

import 'package:origin_mobile/core/theme/origin_colors.dart';
import 'package:origin_mobile/core/theme/origin_radius.dart';
import 'package:origin_mobile/core/theme/origin_spacing.dart';
import 'package:origin_mobile/core/theme/origin_text_styles.dart';
import 'package:origin_mobile/features/family_feed/domain/feed_enums.dart';
import 'package:origin_mobile/features/family_feed/presentation/i18n/family_feed_strings.dart';

/// Action row under a post: react / comment, plus running counts.
class FeedReactionBar extends StatelessWidget {
  const FeedReactionBar({
    super.key,
    required this.myReaction,
    required this.reactionCount,
    required this.commentCount,
    required this.onReact,
    required this.onComment,
  });

  final FeedReactionType? myReaction;
  final int reactionCount;
  final int commentCount;
  final ValueChanged<FeedReactionType> onReact;
  final VoidCallback onComment;

  @override
  Widget build(BuildContext context) {
    final strings = FeedStrings.of(context);
    final active = myReaction != null;
    return Row(
      children: <Widget>[
        _BarButton(
          icon: active ? Icons.favorite : Icons.favorite_border,
          label: active ? strings.reactionLabel(myReaction!) : strings.react,
          count: reactionCount,
          active: active,
          activeColor: OriginColors.terracotta,
          onTap: () => _openReactionPicker(context),
        ),
        const SizedBox(width: OriginSpacing.sm),
        _BarButton(
          icon: Icons.mode_comment_outlined,
          label: strings.comment,
          count: commentCount,
          active: false,
          activeColor: OriginColors.deepBlue,
          onTap: onComment,
        ),
      ],
    );
  }

  Future<void> _openReactionPicker(BuildContext context) async {
    // Quick toggle on tap of the most common reaction; long-press affordance
    // (the picker) lets the user choose the exact tone. We surface a compact
    // inline picker as a bottom sheet to follow the "no OK-only modal" rule.
    final strings = FeedStrings.of(context);
    final selected = await showModalBottomSheet<FeedReactionType>(
      context: context,
      backgroundColor: OriginColors.offWhite,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(OriginRadius.xl)),
      ),
      builder: (ctx) => SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.all(OriginSpacing.lg),
          child: Wrap(
            spacing: OriginSpacing.md,
            runSpacing: OriginSpacing.md,
            alignment: WrapAlignment.center,
            children: <Widget>[
              for (final type in FeedReactionType.values)
                _ReactionChoice(
                  emoji: _emojiFor(type),
                  label: strings.reactionLabel(type),
                  selected: type == myReaction,
                  onTap: () => Navigator.of(ctx).pop(type),
                ),
            ],
          ),
        ),
      ),
    );
    if (selected != null) {
      onReact(selected);
    }
  }

  static String _emojiFor(FeedReactionType type) {
    switch (type) {
      case FeedReactionType.like:
        return '👍';
      case FeedReactionType.love:
        return '❤️';
      case FeedReactionType.pray:
        return '🙏';
      case FeedReactionType.sad:
        return '😢';
      case FeedReactionType.celebrate:
        return '🎉';
    }
  }
}

class _BarButton extends StatelessWidget {
  const _BarButton({
    required this.icon,
    required this.label,
    required this.count,
    required this.active,
    required this.activeColor,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final int count;
  final bool active;
  final Color activeColor;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final color = active ? activeColor : OriginColors.textSecondary;
    return InkWell(
      borderRadius: BorderRadius.circular(OriginRadius.full),
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(
          horizontal: OriginSpacing.md,
          vertical: OriginSpacing.sm,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            Icon(icon, size: 20, color: color),
            const SizedBox(width: OriginSpacing.xs),
            Text(
              count > 0 ? '$label · $count' : label,
              style: OriginTextStyles.caption.copyWith(
                color: color,
                fontWeight: active ? FontWeight.w600 : FontWeight.w400,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ReactionChoice extends StatelessWidget {
  const _ReactionChoice({
    required this.emoji,
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String emoji;
  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(OriginRadius.lg),
      onTap: onTap,
      child: Container(
        width: 84,
        padding: const EdgeInsets.symmetric(vertical: OriginSpacing.md),
        decoration: BoxDecoration(
          color: selected ? OriginColors.terracotta50 : OriginColors.sand,
          borderRadius: BorderRadius.circular(OriginRadius.lg),
          border: Border.all(
            color: selected ? OriginColors.terracotta : OriginColors.border,
            width: selected ? 1.5 : 1,
          ),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            Text(emoji, style: const TextStyle(fontSize: 26)),
            const SizedBox(height: OriginSpacing.xs),
            Text(
              label,
              textAlign: TextAlign.center,
              style: OriginTextStyles.micro,
            ),
          ],
        ),
      ),
    );
  }
}
