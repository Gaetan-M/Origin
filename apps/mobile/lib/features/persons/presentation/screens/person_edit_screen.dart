import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:origin_mobile/core/theme/origin_colors.dart';
import 'package:origin_mobile/core/theme/origin_spacing.dart';
import 'package:origin_mobile/core/theme/origin_text_styles.dart';
import 'package:origin_mobile/shared/widgets/origin_button.dart';
import 'package:origin_mobile/shared/widgets/origin_scaffold.dart';

class PersonEditScreen extends ConsumerWidget {
  const PersonEditScreen({super.key, required this.personId});

  final String personId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return OriginScaffold(
      backgroundColor: OriginColors.sand,
      appBar: AppBar(
        backgroundColor: OriginColors.sand,
        title: const Text('Modifier'),
        leading: IconButton(
          icon: const Icon(Icons.close),
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
                'Modifier ce profil',
                style: OriginTextStyles.sectionTitle
                    .copyWith(fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: OriginSpacing.sm),
              Text(
                'Les changements sont enregistrés et les autres membres de la famille seront prévenus.',
                style: OriginTextStyles.body
                    .copyWith(color: OriginColors.textSecondary),
              ),
              const Spacer(),
              OriginButton.danger(
                label: 'Supprimer cette personne',
                icon: Icons.delete_outline,
                onPressed: () {},
              ),
              const SizedBox(height: OriginSpacing.sm),
              OriginButton.primary(
                label: 'Enregistrer',
                onPressed: () => context.pop(),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
