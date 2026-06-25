import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:origin_mobile/core/routing/route_paths.dart';
import 'package:origin_mobile/core/theme/origin_colors.dart';
import 'package:origin_mobile/core/theme/origin_spacing.dart';
import 'package:origin_mobile/core/theme/origin_text_styles.dart';
import 'package:origin_mobile/features/family_feed/data/family_feed_providers_data.dart';
import 'package:origin_mobile/features/family_feed/domain/feed_enums.dart';
import 'package:origin_mobile/features/family_feed/domain/feed_post.dart';
import 'package:origin_mobile/features/family_feed/presentation/i18n/family_feed_strings.dart';
import 'package:origin_mobile/features/family_feed/presentation/providers/family_feed_providers.dart';
import 'package:origin_mobile/features/family_feed/presentation/widgets/feed_comments_sheet.dart';
import 'package:origin_mobile/features/family_feed/presentation/widgets/feed_post_card.dart';
import 'package:origin_mobile/shared/widgets/empty_state_view.dart';
import 'package:origin_mobile/shared/widgets/error_view.dart';
import 'package:origin_mobile/shared/widgets/loading_view.dart';
import 'package:origin_mobile/shared/widgets/origin_scaffold.dart';

/// Offline-first family feed.
///
/// Reads from the Drift cache stream (instant, works offline) while a network
/// sync runs in the background; reactions and comments are applied optimistically
/// and queued for push.
class FamilyFeedScreen extends ConsumerStatefulWidget {
  const FamilyFeedScreen({super.key});

  @override
  ConsumerState<FamilyFeedScreen> createState() => _FamilyFeedScreenState();
}

class _FamilyFeedScreenState extends ConsumerState<FamilyFeedScreen> {
  final ScrollController _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _scrollController
      ..removeListener(_onScroll)
      ..dispose();
    super.dispose();
  }

  void _onScroll() {
    if (!_scrollController.hasClients) return;
    final position = _scrollController.position;
    if (position.pixels >= position.maxScrollExtent - 400) {
      ref.read(familyFeedControllerProvider.notifier).loadMore();
    }
  }

  @override
  Widget build(BuildContext context) {
    final strings = FeedStrings.of(context);
    final cached = ref.watch(familyFeedStreamProvider);
    final sync = ref.watch(familyFeedControllerProvider);
    final dataSaver = ref.watch(feedDataSaverProvider);

    return OriginScaffold(
      backgroundColor: OriginColors.sand,
      appBar: AppBar(
        backgroundColor: OriginColors.sand,
        elevation: 0,
        title: Text(
          strings.title,
          style: OriginTextStyles.sectionTitle.copyWith(
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
      body: SafeArea(
        child: Column(
          children: <Widget>[
            if (sync.isOffline) _OfflineBanner(label: strings.offlineBanner),
            Expanded(
              child: RefreshIndicator(
                color: OriginColors.deepBlue,
                onRefresh: () =>
                    ref.read(familyFeedControllerProvider.notifier).refresh(),
                child: _buildBody(context, strings, cached, sync, dataSaver),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBody(
    BuildContext context,
    FeedStrings strings,
    AsyncValue<List<FeedPost>> cached,
    FamilyFeedSyncState sync,
    bool dataSaver,
  ) {
    final posts = cached.valueOrNull ?? const <FeedPost>[];

    // First load with nothing cached yet.
    if (posts.isEmpty && sync.isInitialLoading) {
      return const LoadingView();
    }

    // Nothing cached and the network failed → error with retry.
    if (posts.isEmpty && sync.error != null) {
      return _ScrollableFill(
        controller: _scrollController,
        child: ErrorView(
          title: strings.errorTitle,
          message: strings.errorSubtitle,
          onRetry: () =>
              ref.read(familyFeedControllerProvider.notifier).refresh(),
        ),
      );
    }

    if (posts.isEmpty) {
      return _ScrollableFill(
        controller: _scrollController,
        child: EmptyStateView(
          icon: Icons.groups_2_outlined,
          title: strings.emptyTitle,
          subtitle: strings.emptySubtitle,
        ),
      );
    }

    return ListView.separated(
      controller: _scrollController,
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(OriginSpacing.md),
      itemCount: posts.length + (sync.isLoadingMore ? 1 : 0),
      separatorBuilder: (_, __) => const SizedBox(height: OriginSpacing.md),
      itemBuilder: (context, index) {
        if (index >= posts.length) {
          return const Padding(
            padding: EdgeInsets.symmetric(vertical: OriginSpacing.md),
            child: Center(
              child: SizedBox(
                width: 22,
                height: 22,
                child: CircularProgressIndicator(strokeWidth: 2.2),
              ),
            ),
          );
        }
        final post = posts[index];
        return FeedPostCard(
          post: post,
          dataSaver: dataSaver,
          onReact: (type) => _react(post, type),
          onComment: () => FeedCommentsSheet.show(context, post.id),
          onOpenSubject: post.subjectPersonId == null
              ? null
              : () => context.push(
                    RoutePaths.personDetail(post.subjectPersonId!),
                  ),
        );
      },
    );
  }

  void _react(FeedPost post, FeedReactionType type) {
    ref.read(familyFeedControllerProvider.notifier).toggleReaction(post, type);
  }
}

class _OfflineBanner extends StatelessWidget {
  const _OfflineBanner({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      color: OriginColors.ochre50,
      padding: const EdgeInsets.symmetric(
        horizontal: OriginSpacing.md,
        vertical: OriginSpacing.sm,
      ),
      child: Row(
        children: <Widget>[
          const Icon(Icons.cloud_off_outlined,
              size: 16, color: OriginColors.ochre700),
          const SizedBox(width: OriginSpacing.sm),
          Expanded(
            child: Text(
              label,
              style: OriginTextStyles.caption
                  .copyWith(color: OriginColors.ochre900),
            ),
          ),
        ],
      ),
    );
  }
}

/// Wraps a non-scrolling child so pull-to-refresh still works on empty/error.
class _ScrollableFill extends StatelessWidget {
  const _ScrollableFill({required this.controller, required this.child});

  final ScrollController controller;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        return SingleChildScrollView(
          controller: controller,
          physics: const AlwaysScrollableScrollPhysics(),
          child: ConstrainedBox(
            constraints: BoxConstraints(minHeight: constraints.maxHeight),
            child: child,
          ),
        );
      },
    );
  }
}
