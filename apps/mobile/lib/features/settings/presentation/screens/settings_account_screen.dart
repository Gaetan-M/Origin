import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:origin_mobile/core/theme/origin_colors.dart';
import 'package:origin_mobile/core/theme/origin_spacing.dart';
import 'package:origin_mobile/features/auth/presentation/providers/auth_state_provider.dart';
import 'package:origin_mobile/shared/widgets/origin_button.dart';
import 'package:origin_mobile/shared/widgets/origin_input.dart';
import 'package:origin_mobile/shared/widgets/origin_scaffold.dart';

class SettingsAccountScreen extends ConsumerWidget {
  const SettingsAccountScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final account = ref.watch(authStateProvider).valueOrNull?.currentAccount;
    return OriginScaffold(
      backgroundColor: OriginColors.sand,
      appBar: AppBar(
        backgroundColor: OriginColors.sand,
        title: const Text('Mon compte'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(OriginSpacing.lg),
          children: <Widget>[
            OriginInput(
              label: 'Mon numéro',
              controller:
                  TextEditingController(text: account?.phoneNumber ?? ''),
              enabled: false,
            ),
            const SizedBox(height: OriginSpacing.md),
            OriginInput(
              label: 'Email (facultatif)',
              controller:
                  TextEditingController(text: account?.email ?? ''),
            ),
            const SizedBox(height: OriginSpacing.xxl),
            OriginButton.danger(
              label: 'Supprimer mon compte',
              onPressed: () {},
            ),
          ],
        ),
      ),
    );
  }
}
