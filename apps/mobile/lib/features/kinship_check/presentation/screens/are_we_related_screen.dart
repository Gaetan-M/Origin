import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:origin_mobile/core/theme/origin_colors.dart';
import 'package:origin_mobile/core/theme/origin_radius.dart';
import 'package:origin_mobile/core/theme/origin_spacing.dart';
import 'package:origin_mobile/core/theme/origin_text_styles.dart';
import 'package:origin_mobile/features/kinship_check/domain/kinship_check.dart';
import 'package:origin_mobile/features/kinship_check/presentation/i18n/kinship_check_strings.dart';
import 'package:origin_mobile/features/kinship_check/presentation/providers/kinship_check_providers.dart';
import 'package:origin_mobile/features/kinship_check/presentation/widgets/initiate_check_form.dart';
import 'package:origin_mobile/features/kinship_check/presentation/widgets/kinship_check_row.dart';
import 'package:origin_mobile/shared/widgets/origin_button.dart';
import 'package:origin_mobile/shared/widgets/origin_scaffold.dart';

/// The privacy-preserving "Sommes-nous parents ?" (Are we related?) screen.
///
/// Consent-first by design: a check only ever computes after BOTH parties
/// agree, and the result reveals nothing but the relationship label. Mirrors
/// apps/web/src/app/(app)/are-we-related/page.tsx.
class AreWeRelatedScreen extends ConsumerWidget {
  const AreWeRelatedScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final strings = KinshipStrings.of(context);
    final overview = ref.watch(kinshipChecksControllerProvider);

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
          onRefresh: () =>
              ref.read(kinshipChecksControllerProvider.notifier).refresh(),
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(OriginSpacing.md),
            children: <Widget>[
              Text(
                strings.subtitle,
                style: OriginTextStyles.body
                    .copyWith(color: OriginColors.textSecondary),
              ),
              const SizedBox(height: OriginSpacing.md),

              _PrivacyCard(strings: strings),
              const SizedBox(height: OriginSpacing.md),

              _InitiateCard(strings: strings),
              const SizedBox(height: OriginSpacing.lg),

              _ChecksSection(strings: strings, overview: overview, ref: ref),
            ],
          ),
        ),
      ),
    );
  }
}

class _PrivacyCard extends StatelessWidget {
  const _PrivacyCard({required this.strings});

  final KinshipStrings strings;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: OriginColors.deepBlue50,
        borderRadius: BorderRadius.circular(OriginRadius.lg),
        border: Border.all(color: OriginColors.deepBlue100),
      ),
      padding: const EdgeInsets.all(OriginSpacing.md),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          const Icon(
            Icons.shield_outlined,
            color: OriginColors.deepBlue,
            size: 22,
          ),
          const SizedBox(width: OriginSpacing.sm),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(
                  strings.privacyTitle,
                  style: OriginTextStyles.bodyMedium
                      .copyWith(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 4),
                Text(
                  strings.privacyBody,
                  style: OriginTextStyles.caption
                      .copyWith(color: OriginColors.textSecondary),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _InitiateCard extends StatelessWidget {
  const _InitiateCard({required this.strings});

  final KinshipStrings strings;

  @override
  Widget build(BuildContext context) {
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
          Text(
            strings.initiateTitle,
            style: OriginTextStyles.sectionTitle.copyWith(
              fontSize: 18,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: OriginSpacing.xs),
          Text(
            strings.initiateHint,
            style: OriginTextStyles.caption
                .copyWith(color: OriginColors.textSecondary),
          ),
          const SizedBox(height: OriginSpacing.md),
          InitiateCheckForm(strings: strings),
        ],
      ),
    );
  }
}

class _ChecksSection extends StatelessWidget {
  const _ChecksSection({
    required this.strings,
    required this.overview,
    required this.ref,
  });

  final KinshipStrings strings;
  final AsyncValue<KinshipChecksOverview> overview;
  final WidgetRef ref;

  @override
  Widget build(BuildContext context) {
    return overview.when(
      loading: () => const Padding(
        padding: EdgeInsets.symmetric(vertical: OriginSpacing.xl),
        child: Center(
          child: SizedBox(
            width: 24,
            height: 24,
            child: CircularProgressIndicator(strokeWidth: 2.4),
          ),
        ),
      ),
      error: (_, __) => Container(
        width: double.infinity,
        decoration: BoxDecoration(
          color: OriginColors.offWhite,
          borderRadius: BorderRadius.circular(OriginRadius.lg),
          border: Border.all(color: OriginColors.border),
        ),
        padding: const EdgeInsets.all(OriginSpacing.lg),
        child: Column(
          children: <Widget>[
            const Icon(
              Icons.cloud_off_outlined,
              color: OriginColors.textMuted,
              size: 40,
            ),
            const SizedBox(height: OriginSpacing.sm),
            Text(
              strings.listError,
              textAlign: TextAlign.center,
              style: OriginTextStyles.body
                  .copyWith(color: OriginColors.textSecondary),
            ),
            const SizedBox(height: OriginSpacing.md),
            OriginButton.secondary(
              label: strings.retry,
              expand: false,
              onPressed: () =>
                  ref.read(kinshipChecksControllerProvider.notifier).refresh(),
            ),
          ],
        ),
      ),
      data: (data) => Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          _Section(
            icon: Icons.inbox_outlined,
            title: strings.incomingTitle,
            emptyLabel: strings.incomingEmpty,
            checks: data.incoming,
            strings: strings,
          ),
          const SizedBox(height: OriginSpacing.lg),
          _Section(
            icon: Icons.send_outlined,
            title: strings.outgoingTitle,
            emptyLabel: strings.outgoingEmpty,
            checks: data.outgoing,
            strings: strings,
          ),
        ],
      ),
    );
  }
}

class _Section extends StatelessWidget {
  const _Section({
    required this.icon,
    required this.title,
    required this.emptyLabel,
    required this.checks,
    required this.strings,
  });

  final IconData icon;
  final String title;
  final String emptyLabel;
  final List<KinshipCheckView> checks;
  final KinshipStrings strings;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        Row(
          children: <Widget>[
            Icon(icon, size: 15, color: OriginColors.textMuted),
            const SizedBox(width: 6),
            Text(
              title.toUpperCase(),
              style: OriginTextStyles.micro.copyWith(
                color: OriginColors.textMuted,
                fontWeight: FontWeight.w700,
                letterSpacing: 0.8,
              ),
            ),
          ],
        ),
        const SizedBox(height: OriginSpacing.sm),
        if (checks.isEmpty)
          Container(
            width: double.infinity,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(OriginRadius.md),
              border: Border.all(
                color: OriginColors.border,
                style: BorderStyle.solid,
              ),
            ),
            padding: const EdgeInsets.symmetric(
              horizontal: OriginSpacing.md,
              vertical: OriginSpacing.lg,
            ),
            child: Text(
              emptyLabel,
              textAlign: TextAlign.center,
              style: OriginTextStyles.caption
                  .copyWith(color: OriginColors.textMuted),
            ),
          )
        else
          for (final check in checks) ...<Widget>[
            KinshipCheckRow(check: check, strings: strings),
            if (check != checks.last)
              const SizedBox(height: OriginSpacing.sm),
          ],
      ],
    );
  }
}
