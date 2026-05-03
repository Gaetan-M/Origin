import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:origin_mobile/core/routing/route_paths.dart';
import 'package:origin_mobile/core/theme/origin_colors.dart';
import 'package:origin_mobile/core/theme/origin_radius.dart';
import 'package:origin_mobile/core/theme/origin_spacing.dart';
import 'package:origin_mobile/core/theme/origin_text_styles.dart';
import 'package:origin_mobile/features/auth/presentation/providers/auth_state_provider.dart';
import 'package:origin_mobile/shared/widgets/origin_mark.dart';
import 'package:origin_mobile/shared/widgets/origin_scaffold.dart';
import 'package:origin_mobile/shared/widgets/person_avatar.dart';

class SettingsHomeScreen extends ConsumerWidget {
  const SettingsHomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final account = ref.watch(authStateProvider).valueOrNull?.currentAccount;

    return OriginScaffold(
      backgroundColor: OriginColors.sand,
      body: SafeArea(
        bottom: false,
        child: ListView(
          padding: const EdgeInsets.all(OriginSpacing.lg),
          children: <Widget>[
            Row(
              children: <Widget>[
                PersonAvatar(
                  size: 64,
                  displayName: account?.fullName,
                ),
                const SizedBox(width: OriginSpacing.md),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      Text(
                        account?.fullName ?? 'Mon profil',
                        style: OriginTextStyles.sectionTitle.copyWith(
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      Text(
                        account?.phoneNumber ?? '',
                        style: OriginTextStyles.caption,
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: OriginSpacing.lg),
            _Tile(
              icon: Icons.account_circle_outlined,
              label: 'Mon compte',
              onTap: () => context.push(RoutePaths.settingsAccount),
            ),
            _Tile(
              icon: Icons.lock_outline,
              label: 'Sécurité',
              onTap: () => context.push(RoutePaths.settingsSecurity),
            ),
            _Tile(
              icon: Icons.accessibility_new_outlined,
              label: 'Accessibilité',
              onTap: () => context.push(RoutePaths.settingsAccessibility),
            ),
            _Tile(
              icon: Icons.translate,
              label: 'Langue',
              onTap: () => context.push(RoutePaths.settingsLanguage),
            ),
            _Tile(
              icon: Icons.info_outline,
              label: 'À propos',
              onTap: () {},
            ),
            const SizedBox(height: OriginSpacing.xl),
            Container(
              padding: const EdgeInsets.all(OriginSpacing.md),
              decoration: BoxDecoration(
                color: OriginColors.offWhite,
                borderRadius: BorderRadius.circular(OriginRadius.lg),
                border: Border.all(color: OriginColors.border),
              ),
              child: Column(
                children: <Widget>[
                  const OriginMark(size: 56),
                  const SizedBox(height: OriginSpacing.sm),
                  Text(
                    'Origin · v0.1.0',
                    style: OriginTextStyles.caption,
                  ),
                ],
              ),
            ),
            const SizedBox(height: OriginSpacing.lg),
            TextButton(
              onPressed: () =>
                  ref.read(authStateProvider.notifier).logout(),
              child: const Text(
                'Se déconnecter',
                style: TextStyle(color: OriginColors.error),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Tile extends StatelessWidget {
  const _Tile({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Material(
        color: OriginColors.offWhite,
        borderRadius: BorderRadius.circular(OriginRadius.md),
        child: InkWell(
          borderRadius: BorderRadius.circular(OriginRadius.md),
          onTap: onTap,
          child: ListTile(
            leading: Icon(icon, color: OriginColors.charcoal),
            title: Text(
              label,
              style: OriginTextStyles.bodyMedium.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
            trailing: const Icon(
              Icons.chevron_right,
              color: OriginColors.textMuted,
            ),
          ),
        ),
      ),
    );
  }
}
