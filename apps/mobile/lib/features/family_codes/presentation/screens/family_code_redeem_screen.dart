import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:origin_mobile/core/theme/origin_colors.dart';
import 'package:origin_mobile/core/theme/origin_spacing.dart';
import 'package:origin_mobile/core/theme/origin_text_styles.dart';
import 'package:origin_mobile/shared/widgets/origin_button.dart';
import 'package:origin_mobile/shared/widgets/origin_input.dart';
import 'package:origin_mobile/shared/widgets/origin_scaffold.dart';

class FamilyCodeRedeemScreen extends ConsumerStatefulWidget {
  const FamilyCodeRedeemScreen({super.key});

  @override
  ConsumerState<FamilyCodeRedeemScreen> createState() =>
      _FamilyCodeRedeemScreenState();
}

class _FamilyCodeRedeemScreenState
    extends ConsumerState<FamilyCodeRedeemScreen> {
  final TextEditingController _controller = TextEditingController();

  @override
  void dispose() {
    _controller.dispose();
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
        child: Padding(
          padding: const EdgeInsets.all(OriginSpacing.lg),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: <Widget>[
              Text(
                'Entre un code famille',
                style: OriginTextStyles.hero.copyWith(
                  fontSize: 26,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: OriginSpacing.sm),
              Text(
                'Tu rejoindras l\'arbre de la personne qui t\'a partagé ce code.',
                style: OriginTextStyles.body
                    .copyWith(color: OriginColors.textSecondary),
              ),
              const SizedBox(height: OriginSpacing.xl),
              OriginInput(
                controller: _controller,
                hint: 'Ex : MBA · 7K2',
                autofocus: true,
                textCapitalization: TextCapitalization.characters,
                inputFormatters: <TextInputFormatter>[
                  LengthLimitingTextInputFormatter(10),
                ],
              ),
              const Spacer(),
              OriginButton.primary(
                label: 'Rejoindre',
                onPressed: _controller.text.trim().isEmpty
                    ? null
                    : () => context.pop(),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
