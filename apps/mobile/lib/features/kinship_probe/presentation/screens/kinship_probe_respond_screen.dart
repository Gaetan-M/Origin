import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:origin_mobile/core/theme/origin_colors.dart';
import 'package:origin_mobile/core/theme/origin_spacing.dart';
import 'package:origin_mobile/core/theme/origin_text_styles.dart';
import 'package:origin_mobile/shared/widgets/origin_button.dart';
import 'package:origin_mobile/shared/widgets/origin_scaffold.dart';

class KinshipProbeRespondScreen extends ConsumerWidget {
  const KinshipProbeRespondScreen({super.key, required this.probeId});

  final String probeId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return OriginScaffold(
      backgroundColor: OriginColors.sand,
      appBar: AppBar(
        backgroundColor: OriginColors.sand,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(OriginSpacing.lg),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: <Widget>[
              Text(
                'Quelqu\'un pense être de ta famille',
                style: OriginTextStyles.hero.copyWith(
                  fontSize: 24,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: OriginSpacing.sm),
              Text(
                'Tu reconnais cette personne ?',
                style: OriginTextStyles.body
                    .copyWith(color: OriginColors.textSecondary),
              ),
              const Spacer(),
              OriginButton.primary(
                label: 'Oui, on est de la même famille',
                onPressed: () => context.pop(),
              ),
              const SizedBox(height: OriginSpacing.sm),
              OriginButton.secondary(
                label: 'Non, je ne crois pas',
                onPressed: () => context.pop(),
              ),
              const SizedBox(height: OriginSpacing.sm),
              TextButton(
                onPressed: () => context.pop(),
                child: const Text('Pas sûr'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
