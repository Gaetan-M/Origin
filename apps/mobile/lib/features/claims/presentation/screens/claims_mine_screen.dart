import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:origin_mobile/core/theme/origin_colors.dart';
import 'package:origin_mobile/shared/widgets/empty_state_view.dart';
import 'package:origin_mobile/shared/widgets/origin_scaffold.dart';

class ClaimsMineScreen extends ConsumerWidget {
  const ClaimsMineScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return OriginScaffold(
      backgroundColor: OriginColors.sand,
      appBar: AppBar(
        backgroundColor: OriginColors.sand,
        title: const Text('Mes demandes'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
      ),
      body: const SafeArea(
        child: EmptyStateView(
          icon: Icons.send_outlined,
          title: 'Tu n\'as pas encore demandé de lien',
          subtitle:
              'Tape « C\'est moi » sur une fiche pour la lier à ton compte.',
        ),
      ),
    );
  }
}
