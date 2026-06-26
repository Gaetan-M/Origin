import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:origin_mobile/core/theme/origin_colors.dart';
import 'package:origin_mobile/core/theme/origin_radius.dart';
import 'package:origin_mobile/core/theme/origin_spacing.dart';
import 'package:origin_mobile/core/theme/origin_text_styles.dart';
import 'package:origin_mobile/data/models/enums.dart';
import 'package:origin_mobile/data/models/person.dart';
import 'package:origin_mobile/features/memory/presentation/i18n/memory_strings.dart';
import 'package:origin_mobile/features/memory/presentation/providers/albums_providers.dart';
import 'package:origin_mobile/features/memory/presentation/providers/memorial_providers.dart';
import 'package:origin_mobile/features/memory/presentation/widgets/add_tribute_sheet.dart';
import 'package:origin_mobile/features/memory/presentation/widgets/tribute_card.dart';
import 'package:origin_mobile/shared/widgets/empty_state_view.dart';
import 'package:origin_mobile/shared/widgets/error_view.dart';
import 'package:origin_mobile/shared/widgets/loading_view.dart';
import 'package:origin_mobile/shared/widgets/origin_bottom_sheet.dart';
import 'package:origin_mobile/shared/widgets/origin_scaffold.dart';

/// Memorial space for a deceased person — a sober header, a candle/tribute
/// summary, and a wall of tributes. Reserved for [LifeStatus.deceased].
class MemorialScreen extends ConsumerWidget {
  const MemorialScreen({super.key, required this.personId});

  final String personId;

  Future<void> _confirmDelete(
    BuildContext context,
    WidgetRef ref,
    MemoryStrings strings,
    String tributeId,
  ) async {
    await OriginBottomSheet.show<void>(
      context: context,
      title: strings.deleteTributeConfirm,
      actions: <OriginBottomSheetAction>[
        OriginBottomSheetAction(
          label: strings.delete,
          icon: Icons.delete_outline,
          destructive: true,
          onTap: () => ref
              .read(memorialControllerProvider)
              .deleteTribute(personId, tributeId),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final strings = MemoryStrings.of(context);
    final personAsync = ref.watch(memorialPersonProvider(personId));

    return OriginScaffold(
      backgroundColor: const Color(0xFFF3EFE8),
      appBar: AppBar(
        backgroundColor: const Color(0xFFF3EFE8),
        elevation: 0,
        title: Text(
          personAsync.valueOrNull?.displayName ?? '',
          style: OriginTextStyles.sectionTitle
              .copyWith(fontWeight: FontWeight.w700),
        ),
      ),
      body: SafeArea(
        child: personAsync.when(
          loading: () => const LoadingView(),
          error: (_, __) => ErrorView(
            title: strings.errorTitle,
            message: strings.errorSubtitle,
            onRetry: () => ref.invalidate(memorialPersonProvider(personId)),
          ),
          data: (person) {
            if (person.lifeStatus != LifeStatus.deceased) {
              return EmptyStateView(
                icon: Icons.favorite_border,
                title: strings.notDeceased,
              );
            }
            return _MemorialBody(
              personId: personId,
              person: person,
              strings: strings,
              onDeleteTribute: (id) =>
                  _confirmDelete(context, ref, strings, id),
            );
          },
        ),
      ),
    );
  }
}

class _MemorialBody extends ConsumerWidget {
  const _MemorialBody({
    required this.personId,
    required this.person,
    required this.strings,
    required this.onDeleteTribute,
  });

  final String personId;
  final Person person;
  final MemoryStrings strings;
  final ValueChanged<String> onDeleteTribute;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tributesAsync = ref.watch(memorialTributesProvider(personId));
    final summary = ref.watch(memorialSummaryProvider(personId)).valueOrNull;
    final myAccountId = ref.watch(currentAccountIdProvider);

    return RefreshIndicator(
      color: OriginColors.deepBlue,
      onRefresh: () async {
        ref.invalidate(memorialTributesProvider(personId));
        ref.invalidate(memorialSummaryProvider(personId));
        await ref.read(memorialTributesProvider(personId).future);
      },
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(
          OriginSpacing.md,
          OriginSpacing.md,
          OriginSpacing.md,
          OriginSpacing.xxl,
        ),
        children: <Widget>[
          _MemorialHeader(
            name: person.displayName,
            strings: strings,
            candleCount: summary?.candleCount ?? 0,
            tributeCount: summary?.tributeCount ?? 0,
          ),
          const SizedBox(height: OriginSpacing.lg),
          SizedBox(
            width: double.infinity,
            child: _AddTributeButton(
              label: strings.addTribute,
              onPressed: () => AddTributeSheet.show(context, personId),
            ),
          ),
          const SizedBox(height: OriginSpacing.lg),
          Text(
            strings.wallTitle,
            style: OriginTextStyles.sectionTitle
                .copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: OriginSpacing.md),
          tributesAsync.when(
            loading: () => const Padding(
              padding: EdgeInsets.all(OriginSpacing.xl),
              child: Center(child: CircularProgressIndicator(strokeWidth: 2.4)),
            ),
            error: (_, __) => Padding(
              padding: const EdgeInsets.all(OriginSpacing.lg),
              child: Text(strings.wallEmpty, style: OriginTextStyles.body),
            ),
            data: (tributes) {
              if (tributes.isEmpty) {
                return Padding(
                  padding: const EdgeInsets.symmetric(
                      vertical: OriginSpacing.lg),
                  child: Text(
                    strings.wallEmpty,
                    textAlign: TextAlign.center,
                    style: OriginTextStyles.body
                        .copyWith(color: OriginColors.textSecondary),
                  ),
                );
              }
              return Column(
                children: <Widget>[
                  for (final tribute in tributes) ...<Widget>[
                    TributeCard(
                      tribute: tribute,
                      canDelete: myAccountId != null &&
                          myAccountId == tribute.authorAccountId,
                      onDelete: () => onDeleteTribute(tribute.id),
                    ),
                    const SizedBox(height: OriginSpacing.md),
                  ],
                ],
              );
            },
          ),
        ],
      ),
    );
  }
}

class _MemorialHeader extends StatelessWidget {
  const _MemorialHeader({
    required this.name,
    required this.strings,
    required this.candleCount,
    required this.tributeCount,
  });

  final String name;
  final MemoryStrings strings;
  final int candleCount;
  final int tributeCount;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(
        horizontal: OriginSpacing.lg,
        vertical: OriginSpacing.xl,
      ),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: <Color>[Color(0xFFF3EFE8), Color(0xFFFAF7F2)],
        ),
        borderRadius: BorderRadius.circular(OriginRadius.xl),
        border: Border.all(color: OriginColors.sandDark),
      ),
      child: Column(
        children: <Widget>[
          const Icon(Icons.local_fire_department_outlined,
              color: OriginColors.ochreDark, size: 30),
          const SizedBox(height: OriginSpacing.sm),
          Text(
            strings.memorialTitle(name),
            textAlign: TextAlign.center,
            style: OriginTextStyles.screenTitle,
          ),
          const SizedBox(height: OriginSpacing.xs),
          Text(
            strings.memorialSubtitle,
            textAlign: TextAlign.center,
            style: OriginTextStyles.caption,
          ),
          const SizedBox(height: OriginSpacing.md),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: <Widget>[
              const Icon(Icons.local_fire_department,
                  size: 16, color: OriginColors.ochre),
              const SizedBox(width: 4),
              Text(strings.candleCount(candleCount),
                  style: OriginTextStyles.caption),
              const SizedBox(width: OriginSpacing.lg),
              Text(strings.tributeCount(tributeCount),
                  style: OriginTextStyles.caption),
            ],
          ),
        ],
      ),
    );
  }
}

class _AddTributeButton extends StatelessWidget {
  const _AddTributeButton({required this.label, required this.onPressed});

  final String label;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: OriginColors.ochre,
      borderRadius: BorderRadius.circular(OriginRadius.md),
      child: InkWell(
        borderRadius: BorderRadius.circular(OriginRadius.md),
        onTap: onPressed,
        child: Container(
          height: 52,
          alignment: Alignment.center,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              const Icon(Icons.local_fire_department_outlined,
                  color: OriginColors.charcoal, size: 20),
              const SizedBox(width: OriginSpacing.sm),
              Text(
                label,
                style: OriginTextStyles.button
                    .copyWith(color: OriginColors.charcoal),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
