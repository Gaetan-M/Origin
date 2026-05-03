import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:origin_mobile/core/theme/origin_colors.dart';
import 'package:origin_mobile/core/theme/origin_spacing.dart';
import 'package:origin_mobile/core/theme/origin_text_styles.dart';
import 'package:origin_mobile/shared/widgets/origin_button.dart';
import 'package:origin_mobile/shared/widgets/origin_scaffold.dart';

class SettingsSecurityScreen extends ConsumerWidget {
  const SettingsSecurityScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return OriginScaffold(
      backgroundColor: OriginColors.sand,
      appBar: AppBar(
        backgroundColor: OriginColors.sand,
        title: const Text('Sécurité'),
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
                'Code PIN',
                style: OriginTextStyles.sectionTitle
                    .copyWith(fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: OriginSpacing.sm),
              Text(
                'Optionnel. Ajoute une protection en plus de ton numéro.',
                style: OriginTextStyles.body
                    .copyWith(color: OriginColors.textSecondary),
              ),
              const Spacer(),
              OriginButton.primary(
                label: 'Mettre un code PIN',
                onPressed: () {},
              ),
            ],
          ),
        ),
      ),
    );
  }
}
