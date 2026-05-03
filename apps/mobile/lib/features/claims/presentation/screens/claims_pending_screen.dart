import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:origin_mobile/core/theme/origin_colors.dart';
import 'package:origin_mobile/shared/widgets/empty_state_view.dart';
import 'package:origin_mobile/shared/widgets/origin_scaffold.dart';

class ClaimsPendingScreen extends ConsumerWidget {
  const ClaimsPendingScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return OriginScaffold(
      backgroundColor: OriginColors.sand,
      appBar: AppBar(
        backgroundColor: OriginColors.sand,
        title: const Text('Demandes à confirmer'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
      ),
      body: const SafeArea(
        child: EmptyStateView(
          icon: Icons.handshake_outlined,
          title: 'Pas de demande pour l\'instant',
          subtitle: 'Tu verras ici les demandes de tes proches qui veulent '
              'lier leur compte à une fiche que tu as créée.',
        ),
      ),
    );
  }
}
