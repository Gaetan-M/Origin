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

/// Auth step — capture the user's full name.
class AuthNameScreen extends ConsumerStatefulWidget {
  const AuthNameScreen({super.key});

  @override
  ConsumerState<AuthNameScreen> createState() => _AuthNameScreenState();
}

class _AuthNameScreenState extends ConsumerState<AuthNameScreen> {
  final TextEditingController _controller = TextEditingController();
  String? _error;
  String _gender = 'unknown';

  @override
  void initState() {
    super.initState();
    final hydrated = ref.read(onboardingProgressProvider).fullName ?? '';
    _controller.text = hydrated;
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _next() async {
    final value = _controller.text.trim();
    if (value.length < 2) {
      setState(() => _error = 'Tape ton prénom (au moins 2 lettres).');
      return;
    }
    await ref.read(onboardingProgressProvider.notifier).setFullName(value);
    if (!mounted) return;
    context.push(RoutePaths.authPhoto);
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
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(
            horizontal: OriginSpacing.lg,
            vertical: OriginSpacing.md,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: <Widget>[
              Text(
                'ÉTAPE 1 SUR 3 · LA GRAINE',
                style: OriginTextStyles.micro.copyWith(
                  color: OriginColors.ochreDark,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 1.2,
                ),
              ),
              const SizedBox(height: OriginSpacing.sm),
              Text(
                'Comment tu t\'appelles ?',
                style: OriginTextStyles.hero.copyWith(
                  fontSize: 28,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: OriginSpacing.sm),
              Text(
                'C\'est le nom que verront tes proches.',
                style: OriginTextStyles.body
                    .copyWith(color: OriginColors.textSecondary),
              ),
              const SizedBox(height: OriginSpacing.xl),
              OriginInput(
                controller: _controller,
                label: 'Ton nom complet',
                hint: 'Ex : Aïssatou Mballa',
                errorText: _error,
                autofocus: true,
                textCapitalization: TextCapitalization.words,
                onChanged: (_) {
                  if (_error != null) setState(() => _error = null);
                },
              ),
              const SizedBox(height: OriginSpacing.lg),
              Text(
                'Tu es ?',
                style: OriginTextStyles.bodyMedium.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: OriginSpacing.sm),
              Row(
                children: <Widget>[
                  _GenderChip(
                    label: 'Femme',
                    selected: _gender == 'female',
                    onTap: () => setState(() => _gender = 'female'),
                  ),
                  const SizedBox(width: OriginSpacing.sm),
                  _GenderChip(
                    label: 'Homme',
                    selected: _gender == 'male',
                    onTap: () => setState(() => _gender = 'male'),
                  ),
                  const SizedBox(width: OriginSpacing.sm),
                  _GenderChip(
                    label: 'Autre',
                    selected: _gender == 'other',
                    onTap: () => setState(() => _gender = 'other'),
                  ),
                ],
              ),
              const Spacer(),
              OriginButton.primary(label: 'Continuer', onPressed: _next),
              const SizedBox(height: OriginSpacing.sm),
            ],
          ),
        ),
      ),
    );
  }
}

class _GenderChip extends StatelessWidget {
  const _GenderChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: onTap,
        child: Container(
          height: 52,
          decoration: BoxDecoration(
            color:
                selected ? OriginColors.forestGreen50 : OriginColors.offWhite,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: selected
                  ? OriginColors.forestGreen
                  : OriginColors.border,
              width: selected ? 2 : 1,
            ),
          ),
          alignment: Alignment.center,
          child: Text(
            label,
            style: OriginTextStyles.bodyMedium.copyWith(
              color: selected
                  ? OriginColors.forestGreen
                  : OriginColors.charcoal,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ),
    );
  }
}
