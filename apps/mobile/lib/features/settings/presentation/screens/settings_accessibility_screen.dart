import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:origin_mobile/core/theme/origin_colors.dart';
import 'package:origin_mobile/core/theme/origin_spacing.dart';
import 'package:origin_mobile/shared/widgets/origin_scaffold.dart';

class SettingsAccessibilityScreen extends ConsumerStatefulWidget {
  const SettingsAccessibilityScreen({super.key});

  @override
  ConsumerState<SettingsAccessibilityScreen> createState() =>
      _SettingsAccessibilityScreenState();
}

class _SettingsAccessibilityScreenState
    extends ConsumerState<SettingsAccessibilityScreen> {
  bool _largeText = false;
  bool _dataSaver = false;

  @override
  Widget build(BuildContext context) {
    return OriginScaffold(
      backgroundColor: OriginColors.sand,
      appBar: AppBar(
        backgroundColor: OriginColors.sand,
        title: const Text('Accessibilité'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(OriginSpacing.lg),
          child: Column(
            children: <Widget>[
              SwitchListTile(
                title: const Text('Texte plus grand'),
                subtitle: const Text('Pour mieux lire (mode grand-mère).'),
                value: _largeText,
                onChanged: (v) => setState(() => _largeText = v),
              ),
              SwitchListTile(
                title: const Text('Mode économe de données'),
                subtitle: const Text('Photos en basse définition.'),
                value: _dataSaver,
                onChanged: (v) => setState(() => _dataSaver = v),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
