import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:origin_mobile/core/theme/origin_colors.dart';
import 'package:origin_mobile/shared/widgets/empty_state_view.dart';
import 'package:origin_mobile/shared/widgets/origin_scaffold.dart';

class FamilyCodeUsesScreen extends ConsumerWidget {
  const FamilyCodeUsesScreen({super.key, required this.codeId});

  final String codeId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return OriginScaffold(
      backgroundColor: OriginColors.sand,
      appBar: AppBar(
        backgroundColor: OriginColors.sand,
        title: const Text('Utilisations'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
      ),
      body: const SafeArea(
        child: EmptyStateView(
          icon: Icons.qr_code_2,
          title: 'Personne n\'a encore utilisé ce code',
          subtitle: 'Partage-le pour que ta famille te rejoigne.',
        ),
      ),
    );
  }
}
