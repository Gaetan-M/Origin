import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:origin_mobile/core/theme/origin_colors.dart';
import 'package:origin_mobile/shared/widgets/empty_state_view.dart';
import 'package:origin_mobile/shared/widgets/origin_scaffold.dart';

class IdentityDocsListScreen extends ConsumerWidget {
  const IdentityDocsListScreen({super.key, required this.personId});

  final String personId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return OriginScaffold(
      backgroundColor: OriginColors.sand,
      appBar: AppBar(
        backgroundColor: OriginColors.sand,
        title: const Text('Documents d\'identité'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
      ),
      body: const SafeArea(
        child: EmptyStateView(
          icon: Icons.badge_outlined,
          title: 'Aucun document enregistré',
          subtitle:
              'Ajoute un document pour aider à la vérification de ce profil.',
        ),
      ),
    );
  }
}
