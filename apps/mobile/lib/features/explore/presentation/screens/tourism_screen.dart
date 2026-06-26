import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:origin_mobile/core/theme/origin_colors.dart';
import 'package:origin_mobile/core/theme/origin_spacing.dart';
import 'package:origin_mobile/core/theme/origin_text_styles.dart';
import 'package:origin_mobile/features/explore/domain/tourism_enums.dart';
import 'package:origin_mobile/features/explore/presentation/i18n/tourism_strings.dart';
import 'package:origin_mobile/features/explore/presentation/providers/tourism_providers.dart';
import 'package:origin_mobile/features/explore/presentation/widgets/place_card.dart';
import 'package:origin_mobile/features/explore/presentation/widgets/submit_place_sheet.dart';
import 'package:origin_mobile/shared/widgets/empty_state_view.dart';
import 'package:origin_mobile/shared/widgets/error_view.dart';
import 'package:origin_mobile/shared/widgets/loading_view.dart';
import 'package:origin_mobile/shared/widgets/origin_scaffold.dart';

/// PUBLIC tourism / heritage-places surface. Online-first; cursor-paginated.
class TourismScreen extends ConsumerStatefulWidget {
  const TourismScreen({super.key});

  @override
  ConsumerState<TourismScreen> createState() => _TourismScreenState();
}

class _TourismScreenState extends ConsumerState<TourismScreen> {
  final ScrollController _scrollController = ScrollController();
  final TextEditingController _regionController = TextEditingController();

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
    _regionController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (!_scrollController.hasClients) return;
    final position = _scrollController.position;
    if (position.pixels >= position.maxScrollExtent - 400) {
      ref.read(tourismListControllerProvider.notifier).loadMore();
    }
  }

  Future<void> _openSubmit(TourismStrings strings) async {
    final controller = ref.read(tourismListControllerProvider.notifier);
    final submitted = await SubmitPlaceSheet.show(
      context,
      onSubmit: (input) => controller.submit(input),
    );
    if (submitted == true && mounted) {
      ScaffoldMessenger.of(context)
        ..clearSnackBars()
        ..showSnackBar(
          SnackBar(content: Text(strings.submitSuccess)),
        );
    }
  }

  @override
  Widget build(BuildContext context) {
    final strings = TourismStrings.of(context);
    final state = ref.watch(tourismListControllerProvider);
    final controller = ref.read(tourismListControllerProvider.notifier);

    return OriginScaffold(
      backgroundColor: OriginColors.sand,
      appBar: AppBar(
        backgroundColor: OriginColors.sand,
        elevation: 0,
        title: Text(
          strings.title,
          style: OriginTextStyles.sectionTitle
              .copyWith(fontWeight: FontWeight.w700),
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: OriginColors.deepBlue,
        foregroundColor: OriginColors.offWhite,
        onPressed: () => _openSubmit(strings),
        icon: const Icon(Icons.add),
        label: Text(strings.submit),
      ),
      body: SafeArea(
        child: RefreshIndicator(
          color: OriginColors.deepBlue,
          onRefresh: controller.refresh,
          child: _buildBody(context, strings, state, controller),
        ),
      ),
    );
  }

  Widget _buildBody(
    BuildContext context,
    TourismStrings strings,
    TourismListState state,
    TourismListController controller,
  ) {
    return CustomScrollView(
      controller: _scrollController,
      physics: const AlwaysScrollableScrollPhysics(),
      slivers: <Widget>[
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(
              OriginSpacing.md,
              OriginSpacing.sm,
              OriginSpacing.md,
              0,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(
                  strings.subtitle,
                  style: OriginTextStyles.body
                      .copyWith(color: OriginColors.textSecondary),
                ),
                const SizedBox(height: OriginSpacing.md),
                _filters(strings, state, controller),
                const SizedBox(height: OriginSpacing.sm),
              ],
            ),
          ),
        ),
        ..._content(strings, state, controller),
        const SliverToBoxAdapter(
          child: SizedBox(height: OriginSpacing.xxl),
        ),
      ],
    );
  }

  Widget _filters(
    TourismStrings strings,
    TourismListState state,
    TourismListController controller,
  ) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Row(
          children: <Widget>[
            Expanded(
              child: SizedBox(
                height: 44,
                child: TextField(
                  controller: _regionController,
                  textInputAction: TextInputAction.search,
                  onSubmitted: controller.setRegion,
                  style: OriginTextStyles.body,
                  decoration: InputDecoration(
                    isDense: true,
                    filled: true,
                    fillColor: OriginColors.offWhite,
                    hintText: strings.filterRegionHint,
                    prefixIcon: const Icon(Icons.place_outlined, size: 18),
                    suffixIcon: _regionController.text.isEmpty
                        ? null
                        : IconButton(
                            icon: const Icon(Icons.clear, size: 18),
                            onPressed: () {
                              _regionController.clear();
                              controller.setRegion(null);
                            },
                          ),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide:
                          const BorderSide(color: OriginColors.border),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide:
                          const BorderSide(color: OriginColors.border),
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(width: OriginSpacing.sm),
            _VerifiedToggle(
              label: strings.verifiedOnly,
              value: state.verifiedOnly,
              onChanged: controller.setVerifiedOnly,
            ),
          ],
        ),
        const SizedBox(height: OriginSpacing.sm),
        SizedBox(
          height: 36,
          child: ListView(
            scrollDirection: Axis.horizontal,
            children: <Widget>[
              _FilterChip(
                label: strings.filterAllCategories,
                selected: state.category == null,
                onTap: () => controller.setCategory(null),
              ),
              for (final category in TourismCategory.all) ...<Widget>[
                const SizedBox(width: 8),
                _FilterChip(
                  label: strings.categoryLabel(category),
                  selected: state.category == category,
                  onTap: () => controller.setCategory(category),
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }

  List<Widget> _content(
    TourismStrings strings,
    TourismListState state,
    TourismListController controller,
  ) {
    if (state.items.isEmpty && state.isInitialLoading) {
      return const <Widget>[
        SliverToBoxAdapter(
          child: Padding(
            padding: EdgeInsets.only(top: OriginSpacing.xxl),
            child: LoadingView(),
          ),
        ),
      ];
    }

    if (state.items.isEmpty && state.error != null) {
      return <Widget>[
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.only(top: OriginSpacing.xl),
            child: ErrorView(
              title: strings.errorTitle,
              message: strings.errorSubtitle,
              onRetry: controller.refresh,
            ),
          ),
        ),
      ];
    }

    if (state.items.isEmpty) {
      return <Widget>[
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.only(top: OriginSpacing.xl),
            child: EmptyStateView(
              icon: Icons.travel_explore_outlined,
              title: strings.empty,
              subtitle: strings.emptyHint,
            ),
          ),
        ),
      ];
    }

    return <Widget>[
      SliverPadding(
        padding: const EdgeInsets.symmetric(horizontal: OriginSpacing.md),
        sliver: SliverList(
          delegate: SliverChildBuilderDelegate(
            (context, index) {
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
              return Padding(
                padding: const EdgeInsets.only(bottom: OriginSpacing.md),
                child: PlaceCard(place: state.items[index]),
              );
            },
            childCount: state.items.length + (state.isLoadingMore ? 1 : 0),
          ),
        ),
      ),
    ];
  }
}

class _VerifiedToggle extends StatelessWidget {
  const _VerifiedToggle({
    required this.label,
    required this.value,
    required this.onChanged,
  });

  final String label;
  final bool value;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: value ? OriginColors.forestGreen50 : OriginColors.offWhite,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () => onChanged(!value),
        child: Container(
          height: 44,
          padding: const EdgeInsets.symmetric(horizontal: 12),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: value ? OriginColors.forestGreen : OriginColors.border,
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              Icon(
                value ? Icons.verified : Icons.verified_outlined,
                size: 16,
                color: value
                    ? OriginColors.forestGreen
                    : OriginColors.textMuted,
              ),
              const SizedBox(width: 6),
              Text(
                label,
                style: OriginTextStyles.caption.copyWith(
                  fontWeight: FontWeight.w600,
                  color: value
                      ? OriginColors.forestGreen
                      : OriginColors.textSecondary,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  const _FilterChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: selected ? OriginColors.forestGreen : OriginColors.offWhite,
      borderRadius: BorderRadius.circular(999),
      child: InkWell(
        borderRadius: BorderRadius.circular(999),
        onTap: onTap,
        child: Container(
          alignment: Alignment.center,
          padding: const EdgeInsets.symmetric(horizontal: 14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(999),
            border: Border.all(
              color: selected ? OriginColors.forestGreen : OriginColors.border,
            ),
          ),
          child: Text(
            label,
            style: OriginTextStyles.caption.copyWith(
              fontWeight: FontWeight.w600,
              color: selected
                  ? OriginColors.offWhite
                  : OriginColors.textSecondary,
            ),
          ),
        ),
      ),
    );
  }
}
