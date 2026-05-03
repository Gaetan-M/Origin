import 'package:flutter/material.dart';
import 'package:origin_mobile/core/theme/origin_spacing.dart';
import 'package:origin_mobile/shared/widgets/origin_button.dart';
import 'package:origin_mobile/shared/widgets/origin_input.dart';

/// Sheet showing the form to dispute a [Claim].
class ClaimDisputeSheet {
  static Future<String?> show(BuildContext context) {
    final controller = TextEditingController();
    return showModalBottomSheet<String>(
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
              'Pourquoi contester ?',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: OriginSpacing.md),
            OriginInput(
              controller: controller,
              hint: 'Ce n\'est pas la bonne personne parce que…',
              maxLines: 4,
            ),
            const SizedBox(height: OriginSpacing.md),
            OriginButton.primary(
              label: 'Envoyer',
              onPressed: () =>
                  Navigator.of(ctx).pop(controller.text.trim()),
            ),
          ],
        ),
      ),
    );
  }
}

