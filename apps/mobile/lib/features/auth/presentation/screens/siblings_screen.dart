import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:origin_mobile/core/routing/route_paths.dart';
import 'package:origin_mobile/core/theme/origin_colors.dart';
import 'package:origin_mobile/core/theme/origin_spacing.dart';
import 'package:origin_mobile/core/theme/origin_text_styles.dart';
import 'package:origin_mobile/features/auth/presentation/providers/onboarding_progress_provider.dart';
import 'package:origin_mobile/shared/widgets/origin_button.dart';
import 'package:origin_mobile/shared/widgets/origin_scaffold.dart';

class AuthSiblingsScreen extends ConsumerStatefulWidget {
  const AuthSiblingsScreen({super.key});

  @override
  ConsumerState<AuthSiblingsScreen> createState() =>
      _AuthSiblingsScreenState();
}

class _AuthSiblingsScreenState extends ConsumerState<AuthSiblingsScreen> {
  int _count = 0;

  @override
  void initState() {
    super.initState();
    _count = ref.read(onboardingProgressProvider).siblingsCount;
  }

  Future<void> _save() async {
    await ref.read(onboardingProgressProvider.notifier).setSiblingsCount(_count);
    if (!mounted) return;
    context.push(RoutePaths.authDone);
  }

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
        actions: <Widget>[
          TextButton(
            onPressed: () => context.push(RoutePaths.authDone),
            child: const Text(
              'Plus tard',
              style: TextStyle(color: OriginColors.deepBlue),
            ),
          ),
        ],
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(
            horizontal: OriginSpacing.lg,
            vertical: OriginSpacing.md,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: <Widget>[
              Text(
                'TES FRÈRES & SŒURS',
                style: OriginTextStyles.micro.copyWith(
                  color: OriginColors.ochreDark,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 1.2,
                ),
              ),
              const SizedBox(height: OriginSpacing.sm),
              Text(
                'Tu en as combien ?',
                style: OriginTextStyles.hero.copyWith(
                  fontSize: 28,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: OriginSpacing.sm),
              Text(
                'Tu pourras ajouter chacun par son nom plus tard.',
                style: OriginTextStyles.body
                    .copyWith(color: OriginColors.textSecondary),
              ),
              const Spacer(),
              Center(
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    vertical: OriginSpacing.lg,
                    horizontal: OriginSpacing.xl,
                  ),
                  decoration: BoxDecoration(
                    color: OriginColors.offWhite,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: OriginColors.border),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: <Widget>[
                      _CounterButton(
                        icon: Icons.remove,
                        onTap: _count > 0
                            ? () => setState(() => _count--)
                            : null,
                      ),
                      const SizedBox(width: 28),
                      Text(
                        '$_count',
                        style: const TextStyle(
                          fontSize: 56,
                          fontWeight: FontWeight.w800,
                          color: OriginColors.charcoal,
                          fontFeatures: <FontFeature>[
                            FontFeature.tabularFigures(),
                          ],
                        ),
                      ),
                      const SizedBox(width: 28),
                      _CounterButton(
                        icon: Icons.add,
                        onTap: _count < 30
                            ? () => setState(() => _count++)
                            : null,
                      ),
                    ],
                  ),
                ),
              ),
              const Spacer(),
              OriginButton.primary(label: 'Continuer', onPressed: _save),
              const SizedBox(height: OriginSpacing.sm),
            ],
          ),
        ),
      ),
    );
  }
}

class _CounterButton extends StatelessWidget {
  const _CounterButton({required this.icon, this.onTap});

  final IconData icon;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final disabled = onTap == null;
    return Material(
      color: disabled
          ? OriginColors.ash100
          : OriginColors.deepBlue,
      shape: const CircleBorder(),
      child: InkWell(
        customBorder: const CircleBorder(),
        onTap: onTap,
        child: SizedBox(
          width: 48,
          height: 48,
          child: Icon(
            icon,
            color: disabled ? OriginColors.ash700 : OriginColors.offWhite,
          ),
        ),
      ),
    );
  }
}
