import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:origin_mobile/core/theme/origin_colors.dart';
import 'package:origin_mobile/core/theme/origin_spacing.dart';
import 'package:origin_mobile/core/theme/origin_text_styles.dart';
import 'package:origin_mobile/features/discover/presentation/i18n/discover_strings.dart';
import 'package:origin_mobile/features/discover/presentation/providers/discover_providers.dart';
import 'package:origin_mobile/features/discover/presentation/screens/submit_cultural_content_screen.dart';
import 'package:origin_mobile/features/discover/presentation/widgets/content_type_filter.dart';
import 'package:origin_mobile/features/discover/presentation/widgets/cultural_card.dart';
import 'package:origin_mobile/shared/widgets/empty_state_view.dart';
import 'package:origin_mobile/shared/widgets/error_view.dart';
import 'package:origin_mobile/shared/widgets/loading_view.dart';
import 'package:origin_mobile/shared/widgets/origin_scaffold.dart';

/// PUBLIC culture-discovery feed.
///
/// Online-first cursor-paginated feed of approved cultural-heritage content,
/// with a content-type facet filter and a verified-authority badge on cards.
/// A FAB opens the contribution form.
class DiscoverScreen extends ConsumerStatefulWidget {
  const DiscoverScreen({super.key});

  @override
  ConsumerState<DiscoverScreen> createState() => _DiscoverScreenState();
}

class _DiscoverScreenState extends ConsumerState<DiscoverScreen> {
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
      ref.read(discoverFeedControllerProvider.notifier).loadMore();
    }
  }

  void _openSubmit() {
    Navigator.of(context).push<void>(
      MaterialPageRoute<void>(
        builder: (_) => const SubmitCulturalContentScreen(),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final strings = DiscoverStrings.of(context);
    final state = ref.watch(discoverFeedControllerProvider);
    final controller = ref.read(discoverFeedControllerProvider.notifier);

    return OriginScaffold(
      backgroundColor: OriginColors.sand,
      appBar: AppBar(
        backgroundColor: OriginColors.sand,
        elevation: 0,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            Text(
              strings.title,
              style: OriginTextStyles.sectionTitle
                  .copyWith(fontWeight: FontWeight.w700),
            ),
            Text(
              strings.subtitle,
              style: OriginTextStyles.micro,
            ),
          ],
        ),
        actions: <Widget>[
          Padding(
            padding: const EdgeInsets.only(right: OriginSpacing.sm),
            child: TextButton.icon(
              onPressed: _openSubmit,
              style: TextButton.styleFrom(
                foregroundColor: OriginColors.terracotta,
              ),
              icon: const Icon(Icons.add, size: 20),
              label: Text(strings.share),
            ),
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: <Widget>[
            const SizedBox(height: OriginSpacing.sm),
            ContentTypeFilter(
              value: state.contentType,
              onChanged: controller.setContentType,
              strings: strings,
            ),
            const SizedBox(height: OriginSpacing.sm),
            Expanded(
              child: RefreshIndicator(
                color: OriginColors.deepBlue,
                onRefresh: controller.refresh,
                child: _buildBody(strings, state),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBody(DiscoverStrings strings, DiscoverFeedState state) {
    if (state.isEmpty && state.isInitialLoading) {
      return const LoadingView();
    }

    if (state.isEmpty && state.error != null) {
      return _ScrollableFill(
        controller: _scrollController,
        child: ErrorView(
          title: strings.errorTitle,
          message: strings.errorSubtitle,
          onRetry: () =>
              ref.read(discoverFeedControllerProvider.notifier).refresh(),
        ),
      );
    }

    if (state.isEmpty) {
      return _ScrollableFill(
        controller: _scrollController,
        child: EmptyStateView(
          icon: Icons.explore_outlined,
          title: strings.emptyTitle,
          subtitle: strings.emptyHint,
        ),
      );
    }

    return ListView.separated(
      controller: _scrollController,
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(
        OriginSpacing.md,
        OriginSpacing.sm,
        OriginSpacing.md,
        OriginSpacing.xxl,
      ),
      itemCount: state.items.length + (state.isLoadingMore ? 1 : 0),
      separatorBuilder: (_, __) => const SizedBox(height: OriginSpacing.md),
      itemBuilder: (context, index) {
        if (index >= state.items.length) {
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
        return CulturalCard(item: state.items[index], strings: strings);
      },
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
