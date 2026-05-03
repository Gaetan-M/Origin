import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:origin_mobile/core/theme/origin_colors.dart';
import 'package:origin_mobile/core/theme/origin_spacing.dart';
import 'package:origin_mobile/core/theme/origin_text_styles.dart';
import 'package:origin_mobile/shared/widgets/origin_button.dart';
import 'package:origin_mobile/shared/widgets/origin_input.dart';
import 'package:origin_mobile/shared/widgets/origin_scaffold.dart';

class IdentityDocAddScreen extends ConsumerWidget {
  const IdentityDocAddScreen({super.key, this.personId});

  final String? personId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return OriginScaffold(
      backgroundColor: OriginColors.sand,
      appBar: AppBar(
        backgroundColor: OriginColors.sand,
        title: const Text('Ajouter un document'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(OriginSpacing.lg),
          children: <Widget>[
            const OriginInput(label: 'Type de document'),
            const SizedBox(height: OriginSpacing.md),
            const OriginInput(
              label: 'Numéro',
              helperText:
                  'Ton numéro est gardé secret, jamais affiché en clair.',
            ),
            const SizedBox(height: OriginSpacing.md),
            const OriginInput(
              label: 'Autorité (facultatif)',
            ),
            const SizedBox(height: OriginSpacing.xxl),
            OriginButton.primary(
              label: 'Enregistrer',
              onPressed: () => context.pop(),
            ),
            const SizedBox(height: OriginSpacing.sm),
            Text(
              'Tes documents sont chiffrés. Personne d\'autre ne pourra les lire.',
              textAlign: TextAlign.center,
              style: OriginTextStyles.caption,
            ),
          ],
        ),
      ),
    );
  }
}
