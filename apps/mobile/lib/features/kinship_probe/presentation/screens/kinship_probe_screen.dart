import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:origin_mobile/core/theme/origin_colors.dart';
import 'package:origin_mobile/core/theme/origin_spacing.dart';
import 'package:origin_mobile/core/theme/origin_text_styles.dart';
import 'package:origin_mobile/shared/widgets/origin_button.dart';
import 'package:origin_mobile/shared/widgets/origin_input.dart';
import 'package:origin_mobile/shared/widgets/origin_phone_input.dart';
import 'package:origin_mobile/shared/widgets/origin_scaffold.dart';

class KinshipProbeScreen extends ConsumerStatefulWidget {
  const KinshipProbeScreen({super.key});

  @override
  ConsumerState<KinshipProbeScreen> createState() =>
      _KinshipProbeScreenState();
}

class _KinshipProbeScreenState extends ConsumerState<KinshipProbeScreen> {
  final TextEditingController _phone = TextEditingController();
  final TextEditingController _hint = TextEditingController();

  @override
  void dispose() {
    _phone.dispose();
    _hint.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return OriginScaffold(
      backgroundColor: OriginColors.sand,
      appBar: AppBar(
        backgroundColor: OriginColors.sand,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(OriginSpacing.lg),
          children: <Widget>[
            Text(
              'Es-tu de ma famille ?',
              style: OriginTextStyles.hero.copyWith(
                fontSize: 26,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: OriginSpacing.sm),
            Text(
              'On envoie une demande discrète. Aucun arbre n\'est révélé : '
              'seul le degré de parenté apparaît, si parenté il y a.',
              style: OriginTextStyles.body
                  .copyWith(color: OriginColors.textSecondary),
            ),
            const SizedBox(height: OriginSpacing.xl),
            OriginPhoneInput(
              controller: _phone,
              label: 'Numéro de la personne',
            ),
            const SizedBox(height: OriginSpacing.md),
            OriginInput(
              controller: _hint,
              label: 'Tu penses que c\'est qui ? (facultatif)',
              hint: 'Cousin, oncle…',
            ),
            const SizedBox(height: OriginSpacing.xxl),
            OriginButton.primary(
              label: 'Lancer la sonde',
              onPressed: () => context.pop(),
            ),
          ],
        ),
      ),
    );
  }
}
