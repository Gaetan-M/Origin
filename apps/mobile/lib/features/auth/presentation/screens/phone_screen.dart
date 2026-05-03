import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import 'package:origin_mobile/core/routing/route_paths.dart';
import 'package:origin_mobile/core/theme/origin_colors.dart';
import 'package:origin_mobile/core/theme/origin_spacing.dart';
import 'package:origin_mobile/core/utils/formatters.dart';
import 'package:origin_mobile/core/utils/validators.dart';
import 'package:origin_mobile/data/models/otp_channel.dart';
import 'package:origin_mobile/features/auth/presentation/providers/auth_state_provider.dart';
import 'package:origin_mobile/features/auth/presentation/providers/onboarding_progress_provider.dart';
import 'package:origin_mobile/shared/widgets/origin_button.dart';
import 'package:origin_mobile/shared/widgets/origin_phone_input.dart';
import 'package:origin_mobile/shared/widgets/origin_scaffold.dart';

/// Screen 3 of the inscription flow — phone number entry.
class AuthPhoneScreen extends ConsumerStatefulWidget {
  const AuthPhoneScreen({super.key});

  @override
  ConsumerState<AuthPhoneScreen> createState() => _AuthPhoneScreenState();
}

class _AuthPhoneScreenState extends ConsumerState<AuthPhoneScreen> {
  final TextEditingController _controller = TextEditingController();
  String? _errorText;
  String? _operatorHint;
  bool _submitting = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  /// Naive operator detection by leading digit (Cameroon).
  /// 6 -> MTN/Orange (mixed), 2 -> landline. We just surface a friendly hint.
  void _onChanged(String value) {
    final normalised = Formatters.phoneE164(value);
    final hint = _detectOperator(normalised);
    if (hint != _operatorHint || _errorText != null) {
      setState(() {
        _operatorHint = hint;
        _errorText = null;
      });
    }
  }

  String? _detectOperator(String? e164) {
    if (e164 == null || !e164.startsWith('+237') || e164.length < 6) {
      return null;
    }
    final firstDigit = e164.substring(4, 5);
    final pair = e164.length >= 6 ? e164.substring(4, 6) : '';
    // Approximate, indicative only.
    if (pair.startsWith('65') || pair.startsWith('67') || pair.startsWith('68')) {
      return 'MTN';
    }
    if (pair.startsWith('69') || pair.startsWith('66')) {
      return 'Orange';
    }
    if (pair.startsWith('64') || pair.startsWith('62')) {
      return 'Camtel';
    }
    if (firstDigit == '2') {
      return 'Fixe';
    }
    return null;
  }

  Future<void> _submit() async {
    final raw = _controller.text;
    final validation = Validators.phone(raw);
    if (validation != null) {
      setState(() => _errorText = validation);
      return;
    }
    final phone = Formatters.phoneE164(raw)!;

    setState(() => _submitting = true);
    try {
      await ref
          .read(authStateProvider.notifier)
          .requestOtp(phone, OtpChannel.sms);
      await ref
          .read(onboardingProgressProvider.notifier)
          .setPhone(phone);
      if (!mounted) return;
      context.push(RoutePaths.authOtp);
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _errorText = "Ça n'a pas marché, réessaie dans un instant.";
      });
    } finally {
      if (mounted) {
        setState(() => _submitting = false);
      }
    }
  }

  Future<void> _openTerms() async {
    final uri = Uri.parse('https://origin.cm/cgu');
    await launchUrl(uri, mode: LaunchMode.externalApplication);
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
              const SizedBox(height: OriginSpacing.md),
              const Text(
                'Quel est ton numéro ?',
                style: TextStyle(
                  fontSize: 26,
                  fontWeight: FontWeight.w700,
                  color: OriginColors.charcoal,
                ),
              ),
              const SizedBox(height: OriginSpacing.sm),
              const Text(
                "On t'envoie un code par SMS pour confirmer.",
                style: TextStyle(
                  fontSize: 16,
                  color: OriginColors.textSecondary,
                ),
              ),
              const SizedBox(height: OriginSpacing.xl),
              OriginPhoneInput(
                controller: _controller,
                errorText: _errorText,
                autofocus: true,
                onChanged: _onChanged,
              ),
              if (_operatorHint != null) ...<Widget>[
                const SizedBox(height: OriginSpacing.sm),
                Row(
                  children: <Widget>[
                    const Icon(
                      Icons.signal_cellular_alt,
                      size: 16,
                      color: OriginColors.textMuted,
                    ),
                    const SizedBox(width: OriginSpacing.xs),
                    Text(
                      _operatorHint!,
                      style: const TextStyle(
                        fontSize: 13,
                        color: OriginColors.textMuted,
                      ),
                    ),
                  ],
                ),
              ],
              const Spacer(),
              OriginButton.primary(
                label: 'Recevoir le code',
                isLoading: _submitting,
                onPressed: _submitting ? null : _submit,
              ),
              const SizedBox(height: OriginSpacing.md),
              Align(
                alignment: Alignment.center,
                child: GestureDetector(
                  onTap: _openTerms,
                  child: RichText(
                    textAlign: TextAlign.center,
                    text: const TextSpan(
                      style: TextStyle(
                        fontSize: 12,
                        color: OriginColors.textMuted,
                      ),
                      children: <InlineSpan>[
                        TextSpan(
                            text:
                                'En continuant, tu acceptes nos\nconditions et la politique de confidentialité.'),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(height: OriginSpacing.sm),
            ],
          ),
        ),
      ),
    );
  }
}
