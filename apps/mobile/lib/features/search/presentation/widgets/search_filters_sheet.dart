import 'package:flutter/material.dart';
import 'package:origin_mobile/core/theme/origin_spacing.dart';
import 'package:origin_mobile/shared/widgets/origin_button.dart';
import 'package:origin_mobile/shared/widgets/origin_input.dart';

class SearchFiltersSheet {
  static Future<void> show(BuildContext context) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(
          left: OriginSpacing.lg,
          right: OriginSpacing.lg,
          top: OriginSpacing.md,
          bottom: MediaQuery.of(ctx).viewInsets.bottom + OriginSpacing.md,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            const Text(
              'Filtres',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: OriginSpacing.md),
            const OriginInput(label: 'Village ou ville d\'origine'),
            const SizedBox(height: OriginSpacing.md),
            const OriginInput(label: 'Ethnie'),
            const SizedBox(height: OriginSpacing.lg),
            OriginButton.primary(
              label: 'Appliquer',
              onPressed: () => Navigator.of(ctx).maybePop(),
            ),
          ],
        ),
      ),
    );
  }
}
