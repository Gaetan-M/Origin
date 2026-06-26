import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import 'package:origin_mobile/core/config/app_constants.dart';
import 'package:origin_mobile/core/routing/route_paths.dart';
import 'package:origin_mobile/core/theme/origin_colors.dart';
import 'package:origin_mobile/core/theme/origin_spacing.dart';
import 'package:origin_mobile/core/utils/formatters.dart';
import 'package:origin_mobile/data/models/otp_channel.dart';
import 'package:origin_mobile/features/auth/presentation/providers/auth_state_provider.dart';
import 'package:origin_mobile/features/auth/presentation/providers/onboarding_progress_provider.dart';
import 'package:origin_mobile/shared/widgets/origin_bottom_sheet.dart';
import 'package:origin_mobile/shared/widgets/origin_otp_input.dart';
import 'package:origin_mobile/shared/widgets/origin_scaffold.dart';

/// Screen 4 — OTP verification.
class AuthOtpScreen extends ConsumerStatefulWidget {
  const AuthOtpScreen({super.key});

  @override
  ConsumerState<AuthOtpScreen> createState() => _AuthOtpScreenState();
}

class _AuthOtpScreenState extends ConsumerState<AuthOtpScreen> {
  String _code = '';
  String? _errorText;
  bool _verifying = false;
  Timer? _ticker;
  int _secondsRemaining = 60;

  @override
  void initState() {
    super.initState();
    _startTicker();
  }

  @override
  void dispose() {
    _ticker?.cancel();
    super.dispose();
  }

  void _startTicker() {
    _ticker?.cancel();
    setState(() => _secondsRemaining = 60);
    _ticker = Timer.periodic(const Duration(seconds: 1), (Timer t) {
      if (!mounted) {
        t.cancel();
        return;
      }
      setState(() {
        if (_secondsRemaining > 0) {
          _secondsRemaining -= 1;
        } else {
          t.cancel();
        }
      });
    });
  }

  Future<void> _onCompleted(String code) async {
    if (code.length != AppConstants.otpLength) {
      return;
    }
    final phone = ref.read(onboardingProgressProvider).phoneNumber;
    if (phone == null || phone.isEmpty) {
      setState(() => _errorText = "Numéro manquant, recommence l'étape précédente.");
      return;
    }
    setState(() {
      _verifying = true;
      _errorText = null;
    });
    try {
      await ref.read(authStateProvider.notifier).verifyOtp(phone, code);
      await ref.read(onboardingProgressProvider.notifier).markOtpVerified();
      unawaited(HapticFeedback.mediumImpact());
      if (!mounted) return;

      // Decide where to go: brand-new account (no displayName) → continue
      // onboarding to /auth/name. Returning user → /home/tree.
      final auth = ref.read(authStateProvider).valueOrNull;
      final account = auth is Authenticated ? auth.account : null;
      final hasProfile = account?.fullName != null &&
          account!.fullName!.trim().isNotEmpty;
      context.go(hasProfile ? RoutePaths.homeTree : RoutePaths.authName);
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _verifying = false;
        _errorText = 'Ce code ne correspond pas. Réessaie.';
        _code = '';
      });
    }
  }

  Future<void> _resendBottomSheet() async {
    final phone = ref.read(onboardingProgressProvider).phoneNumber;
    if (phone == null) return;

    await OriginBottomSheet.show<void>(
      context: context,
      title: 'Tu n\'as pas reçu le code ?',
      actions: <OriginBottomSheetAction>[
        OriginBottomSheetAction(
          icon: Icons.sms_outlined,
          label: 'Renvoyer par SMS',
          onTap: () async {
            await ref
                .read(authStateProvider.notifier)
                .requestOtp(phone, OtpChannel.sms);
            _startTicker();
          },
        ),
        OriginBottomSheetAction(
          icon: Icons.chat_outlined,
          label: 'Essayer par WhatsApp',
          onTap: () async {
            await ref
                .read(authStateProvider.notifier)
                .requestOtp(phone, OtpChannel.whatsapp);
            _startTicker();
          },
        ),
        OriginBottomSheetAction(
          icon: Icons.call_outlined,
          label: 'Appeler un assistant',
          onTap: () async {
            final uri = Uri.parse('tel:+237600000000');
            await launchUrl(uri);
          },
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final phone = ref.watch(
      onboardingProgressProvider.select((s) => s.phoneNumber),
    );
    final phoneDisplay =
        phone == null ? '' : Formatters.formatPhoneDisplay(phone);

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
                'Tape le code reçu',
                style: TextStyle(
                  fontSize: 26,
                  fontWeight: FontWeight.w700,
                  color: OriginColors.charcoal,
                ),
              ),
              const SizedBox(height: OriginSpacing.sm),
              Text(
                phoneDisplay.isEmpty
                    ? "On t'a envoyé un code à 6 chiffres."
                    : "Au $phoneDisplay",
                style: const TextStyle(
                  fontSize: 16,
                  color: OriginColors.textSecondary,
                ),
              ),
              const SizedBox(height: OriginSpacing.xl),
              OriginOtpInput(
                length: AppConstants.otpLength,
                onChanged: (v) {
                  setState(() {
                    _code = v;
                    _errorText = null;
                  });
                },
                onCompleted: _onCompleted,
                errorText: _errorText,
                enabled: !_verifying,
              ),
              const SizedBox(height: OriginSpacing.lg),
              if (_verifying)
                const Center(
                  child: SizedBox(
                    height: 22,
                    width: 22,
                    child: CircularProgressIndicator(strokeWidth: 2.5),
                  ),
                )
              else
                Center(
                  child: _secondsRemaining > 0
                      ? Text(
                          'Renvoyer le code dans $_secondsRemaining s',
                          style: const TextStyle(
                            color: OriginColors.textMuted,
                            fontSize: 14,
                          ),
                        )
                      : TextButton(
                          onPressed: _resendBottomSheet,
                          child: const Text(
                            "Je n'ai pas reçu le code",
                            style: TextStyle(
                              color: OriginColors.deepBlue,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),
                ),
              const Spacer(),
              if (!_verifying && _code.length < AppConstants.otpLength)
                Center(
                  child: Text(
                    "${_code.length}/${AppConstants.otpLength}",
                    style: const TextStyle(
                      color: OriginColors.textMuted,
                      fontSize: 13,
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
