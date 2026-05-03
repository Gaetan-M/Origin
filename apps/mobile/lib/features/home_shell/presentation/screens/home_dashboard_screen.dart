import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:origin_mobile/core/routing/route_paths.dart';
import 'package:origin_mobile/core/theme/origin_colors.dart';
import 'package:origin_mobile/core/theme/origin_radius.dart';
import 'package:origin_mobile/core/theme/origin_spacing.dart';
import 'package:origin_mobile/core/theme/origin_text_styles.dart';
import 'package:origin_mobile/features/auth/presentation/providers/auth_state_provider.dart';
import 'package:origin_mobile/shared/widgets/adinkra_rosette.dart';
import 'package:origin_mobile/shared/widgets/kente_bar.dart';
import 'package:origin_mobile/shared/widgets/origin_mark.dart';
import 'package:origin_mobile/shared/widgets/person_avatar.dart';
import 'package:origin_mobile/shared/widgets/section_header.dart';

/// Living Tree dashboard — the home tab.
class HomeDashboardScreen extends ConsumerWidget {
  const HomeDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final account = ref
        .watch(authStateProvider)
        .valueOrNull
        ?.currentAccount;
    final firstName = (account?.fullName ?? '').split(' ').first;

    return Scaffold(
      backgroundColor: OriginColors.sand,
      body: SafeArea(
        bottom: false,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(
            OriginSpacing.lg,
            OriginSpacing.md,
            OriginSpacing.lg,
            OriginSpacing.xxxl,
          ),
          children: <Widget>[
            // Top header
            Row(
              children: <Widget>[
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      Text(
                        'AKWABA · BIENVENUE',
                        style: OriginTextStyles.micro.copyWith(
                          color: OriginColors.terracotta,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 1.2,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        firstName.isEmpty
                            ? 'Salut.'
                            : 'Salut $firstName.',
                        style: OriginTextStyles.hero.copyWith(
                          fontSize: 26,
                          fontWeight: FontWeight.w800,
                          letterSpacing: -0.5,
                        ),
                      ),
                    ],
                  ),
                ),
                Stack(
                  clipBehavior: Clip.none,
                  children: <Widget>[
                    IconButton(
                      onPressed: () =>
                          context.push(RoutePaths.homeNotifications),
                      icon: const Icon(Icons.notifications_none),
                      style: IconButton.styleFrom(
                        backgroundColor: OriginColors.offWhite,
                        shape: const CircleBorder(),
                      ),
                    ),
                    Positioned(
                      right: 8,
                      top: 8,
                      child: Container(
                        width: 8,
                        height: 8,
                        decoration: const BoxDecoration(
                          color: OriginColors.terracotta,
                          shape: BoxShape.circle,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(width: 4),
                PersonAvatar(
                  size: 42,
                  displayName: account?.fullName,
                ),
              ],
            ),
            const SizedBox(height: OriginSpacing.lg),
            // Living Tree card
            _LivingTreeCard(familyName: account?.fullName ?? 'Ta famille'),
            const SizedBox(height: OriginSpacing.lg),
            // Suggested gesture
            const _SuggestedGestureCard(),
            const SizedBox(height: OriginSpacing.lg),
            // Recent activity
            SectionHeader(
              title: 'Récemment',
              trailingLabel: 'Tout voir',
              onTrailingTap: () => context.push(RoutePaths.homeTree),
            ),
            const SizedBox(height: OriginSpacing.sm),
            const _RecentList(),
            const SizedBox(height: OriginSpacing.lg),
            // Match callout
            const _MatchCallout(),
          ],
        ),
      ),
    );
  }
}

class _LivingTreeCard extends StatelessWidget {
  const _LivingTreeCard({required this.familyName});

  final String familyName;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(20),
      child: Container(
        decoration: BoxDecoration(
          color: OriginColors.offWhite,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: OriginColors.border),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            const KenteBar(height: 4),
            Padding(
              padding: const EdgeInsets.all(OriginSpacing.lg),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Row(
                    children: <Widget>[
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: <Widget>[
                            Text(
                              'TON ARBRE',
                              style: OriginTextStyles.micro.copyWith(
                                color: OriginColors.terracotta,
                                fontWeight: FontWeight.w700,
                                letterSpacing: 1.2,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              familyName,
                              style: OriginTextStyles.sectionTitle.copyWith(
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const OriginMark(size: 28),
                    ],
                  ),
                  const SizedBox(height: OriginSpacing.md),
                  Row(
                    children: const <Widget>[
                      _Stat(value: '12', label: 'personnes'),
                      _Stat(value: '4', label: 'générations'),
                      _Stat(value: '23', label: 'liens'),
                    ],
                  ),
                  const SizedBox(height: OriginSpacing.lg),
                  const _BranchBar(
                    label: 'Branche paternelle',
                    color: OriginColors.forestGreen,
                    fullness: 0.65,
                  ),
                  const SizedBox(height: 10),
                  const _BranchBar(
                    label: 'Branche maternelle',
                    color: OriginColors.terracotta,
                    fullness: 0.40,
                  ),
                  const SizedBox(height: 10),
                  const _BranchBar(
                    label: 'Tes enfants',
                    color: OriginColors.ochreDark,
                    fullness: 0.20,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat({required this.value, required this.label});

  final String value;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 4),
        padding: const EdgeInsets.symmetric(
          vertical: OriginSpacing.md,
          horizontal: 8,
        ),
        decoration: BoxDecoration(
          color: OriginColors.sand,
          borderRadius: BorderRadius.circular(OriginRadius.md),
        ),
        child: Column(
          children: <Widget>[
            Text(
              value,
              style: const TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.w800,
                color: OriginColors.charcoal,
                fontFeatures: <FontFeature>[FontFeature.tabularFigures()],
              ),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: OriginTextStyles.micro.copyWith(
                color: OriginColors.textSecondary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _BranchBar extends StatelessWidget {
  const _BranchBar({
    required this.label,
    required this.color,
    required this.fullness,
  });

  final String label;
  final Color color;
  final double fullness;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: <Widget>[
        Expanded(
          flex: 4,
          child: Text(
            label,
            style: OriginTextStyles.caption.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
        Expanded(
          flex: 5,
          child: ClipRRect(
            borderRadius: BorderRadius.circular(999),
            child: LinearProgressIndicator(
              value: fullness,
              minHeight: 8,
              backgroundColor: OriginColors.sand,
              valueColor: AlwaysStoppedAnimation<Color>(color),
            ),
          ),
        ),
        const SizedBox(width: 8),
        SizedBox(
          width: 40,
          child: Text(
            '${(fullness * 100).round()}%',
            textAlign: TextAlign.right,
            style: OriginTextStyles.micro.copyWith(
              color: color,
              fontWeight: FontWeight.w700,
              fontFeatures: const <FontFeature>[
                FontFeature.tabularFigures(),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _SuggestedGestureCard extends StatelessWidget {
  const _SuggestedGestureCard();

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: <Widget>[
        Container(
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: <Color>[
                OriginColors.deepBlue,
                OriginColors.forestDark,
              ],
            ),
            borderRadius: BorderRadius.circular(18),
          ),
          padding: const EdgeInsets.all(OriginSpacing.lg),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Row(
                children: <Widget>[
                  Icon(
                    Icons.auto_awesome,
                    size: 14,
                    color: Colors.white.withValues(alpha: 0.85),
                  ),
                  const SizedBox(width: 6),
                  Text(
                    'GESTE SUGGÉRÉ',
                    style: OriginTextStyles.micro.copyWith(
                      color: Colors.white.withValues(alpha: 0.85),
                      fontWeight: FontWeight.w700,
                      letterSpacing: 1.2,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: OriginSpacing.sm),
              const Text(
                'Ajoute le nom de ta grand-mère paternelle.',
                style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                  color: Colors.white,
                  height: 1.3,
                ),
              ),
              const SizedBox(height: OriginSpacing.sm),
              Text(
                'Compléter une branche racine donne plus de sens à tout l\'arbre.',
                style: TextStyle(
                  fontSize: 14,
                  height: 1.4,
                  color: Colors.white.withValues(alpha: 0.85),
                ),
              ),
              const SizedBox(height: OriginSpacing.md),
              Row(
                children: <Widget>[
                  ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.white,
                      foregroundColor: OriginColors.deepBlue,
                      padding: const EdgeInsets.symmetric(
                        horizontal: 18,
                        vertical: 12,
                      ),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(999),
                      ),
                      elevation: 0,
                    ),
                    onPressed: () {},
                    child: const Text('Je l\'ajoute'),
                  ),
                  const SizedBox(width: 8),
                  TextButton(
                    onPressed: () {},
                    child: Text(
                      'Plus tard',
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.85),
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        const Positioned(
          right: -20,
          bottom: -20,
          child: AdinkraRosette(
            size: 180,
            color: Colors.white,
            opacity: 0.10,
          ),
        ),
      ],
    );
  }
}

class _RecentList extends StatelessWidget {
  const _RecentList();

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: OriginColors.offWhite,
        borderRadius: BorderRadius.circular(OriginRadius.lg),
        border: Border.all(color: OriginColors.border),
      ),
      child: const Column(
        children: <Widget>[
          _RecentRow(
            name: 'Aïssatou Mballa',
            subtitle: 'Tante · ajoutée hier',
            icon: Icons.person_add_alt_1,
          ),
          Divider(height: 1, color: OriginColors.border),
          _RecentRow(
            name: 'Pa Étienne',
            subtitle: 'Grand-père · vérifié',
            icon: Icons.verified_outlined,
          ),
          Divider(height: 1, color: OriginColors.border),
          _RecentRow(
            name: 'Bafia',
            subtitle: 'Village ajouté à 3 fiches',
            icon: Icons.place_outlined,
          ),
        ],
      ),
    );
  }
}

class _RecentRow extends StatelessWidget {
  const _RecentRow({
    required this.name,
    required this.subtitle,
    required this.icon,
  });

  final String name;
  final String subtitle;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      contentPadding: const EdgeInsets.symmetric(
        horizontal: OriginSpacing.md,
        vertical: 4,
      ),
      leading: PersonAvatar(displayName: name),
      title: Text(
        name,
        style: OriginTextStyles.bodyMedium.copyWith(
          fontWeight: FontWeight.w600,
        ),
      ),
      subtitle: Text(subtitle, style: OriginTextStyles.caption),
      trailing: Icon(icon, color: OriginColors.textMuted, size: 20),
    );
  }
}

class _MatchCallout extends StatelessWidget {
  const _MatchCallout();

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(OriginRadius.lg),
      onTap: () {},
      child: Container(
        padding: const EdgeInsets.all(OriginSpacing.md),
        decoration: BoxDecoration(
          color: OriginColors.ochre.withValues(alpha: 0.14),
          borderRadius: BorderRadius.circular(OriginRadius.lg),
          border: Border.all(
            color: OriginColors.ochreDark.withValues(alpha: 0.3),
          ),
        ),
        child: Row(
          children: <Widget>[
            Container(
              width: 38,
              height: 38,
              decoration: const BoxDecoration(
                color: OriginColors.ochreDark,
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.bolt,
                color: Colors.white,
                size: 20,
              ),
            ),
            const SizedBox(width: OriginSpacing.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text(
                    'Une cousine possible — 86%',
                    style: OriginTextStyles.bodyMedium.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'Origines à Bafia, branche maternelle.',
                    style: OriginTextStyles.caption,
                  ),
                ],
              ),
            ),
            const Icon(
              Icons.chevron_right,
              color: OriginColors.ochreDark,
            ),
          ],
        ),
      ),
    );
  }
}
