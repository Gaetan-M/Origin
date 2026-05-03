import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:origin_mobile/core/theme/origin_colors.dart';
import 'package:origin_mobile/core/theme/origin_spacing.dart';
import 'package:origin_mobile/core/theme/origin_text_styles.dart';
import 'package:origin_mobile/shared/widgets/origin_button.dart';
import 'package:origin_mobile/shared/widgets/origin_scaffold.dart';

class InvitationRedeemScreen extends ConsumerWidget {
  const InvitationRedeemScreen({super.key, this.token});

  final String? token;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return OriginScaffold(
      backgroundColor: OriginColors.sand,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(OriginSpacing.lg),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: <Widget>[
              const Spacer(),
              Center(
                child: Container(
                  width: 96,
                  height: 96,
                  decoration: BoxDecoration(
                    color: OriginColors.terracotta.withValues(alpha: 0.12),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.favorite_border,
                    color: OriginColors.terracotta,
                    size: 44,
                  ),
                ),
              ),
              const SizedBox(height: OriginSpacing.lg),
              Text(
                'Tu as été invité·e',
                textAlign: TextAlign.center,
                style: OriginTextStyles.hero.copyWith(
                  fontSize: 26,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: OriginSpacing.sm),
              Text(
                'Quelqu\'un de ta famille pense que tu fais partie de leur arbre.',
                textAlign: TextAlign.center,
                style: OriginTextStyles.body
                    .copyWith(color: OriginColors.textSecondary),
              ),
              const Spacer(flex: 2),
              OriginButton.primary(
                label: 'Oui, c\'est ma famille',
                onPressed: () => context.go('/auth/phone'),
              ),
              const SizedBox(height: OriginSpacing.sm),
              OriginButton.secondary(
                label: 'Non, je ne connais pas',
                onPressed: () => context.go('/onboarding/welcome'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
