import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:origin_mobile/core/theme/origin_colors.dart';
import 'package:origin_mobile/features/settings/presentation/providers/locale_provider.dart';
import 'package:origin_mobile/shared/widgets/origin_scaffold.dart';

class SettingsLanguageScreen extends ConsumerWidget {
  const SettingsLanguageScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final current = ref.watch(localeProvider);
    return OriginScaffold(
      backgroundColor: OriginColors.sand,
      appBar: AppBar(
        backgroundColor: OriginColors.sand,
        title: const Text('Langue'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
      ),
      body: SafeArea(
        child: ListView(
          children: <Widget>[
            RadioListTile<String>(
              title: const Text('Français'),
              value: 'fr',
              groupValue: current?.languageCode ?? 'fr',
              onChanged: (v) => ref
                  .read(localeProvider.notifier)
                  .setLocale(const Locale('fr')),
            ),
            RadioListTile<String>(
              title: const Text('English'),
              value: 'en',
              groupValue: current?.languageCode ?? 'fr',
              onChanged: (v) => ref
                  .read(localeProvider.notifier)
                  .setLocale(const Locale('en')),
            ),
          ],
        ),
      ),
    );
  }
}
