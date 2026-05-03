import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:origin_mobile/core/routing/route_paths.dart';
import 'package:origin_mobile/core/theme/origin_colors.dart';
import 'package:origin_mobile/core/theme/origin_spacing.dart';
import 'package:origin_mobile/core/theme/origin_text_styles.dart';
import 'package:origin_mobile/features/auth/presentation/providers/onboarding_progress_provider.dart';
import 'package:origin_mobile/shared/widgets/adinkra_rosette.dart';
import 'package:origin_mobile/shared/widgets/kente_bar.dart';
import 'package:origin_mobile/shared/widgets/origin_button.dart';
import 'package:origin_mobile/shared/widgets/origin_mark.dart';
import 'package:origin_mobile/shared/widgets/origin_scaffold.dart';

/// Final onboarding step — celebrates the completion and lands on home.
class AuthDoneScreen extends ConsumerWidget {
  const AuthDoneScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return OriginScaffold(
      backgroundColor: OriginColors.sand,
      body: Stack(
        children: <Widget>[
          const Positioned(
            top: -40,
            right: -40,
            child: AdinkraRosette(
              size: 220,
              color: OriginColors.ochre,
              opacity: 0.10,
            ),
          ),
          const Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: KenteBar(),
          ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: OriginSpacing.lg,
                vertical: OriginSpacing.lg,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: <Widget>[
                  const Spacer(),
                  const Center(child: OriginMark(size: 96)),
                  const SizedBox(height: OriginSpacing.lg),
                  Center(
                    child: Text(
                      'Bienvenue dans la famille !',
                      textAlign: TextAlign.center,
                      style: OriginTextStyles.hero.copyWith(
                        fontSize: 28,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                  const SizedBox(height: OriginSpacing.md),
                  Center(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: OriginSpacing.md,
                      ),
                      child: Text(
                        'Ta graine est plantée. Tu peux maintenant explorer ton arbre, '
                        'ajouter d\'autres proches et inviter ta famille.',
                        textAlign: TextAlign.center,
                        style: OriginTextStyles.bodyLarge.copyWith(
                          color: OriginColors.textSecondary,
                        ),
                      ),
                    ),
                  ),
                  const Spacer(flex: 2),
                  OriginButton.primary(
                    label: 'Voir ma famille',
                    onPressed: () async {
                      await ref
                          .read(onboardingProgressProvider.notifier)
                          .clear();
                      if (!context.mounted) return;
                      context.go(RoutePaths.homeTree);
                    },
                  ),
                  const SizedBox(height: OriginSpacing.sm),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
