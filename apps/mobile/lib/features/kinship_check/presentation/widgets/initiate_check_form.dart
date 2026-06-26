import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:origin_mobile/core/theme/origin_colors.dart';
import 'package:origin_mobile/core/theme/origin_radius.dart';
import 'package:origin_mobile/core/theme/origin_spacing.dart';
import 'package:origin_mobile/core/theme/origin_text_styles.dart';
import 'package:origin_mobile/features/kinship_check/domain/kinship_check.dart';
import 'package:origin_mobile/features/kinship_check/presentation/i18n/kinship_check_strings.dart';
import 'package:origin_mobile/features/kinship_check/presentation/providers/kinship_check_providers.dart';
import 'package:origin_mobile/shared/widgets/origin_button.dart';
import 'package:origin_mobile/shared/widgets/origin_input.dart';

enum _Method { phone, code }

// E.164: leading + then 8–15 digits, first digit non-zero.
final RegExp _e164 = RegExp(r'^\+[1-9]\d{7,14}$');

/// Lets a user open a kinship check by phone number or family code. Only the
/// minimum is collected; the other party must explicitly consent before any
/// computation runs. Mirrors
/// apps/web/src/components/kinship/initiate-check-form.tsx.
class InitiateCheckForm extends ConsumerStatefulWidget {
  const InitiateCheckForm({super.key, required this.strings});

  final KinshipStrings strings;

  @override
  ConsumerState<InitiateCheckForm> createState() => _InitiateCheckFormState();
}

class _InitiateCheckFormState extends ConsumerState<InitiateCheckForm> {
  final TextEditingController _phoneController = TextEditingController();
  final TextEditingController _codeController = TextEditingController();

  _Method _method = _Method.phone;
  bool _submitting = false;
  String? _errorText;

  @override
  void dispose() {
    _phoneController.dispose();
    _codeController.dispose();
    super.dispose();
  }

  KinshipStrings get _s => widget.strings;

  Future<void> _submit() async {
    if (_submitting) return;
    FocusScope.of(context).unfocus();

    final InitiateKinshipCheckInput input;
    if (_method == _Method.phone) {
      final value = _phoneController.text.replaceAll(RegExp(r'\s+'), '');
      if (!_e164.hasMatch(value)) {
        setState(() => _errorText = _s.invalidPhone);
        return;
      }
      input = InitiateKinshipCheckInput(targetPhone: value);
    } else {
      final value = _codeController.text.trim();
      if (value.length < 3) {
        setState(() => _errorText = _s.invalidCode);
        return;
      }
      input = InitiateKinshipCheckInput(familyCode: value);
    }

    setState(() {
      _errorText = null;
      _submitting = true;
    });

    final ok = await ref
        .read(kinshipChecksControllerProvider.notifier)
        .initiate(input);

    if (!mounted) return;
    setState(() => _submitting = false);

    if (ok) {
      _phoneController.clear();
      _codeController.clear();
      _toast(_s.initiateSuccess, OriginColors.forestGreen);
    } else {
      _toast(_s.initiateError, OriginColors.error);
    }
  }

  void _toast(String message, Color color) {
    ScaffoldMessenger.of(context)
      ..clearSnackBars()
      ..showSnackBar(
        SnackBar(
          content: Text(message),
          backgroundColor: color,
          behavior: SnackBarBehavior.floating,
        ),
      );
  }

  @override
  Widget build(BuildContext context) {
    final isPhone = _method == _Method.phone;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        // Method switch.
        Container(
          padding: const EdgeInsets.all(4),
          decoration: BoxDecoration(
            color: OriginColors.sand,
            borderRadius: BorderRadius.circular(OriginRadius.md),
          ),
          child: Row(
            children: <Widget>[
              Expanded(
                child: _MethodTab(
                  icon: Icons.phone_outlined,
                  label: _s.methodPhone,
                  active: isPhone,
                  onTap: () => setState(() {
                    _method = _Method.phone;
                    _errorText = null;
                  }),
                ),
              ),
              Expanded(
                child: _MethodTab(
                  icon: Icons.key_outlined,
                  label: _s.methodCode,
                  active: !isPhone,
                  onTap: () => setState(() {
                    _method = _Method.code;
                    _errorText = null;
                  }),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: OriginSpacing.md),

        if (isPhone)
          OriginInput(
            controller: _phoneController,
            label: _s.phoneLabel,
            hint: _s.phonePlaceholder,
            prefixIcon: Icons.phone_outlined,
            keyboardType: TextInputType.phone,
            textCapitalization: TextCapitalization.none,
            errorText: _errorText,
            enabled: !_submitting,
            textInputAction: TextInputAction.done,
            onSubmitted: (_) => _submit(),
          )
        else
          OriginInput(
            controller: _codeController,
            label: _s.codeLabel,
            hint: _s.codePlaceholder,
            prefixIcon: Icons.key_outlined,
            textCapitalization: TextCapitalization.characters,
            errorText: _errorText,
            enabled: !_submitting,
            textInputAction: TextInputAction.done,
            onSubmitted: (_) => _submit(),
          ),

        const SizedBox(height: OriginSpacing.md),
        Text(
          _s.consentNote,
          style: OriginTextStyles.caption.copyWith(
            color: OriginColors.textSecondary,
          ),
        ),
        const SizedBox(height: OriginSpacing.md),
        OriginButton.primary(
          label: _submitting ? _s.submitting : _s.submit,
          icon: Icons.send_outlined,
          isLoading: _submitting,
          onPressed: _submitting ? null : _submit,
        ),
      ],
    );
  }
}

class _MethodTab extends StatelessWidget {
  const _MethodTab({
    required this.icon,
    required this.label,
    required this.active,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final Color fg =
        active ? OriginColors.deepBlue : OriginColors.textMuted;
    return Material(
      color: active ? OriginColors.offWhite : Colors.transparent,
      borderRadius: BorderRadius.circular(OriginRadius.sm),
      child: InkWell(
        borderRadius: BorderRadius.circular(OriginRadius.sm),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              Icon(icon, size: 18, color: fg),
              const SizedBox(width: 6),
              Flexible(
                child: Text(
                  label,
                  overflow: TextOverflow.ellipsis,
                  style: OriginTextStyles.caption.copyWith(
                    color: fg,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
