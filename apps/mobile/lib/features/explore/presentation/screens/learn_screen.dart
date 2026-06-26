import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:origin_mobile/core/theme/origin_colors.dart';
import 'package:origin_mobile/core/theme/origin_spacing.dart';
import 'package:origin_mobile/core/theme/origin_text_styles.dart';
import 'package:origin_mobile/features/explore/domain/learning_enums.dart';
import 'package:origin_mobile/features/explore/presentation/i18n/learning_strings.dart';
import 'package:origin_mobile/features/explore/presentation/providers/learning_providers.dart';
import 'package:origin_mobile/features/explore/presentation/widgets/lesson_card.dart';
import 'package:origin_mobile/shared/widgets/empty_state_view.dart';
import 'package:origin_mobile/shared/widgets/error_view.dart';
import 'package:origin_mobile/shared/widgets/loading_view.dart';
import 'package:origin_mobile/shared/widgets/origin_scaffold.dart';

/// PUBLIC learning surface — list of approved mini-lessons. Online-first.
class LearnScreen extends ConsumerStatefulWidget {
  const LearnScreen({super.key});

  @override
  ConsumerState<LearnScreen> createState() => _LearnScreenState();
}

class _LearnScreenState extends ConsumerState<LearnScreen> {
  final ScrollController _scrollController = ScrollController();
  final TextEditingController _languageController = TextEditingController();

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
    _languageController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (!_scrollController.hasClients) return;
    final position = _scrollController.position;
    if (position.pixels >= position.maxScrollExtent - 400) {
      ref.read(lessonsListControllerProvider.notifier).loadMore();
    }
  }

  @override
  Widget build(BuildContext context) {
    final strings = LearningStrings.of(context);
    final state = ref.watch(lessonsListControllerProvider);
    final controller = ref.read(lessonsListControllerProvider.notifier);

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
      body: SafeArea(
        child: RefreshIndicator(
          color: OriginColors.deepBlue,
          onRefresh: controller.refresh,
          child: _buildBody(strings, state, controller),
        ),
      ),
    );
  }

  Widget _buildBody(
    LearningStrings strings,
    LessonsListState state,
    LessonsListController controller,
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
          child: SizedBox(height: OriginSpacing.xl),
        ),
      ],
    );
  }

  Widget _filters(
    LearningStrings strings,
    LessonsListState state,
    LessonsListController controller,
  ) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        SizedBox(
          height: 44,
          child: TextField(
            controller: _languageController,
            textInputAction: TextInputAction.search,
            onSubmitted: controller.setLanguageCode,
            style: OriginTextStyles.body,
            decoration: InputDecoration(
              isDense: true,
              filled: true,
              fillColor: OriginColors.offWhite,
              hintText: strings.filterLanguageHint,
              prefixIcon: const Icon(Icons.translate_outlined, size: 18),
              suffixIcon: _languageController.text.isEmpty
                  ? null
                  : IconButton(
                      icon: const Icon(Icons.clear, size: 18),
                      onPressed: () {
                        _languageController.clear();
                        controller.setLanguageCode(null);
                      },
                    ),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: OriginColors.border),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: OriginColors.border),
              ),
            ),
          ),
        ),
        const SizedBox(height: OriginSpacing.sm),
        SizedBox(
          height: 36,
          child: ListView(
            scrollDirection: Axis.horizontal,
            children: <Widget>[
              _FilterChip(
                label: strings.filterAllLevels,
                selected: state.level == null,
                onTap: () => controller.setLevel(null),
              ),
              for (final level in LearningLevel.all) ...<Widget>[
                const SizedBox(width: 8),
                _FilterChip(
                  label: strings.levelLabel(level),
                  selected: state.level == level,
                  onTap: () => controller.setLevel(level),
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }

  List<Widget> _content(
    LearningStrings strings,
    LessonsListState state,
    LessonsListController controller,
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
              icon: Icons.school_outlined,
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
              final lesson = state.items[index];
              return Padding(
                padding: const EdgeInsets.only(bottom: OriginSpacing.md),
                child: LessonCard(
                  lesson: lesson,
                  onTap: () => context.push('/learn/${lesson.id}'),
                ),
              );
            },
            childCount: state.items.length + (state.isLoadingMore ? 1 : 0),
          ),
        ),
      ),
    ];
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
