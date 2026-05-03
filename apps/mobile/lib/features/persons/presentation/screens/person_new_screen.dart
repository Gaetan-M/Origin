import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:origin_mobile/core/theme/origin_colors.dart';
import 'package:origin_mobile/core/theme/origin_spacing.dart';
import 'package:origin_mobile/core/theme/origin_text_styles.dart';
import 'package:origin_mobile/features/persons/presentation/providers/person_form_provider.dart';
import 'package:origin_mobile/shared/widgets/origin_button.dart';
import 'package:origin_mobile/shared/widgets/origin_input.dart';
import 'package:origin_mobile/shared/widgets/origin_scaffold.dart';

class PersonNewScreen extends ConsumerStatefulWidget {
  const PersonNewScreen({super.key});

  @override
  ConsumerState<PersonNewScreen> createState() => _PersonNewScreenState();
}

class _PersonNewScreenState extends ConsumerState<PersonNewScreen> {
  final TextEditingController _name = TextEditingController();
  final TextEditingController _village = TextEditingController();
  LifeStatusDraft _status = LifeStatusDraft.alive;

  @override
  void dispose() {
    _name.dispose();
    _village.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return OriginScaffold(
      backgroundColor: OriginColors.sand,
      appBar: AppBar(
        backgroundColor: OriginColors.sand,
        leading: IconButton(
          icon: const Icon(Icons.close, color: OriginColors.charcoal),
          onPressed: () => context.pop(),
        ),
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(OriginSpacing.lg),
          children: <Widget>[
            Text(
              'Ajouter quelqu\'un',
              style: OriginTextStyles.hero.copyWith(
                fontSize: 28,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: OriginSpacing.sm),
            Text(
              'Le strict minimum suffit. Tu pourras enrichir plus tard.',
              style: OriginTextStyles.body
                  .copyWith(color: OriginColors.textSecondary),
            ),
            const SizedBox(height: OriginSpacing.xl),
            OriginInput(
              controller: _name,
              label: 'Nom complet',
              autofocus: true,
              textCapitalization: TextCapitalization.words,
            ),
            const SizedBox(height: OriginSpacing.lg),
            Text(
              'Cette personne…',
              style: OriginTextStyles.bodyMedium
                  .copyWith(fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: OriginSpacing.sm),
            Row(
              children: <Widget>[
                _StatusOption(
                  label: 'Avec nous',
                  color: OriginColors.forestGreen,
                  selected: _status == LifeStatusDraft.alive,
                  onTap: () =>
                      setState(() => _status = LifeStatusDraft.alive),
                ),
                const SizedBox(width: 8),
                _StatusOption(
                  label: 'Nous a quittés',
                  color: OriginColors.ash700,
                  selected: _status == LifeStatusDraft.deceased,
                  onTap: () =>
                      setState(() => _status = LifeStatusDraft.deceased),
                ),
                const SizedBox(width: 8),
                _StatusOption(
                  label: 'Je ne sais pas',
                  color: OriginColors.textMuted,
                  selected: _status == LifeStatusDraft.unknown,
                  onTap: () =>
                      setState(() => _status = LifeStatusDraft.unknown),
                ),
              ],
            ),
            const SizedBox(height: OriginSpacing.lg),
            OriginInput(
              controller: _village,
              label: 'Village ou ville d\'origine (facultatif)',
              textCapitalization: TextCapitalization.words,
            ),
            const SizedBox(height: OriginSpacing.xxl),
            OriginButton.primary(
              label: 'Ajouter',
              onPressed: _name.text.trim().isEmpty
                  ? null
                  : () {
                      // TODO: wire to PersonsApi.create — left as a follow-up.
                      context.pop();
                    },
            ),
          ],
        ),
      ),
    );
  }
}

class _StatusOption extends StatelessWidget {
  const _StatusOption({
    required this.label,
    required this.color,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final Color color;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: onTap,
        child: Container(
          height: 48,
          alignment: Alignment.center,
          padding: const EdgeInsets.symmetric(horizontal: 6),
          decoration: BoxDecoration(
            color: selected
                ? color.withValues(alpha: 0.12)
                : OriginColors.offWhite,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: selected ? color : OriginColors.border,
              width: selected ? 1.5 : 1,
            ),
          ),
          child: Text(
            label,
            textAlign: TextAlign.center,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: OriginTextStyles.caption.copyWith(
              color: selected ? color : OriginColors.charcoal,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ),
    );
  }
}
