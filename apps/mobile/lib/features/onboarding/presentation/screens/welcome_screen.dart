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

/// Onboarding welcome — the "Plante ta graine" hero.
class OnboardingWelcomeScreen extends ConsumerStatefulWidget {
  const OnboardingWelcomeScreen({super.key});

  @override
  ConsumerState<OnboardingWelcomeScreen> createState() =>
      _OnboardingWelcomeScreenState();
}

class _OnboardingWelcomeScreenState
    extends ConsumerState<OnboardingWelcomeScreen>
    with SingleTickerProviderStateMixin {
  late final AnimationController _floatController;

  @override
  void initState() {
    super.initState();
    _floatController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 4200),
    )..repeat(reverse: true);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(onboardingProgressProvider.notifier).hydrate();
    });
  }

  @override
  void dispose() {
    _floatController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return OriginScaffold(
      backgroundColor: OriginColors.sand,
      body: DecoratedBox(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: <Color>[
              OriginColors.sand,
              Color(0xFFFAF5E8),
              OriginColors.sandDark,
            ],
            stops: <double>[0, 0.5, 1],
          ),
        ),
        child: Stack(
          children: <Widget>[
            // Filigree decor
            const Positioned(
              top: -40,
              left: -40,
              child: AdinkraRosette(
                size: 220,
                color: OriginColors.forestGreen,
                opacity: 0.05,
              ),
            ),
            const Positioned(
              bottom: -60,
              right: -50,
              child: AdinkraRosette(
                size: 260,
                color: OriginColors.terracotta,
                opacity: 0.06,
              ),
            ),
            // Kente accents
            const Positioned(
              top: 0,
              left: 0,
              right: 0,
              child: KenteBar(),
            ),
            const Positioned(
              bottom: 0,
              left: 0,
              right: 0,
              child: KenteBar(),
            ),
            SafeArea(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(
                  OriginSpacing.lg,
                  OriginSpacing.xl,
                  OriginSpacing.lg,
                  OriginSpacing.lg,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: <Widget>[
                    const Spacer(),
                    Center(
                      child: AnimatedBuilder(
                        animation: _floatController,
                        builder: (context, child) {
                          final dy = -6 * (_floatController.value - 0.5);
                          return Transform.translate(
                            offset: Offset(0, dy),
                            child: child,
                          );
                        },
                        child: const OriginMark(size: 84),
                      ),
                    ),
                    const SizedBox(height: OriginSpacing.lg),
                    Center(
                      child: Text(
                        'AKWABA · BIENVENUE',
                        style: OriginTextStyles.micro.copyWith(
                          color: OriginColors.terracotta,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 1.4,
                        ),
                      ),
                    ),
                    const SizedBox(height: OriginSpacing.sm),
                    Center(
                      child: Text(
                        'Plante ta graine.',
                        textAlign: TextAlign.center,
                        style: OriginTextStyles.hero.copyWith(
                          fontSize: 34,
                          fontWeight: FontWeight.w800,
                          letterSpacing: -0.5,
                        ),
                      ),
                    ),
                    const SizedBox(height: OriginSpacing.md),
                    Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: OriginSpacing.md,
                      ),
                      child: Text(
                        'Donne-nous quelques racines pour commencer. '
                        'Tu pourras tout enrichir plus tard.',
                        textAlign: TextAlign.center,
                        style: OriginTextStyles.bodyLarge.copyWith(
                          color: OriginColors.textSecondary,
                          height: 1.5,
                        ),
                      ),
                    ),
                    const Spacer(flex: 2),
                    OriginButton.primary(
                      label: 'Commencer',
                      onPressed: () =>
                          context.push(RoutePaths.onboardingValueProp),
                    ),
                    const SizedBox(height: OriginSpacing.sm),
                    Center(
                      child: TextButton(
                        onPressed: () => context.push(RoutePaths.authPhone),
                        child: const Text(
                          'Déjà un compte ? Se connecter',
                          style: TextStyle(
                            color: OriginColors.deepBlue,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: OriginSpacing.xs),
                    Center(
                      child: Text(
                        'Tes proches ne verront que ce que tu choisis de partager.',
                        textAlign: TextAlign.center,
                        style: OriginTextStyles.micro.copyWith(
                          color: OriginColors.textMuted,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
