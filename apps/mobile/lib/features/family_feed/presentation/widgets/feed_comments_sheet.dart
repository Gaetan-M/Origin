import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:origin_mobile/core/theme/origin_colors.dart';
import 'package:origin_mobile/core/theme/origin_radius.dart';
import 'package:origin_mobile/core/theme/origin_spacing.dart';
import 'package:origin_mobile/core/theme/origin_text_styles.dart';
import 'package:origin_mobile/core/utils/formatters.dart';
import 'package:origin_mobile/features/family_feed/domain/feed_comment.dart';
import 'package:origin_mobile/features/family_feed/presentation/i18n/family_feed_strings.dart';
import 'package:origin_mobile/features/family_feed/presentation/providers/family_feed_providers.dart';
import 'package:origin_mobile/shared/widgets/person_avatar.dart';

/// Bottom-sheet list of a post's comments + an offline-capable composer.
///
/// New comments are written through the repository (optimistic + queued), so
/// the list updates instantly even with no connectivity.
class FeedCommentsSheet extends ConsumerStatefulWidget {
  const FeedCommentsSheet({super.key, required this.postId});

  final String postId;

  static Future<void> show(BuildContext context, String postId) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: OriginColors.offWhite,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(OriginRadius.xl)),
      ),
      builder: (_) => FeedCommentsSheet(postId: postId),
    );
  }

  @override
  ConsumerState<FeedCommentsSheet> createState() => _FeedCommentsSheetState();
}

class _FeedCommentsSheetState extends ConsumerState<FeedCommentsSheet> {
  final TextEditingController _controller = TextEditingController();
  bool _sending = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final body = _controller.text.trim();
    if (body.isEmpty || _sending) return;
    setState(() => _sending = true);
    final add = ref.read(addFeedCommentProvider);
    await add(widget.postId, body);
    if (!mounted) return;
    _controller.clear();
    setState(() => _sending = false);
  }

  @override
  Widget build(BuildContext context) {
    final strings = FeedStrings.of(context);
    final commentsAsync = ref.watch(familyFeedCommentsProvider(widget.postId));
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    return Padding(
      padding: EdgeInsets.only(bottom: bottomInset),
      child: DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.7,
        minChildSize: 0.4,
        maxChildSize: 0.95,
        builder: (context, scrollController) {
          return Column(
            children: <Widget>[
              const SizedBox(height: OriginSpacing.sm),
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
              Padding(
                padding: const EdgeInsets.all(OriginSpacing.md),
                child: Text(
                  strings.comments,
                  style: OriginTextStyles.sectionTitle
                      .copyWith(fontWeight: FontWeight.w700),
                ),
              ),
              const Divider(height: 1, color: OriginColors.divider),
              Expanded(
                child: commentsAsync.when(
                  data: (comments) => comments.isEmpty
                      ? Center(
                          child: Padding(
                            padding: const EdgeInsets.all(OriginSpacing.lg),
                            child: Text(
                              strings.noComments,
                              style: OriginTextStyles.body.copyWith(
                                color: OriginColors.textSecondary,
                              ),
                            ),
                          ),
                        )
                      : ListView.separated(
                          controller: scrollController,
                          padding: const EdgeInsets.all(OriginSpacing.md),
                          itemCount: comments.length,
                          separatorBuilder: (_, __) =>
                              const SizedBox(height: OriginSpacing.md),
                          itemBuilder: (_, i) =>
                              _CommentRow(comment: comments[i], strings: strings),
                        ),
                  loading: () => const Center(
                    child: Padding(
                      padding: EdgeInsets.all(OriginSpacing.lg),
                      child: CircularProgressIndicator(strokeWidth: 2.4),
                    ),
                  ),
                  error: (_, __) => Center(
                    child: Padding(
                      padding: const EdgeInsets.all(OriginSpacing.lg),
                      child: Text(strings.noComments,
                          style: OriginTextStyles.body),
                    ),
                  ),
                ),
              ),
              _Composer(
                controller: _controller,
                sending: _sending,
                hint: strings.writeComment,
                sendLabel: strings.send,
                onSend: _send,
              ),
            ],
          );
        },
      ),
    );
  }
}

class _CommentRow extends StatelessWidget {
  const _CommentRow({required this.comment, required this.strings});

  final FeedComment comment;
  final FeedStrings strings;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        PersonAvatar(
          photoUrl: comment.authorPhotoUrl,
          displayName: comment.authorDisplayName,
          size: 36,
          showStatusDot: false,
        ),
        const SizedBox(width: OriginSpacing.sm),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Row(
                children: <Widget>[
                  Flexible(
                    child: Text(
                      comment.authorDisplayName ?? '—',
                      style: OriginTextStyles.bodyMedium
                          .copyWith(fontWeight: FontWeight.w600),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  const SizedBox(width: OriginSpacing.sm),
                  Text(
                    Formatters.relativeTime(comment.createdAt),
                    style: OriginTextStyles.micro,
                  ),
                ],
              ),
              const SizedBox(height: 2),
              Text(comment.body, style: OriginTextStyles.body),
              if (comment.pending) ...<Widget>[
                const SizedBox(height: 2),
                Row(
                  children: <Widget>[
                    const Icon(Icons.schedule,
                        size: 12, color: OriginColors.textMuted),
                    const SizedBox(width: 4),
                    Text(strings.pending, style: OriginTextStyles.micro),
                  ],
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }
}

class _Composer extends StatelessWidget {
  const _Composer({
    required this.controller,
    required this.sending,
    required this.hint,
    required this.sendLabel,
    required this.onSend,
  });

  final TextEditingController controller;
  final bool sending;
  final String hint;
  final String sendLabel;
  final VoidCallback onSend;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: Container(
        padding: const EdgeInsets.fromLTRB(
          OriginSpacing.md,
          OriginSpacing.sm,
          OriginSpacing.md,
          OriginSpacing.md,
        ),
        decoration: const BoxDecoration(
          color: OriginColors.offWhite,
          border: Border(top: BorderSide(color: OriginColors.divider)),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: <Widget>[
            Expanded(
              child: TextField(
                controller: controller,
                minLines: 1,
                maxLines: 4,
                textInputAction: TextInputAction.newline,
                style: OriginTextStyles.body,
                decoration: InputDecoration(
                  hintText: hint,
                  filled: true,
                  fillColor: OriginColors.sand,
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: OriginSpacing.md,
                    vertical: OriginSpacing.sm,
                  ),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(OriginRadius.lg),
                    borderSide: BorderSide.none,
                  ),
                ),
              ),
            ),
            const SizedBox(width: OriginSpacing.sm),
            IconButton(
              onPressed: sending ? null : onSend,
              icon: sending
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2.2),
                    )
                  : const Icon(Icons.send_rounded),
              color: OriginColors.deepBlue,
              tooltip: sendLabel,
            ),
          ],
        ),
      ),
    );
  }
}
