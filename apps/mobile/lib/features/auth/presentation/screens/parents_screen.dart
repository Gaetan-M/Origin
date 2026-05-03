import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:origin_mobile/core/routing/route_paths.dart';
import 'package:origin_mobile/core/theme/origin_colors.dart';
import 'package:origin_mobile/core/theme/origin_spacing.dart';
import 'package:origin_mobile/core/theme/origin_text_styles.dart';
import 'package:origin_mobile/features/auth/presentation/providers/onboarding_progress_provider.dart';
import 'package:origin_mobile/shared/widgets/origin_button.dart';
import 'package:origin_mobile/shared/widgets/origin_input.dart';
import 'package:origin_mobile/shared/widgets/origin_scaffold.dart';

class AuthParentsScreen extends ConsumerStatefulWidget {
  const AuthParentsScreen({super.key});

  @override
  ConsumerState<AuthParentsScreen> createState() => _AuthParentsScreenState();
}

class _AuthParentsScreenState extends ConsumerState<AuthParentsScreen> {
  final TextEditingController _fatherController = TextEditingController();
  final TextEditingController _motherController = TextEditingController();
  ParentLifeChoice? _fatherStatus;
  ParentLifeChoice? _motherStatus;

  @override
  void initState() {
    super.initState();
    final progress = ref.read(onboardingProgressProvider);
    _fatherController.text = progress.father.fullName ?? '';
    _motherController.text = progress.mother.fullName ?? '';
    _fatherStatus = progress.father.lifeChoice;
    _motherStatus = progress.mother.lifeChoice;
  }

  @override
  void dispose() {
    _fatherController.dispose();
    _motherController.dispose();
    super.dispose();
  }

  Future<void> _next() async {
    final notifier = ref.read(onboardingProgressProvider.notifier);
    if (_fatherController.text.trim().isNotEmpty) {
      await notifier.setFather(
        ParentDraft(
          fullName: _fatherController.text.trim(),
          lifeChoice: _fatherStatus,
        ),
      );
    }
    if (_motherController.text.trim().isNotEmpty) {
      await notifier.setMother(
        ParentDraft(
          fullName: _motherController.text.trim(),
          lifeChoice: _motherStatus,
        ),
      );
    }
    if (!mounted) return;
    context.push(RoutePaths.authSiblings);
  }

  @override
  Widget build(BuildContext context) {
    return OriginScaffold(
      backgroundColor: OriginColors.sand,
      appBar: AppBar(
        backgroundColor: OriginColors.sand,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: OriginColors.charcoal),
          onPressed: () => context.pop(),
        ),
        actions: <Widget>[
          TextButton(
            onPressed: () => context.push(RoutePaths.authSiblings),
            child: const Text(
              'Plus tard',
              style: TextStyle(color: OriginColors.deepBlue),
            ),
          ),
        ],
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(
            horizontal: OriginSpacing.lg,
            vertical: OriginSpacing.sm,
          ),
          child: ListView(
            children: <Widget>[
              Text(
                'ÉTAPE 3 SUR 3 · LA GRAINE',
                style: OriginTextStyles.micro.copyWith(
                  color: OriginColors.ochreDark,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 1.2,
                ),
              ),
              const SizedBox(height: OriginSpacing.sm),
              Text(
                'Parle-nous de tes parents',
                style: OriginTextStyles.hero.copyWith(
                  fontSize: 26,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: OriginSpacing.sm),
              Text(
                'Tu peux ajouter ta maman, ton papa, ou les deux. C\'est facultatif.',
                style: OriginTextStyles.body
                    .copyWith(color: OriginColors.textSecondary),
              ),
              const SizedBox(height: OriginSpacing.xl),
              _ParentBlock(
                title: 'Ton papa',
                controller: _fatherController,
                status: _fatherStatus,
                onStatus: (s) => setState(() => _fatherStatus = s),
              ),
              const SizedBox(height: OriginSpacing.lg),
              _ParentBlock(
                title: 'Ta maman',
                controller: _motherController,
                status: _motherStatus,
                onStatus: (s) => setState(() => _motherStatus = s),
              ),
              const SizedBox(height: OriginSpacing.xxl),
              OriginButton.primary(label: 'Continuer', onPressed: _next),
            ],
          ),
        ),
      ),
    );
  }
}

class _ParentBlock extends StatelessWidget {
  const _ParentBlock({
    required this.title,
    required this.controller,
    required this.status,
    required this.onStatus,
  });

  final String title;
  final TextEditingController controller;
  final ParentLifeChoice? status;
  final ValueChanged<ParentLifeChoice> onStatus;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Text(
          title,
          style: OriginTextStyles.bodyMedium.copyWith(
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: OriginSpacing.sm),
        OriginInput(
          controller: controller,
          hint: 'Son nom complet',
          textCapitalization: TextCapitalization.words,
        ),
        const SizedBox(height: OriginSpacing.sm),
        Row(
          children: <Widget>[
            _StatusChip(
              label: 'Avec nous',
              color: OriginColors.forestGreen,
              selected: status == ParentLifeChoice.alive,
              onTap: () => onStatus(ParentLifeChoice.alive),
            ),
            const SizedBox(width: 8),
            _StatusChip(
              label: 'Nous a quittés',
              color: OriginColors.ash700,
              selected: status == ParentLifeChoice.deceased,
              onTap: () => onStatus(ParentLifeChoice.deceased),
            ),
            const SizedBox(width: 8),
            _StatusChip(
              label: 'Je ne sais pas',
              color: OriginColors.textMuted,
              selected: status == ParentLifeChoice.unknown,
              onTap: () => onStatus(ParentLifeChoice.unknown),
            ),
          ],
        ),
      ],
    );
  }
}

class _StatusChip extends StatelessWidget {
  const _StatusChip({
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
          height: 44,
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
