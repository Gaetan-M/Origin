import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'package:origin_mobile/core/routing/route_paths.dart';
import 'package:origin_mobile/core/theme/origin_colors.dart';
import 'package:origin_mobile/core/theme/origin_spacing.dart';
import 'package:origin_mobile/shared/widgets/origin_button.dart';
import 'package:origin_mobile/shared/widgets/origin_scaffold.dart';

/// Second onboarding screen — communicates value before asking for the phone
/// number. Three short benefits with icons.
class OnboardingValuePropScreen extends StatelessWidget {
  const OnboardingValuePropScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return OriginScaffold(
      backgroundColor: OriginColors.sand,
      appBar: AppBar(
        backgroundColor: OriginColors.sand,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: OriginColors.charcoal),
          onPressed: () => context.pop(),
        ),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(
            OriginSpacing.lg,
            OriginSpacing.md,
            OriginSpacing.lg,
            OriginSpacing.lg,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: <Widget>[
              const SizedBox(height: OriginSpacing.lg),
              const Text(
                "Retrouve et sauvegarde\nl'histoire de ta famille.",
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 26,
                  fontWeight: FontWeight.w700,
                  color: OriginColors.charcoal,
                  height: 1.3,
                ),
              ),
              const SizedBox(height: OriginSpacing.xxl),
              const _ValueRow(
                icon: Icons.favorite_outline,
                color: OriginColors.terracotta,
                title: 'Gratuit et simple',
                subtitle: "Pas de frais cachés. Quelques minutes suffisent.",
              ),
              const SizedBox(height: OriginSpacing.lg),
              const _ValueRow(
                icon: Icons.lock_outline,
                color: OriginColors.deepBlue,
                title: 'Ton histoire reste privée',
                subtitle: 'Tu choisis qui voit quoi. Toujours.',
              ),
              const SizedBox(height: OriginSpacing.lg),
              const _ValueRow(
                icon: Icons.public_outlined,
                color: OriginColors.forestGreen,
                title: 'Ta famille avec toi partout',
                subtitle: "Hors ligne aussi, l'arbre reste accessible.",
              ),
              const Spacer(),
              OriginButton.primary(
                label: "C'est parti",
                onPressed: () => context.push(RoutePaths.authPhone),
              ),
              const SizedBox(height: OriginSpacing.sm),
            ],
          ),
        ),
      ),
    );
  }
}

class _ValueRow extends StatelessWidget {
  const _ValueRow({
    required this.icon,
    required this.color,
    required this.title,
    required this.subtitle,
  });

  final IconData icon;
  final Color color;
  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Container(
          width: 48,
          height: 48,
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.12),
            shape: BoxShape.circle,
          ),
          child: Icon(icon, color: color, size: 24),
        ),
        const SizedBox(width: OriginSpacing.md),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Text(
                title,
                style: const TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w600,
                  color: OriginColors.charcoal,
                ),
              ),
              const SizedBox(height: OriginSpacing.xs),
              Text(
                subtitle,
                style: const TextStyle(
                  fontSize: 14,
                  color: OriginColors.textSecondary,
                  height: 1.4,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
