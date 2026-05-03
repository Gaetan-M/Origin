import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:origin_mobile/core/theme/origin_colors.dart';
import 'package:origin_mobile/core/theme/origin_spacing.dart';
import 'package:origin_mobile/core/theme/origin_text_styles.dart';
import 'package:origin_mobile/features/auth/presentation/providers/auth_state_provider.dart';
import 'package:origin_mobile/shared/widgets/origin_pin_input.dart';
import 'package:origin_mobile/shared/widgets/origin_scaffold.dart';

/// PIN unlock — surfaces when the user resumes the app after backgrounding it.
class PinLockScreen extends ConsumerStatefulWidget {
  const PinLockScreen({super.key, required this.onUnlock});

  final VoidCallback onUnlock;

  @override
  ConsumerState<PinLockScreen> createState() => _PinLockScreenState();
}

class _PinLockScreenState extends ConsumerState<PinLockScreen> {
  String? _error;
  bool _verifying = false;

  Future<void> _verify(String pin) async {
    setState(() {
      _verifying = true;
      _error = null;
    });
    final ok = await ref
        .read(authStateProvider.notifier)
        .verifyPin(pin);
    if (!mounted) return;
    setState(() => _verifying = false);
    if (ok) {
      widget.onUnlock();
    } else {
      setState(() => _error = 'Mauvais code, réessaie.');
    }
  }

  @override
  Widget build(BuildContext context) {
    return OriginScaffold(
      backgroundColor: OriginColors.sand,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(OriginSpacing.lg),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: <Widget>[
              Icon(
                Icons.lock_outline,
                size: 56,
                color: OriginColors.deepBlue.withValues(alpha: 0.6),
              ),
              const SizedBox(height: OriginSpacing.md),
              Text(
                'Tape ton code',
                style: OriginTextStyles.sectionTitle.copyWith(
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: OriginSpacing.sm),
              Text(
                'Pour protéger l\'histoire de ta famille.',
                textAlign: TextAlign.center,
                style: OriginTextStyles.body.copyWith(
                  color: OriginColors.textSecondary,
                ),
              ),
              const SizedBox(height: OriginSpacing.xl),
              OriginPinInput(
                length: 4,
                onChanged: (_) {
                  if (_error != null) setState(() => _error = null);
                },
                onCompleted: _verify,
                errorText: _error,
                enabled: !_verifying,
              ),
              if (_verifying) ...<Widget>[
                const SizedBox(height: OriginSpacing.md),
                const SizedBox(
                  height: 20,
                  width: 20,
                  child: CircularProgressIndicator(strokeWidth: 2.5),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
