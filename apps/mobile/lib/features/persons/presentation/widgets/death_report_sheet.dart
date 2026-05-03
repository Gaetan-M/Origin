import 'package:flutter/material.dart';
import 'package:origin_mobile/core/theme/origin_spacing.dart';
import 'package:origin_mobile/core/theme/origin_text_styles.dart';
import 'package:origin_mobile/shared/widgets/decade_picker.dart';
import 'package:origin_mobile/shared/widgets/origin_bottom_sheet.dart';
import 'package:origin_mobile/shared/widgets/origin_button.dart';

/// Sheet surfaced when a user reports that a person passed away.
class DeathReportSheet {
  static Future<void> show(BuildContext context) {
    return OriginBottomSheet.show<void>(
      context: context,
      title: 'Cette personne nous a quittés',
      subtitle: 'C\'est une étape difficile. Si tu sais à peu près quand, '
          'ça aide la famille.',
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: OriginSpacing.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            OriginButton.secondary(
              label: 'Préciser une année',
              icon: Icons.calendar_today_outlined,
              onPressed: () async {
                final picked = await DecadePicker.show(context);
                if (picked != null) {
                  // Hand-off to caller via a state notifier elsewhere.
                }
              },
            ),
            const SizedBox(height: OriginSpacing.sm),
            Text(
              'Tu peux aussi écrire « il y a longtemps » dans la zone de texte.',
              style: OriginTextStyles.caption,
            ),
          ],
        ),
      ),
      actions: <OriginBottomSheetAction>[
        OriginBottomSheetAction(
          icon: Icons.check_circle_outline,
          label: 'Confirmer le décès',
          onTap: () async {},
        ),
      ],
    );
  }
}
