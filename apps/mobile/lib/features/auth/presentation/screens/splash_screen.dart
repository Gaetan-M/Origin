import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:origin_mobile/core/theme/origin_colors.dart';
import 'package:origin_mobile/core/theme/origin_spacing.dart';
import 'package:origin_mobile/features/auth/presentation/providers/auth_state_provider.dart';
import 'package:origin_mobile/shared/widgets/origin_mark.dart';

/// Initial screen shown while the app figures out whether the user is
/// authenticated. The router (Agent 1) handles redirection once
/// [authStateProvider] resolves; we just paint a calm splash with the Origin
/// mark animating in (`bloom` + `float-y`) and an offline retry hint after 5s.
class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});

  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen>
    with TickerProviderStateMixin {
  late final AnimationController _bloomController;
  late final AnimationController _floatController;
  bool _showRetry = false;

  @override
  void initState() {
    super.initState();
    _bloomController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1100),
    )..forward();
    _floatController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 4200),
    )..repeat(reverse: true);

    Future<void>.delayed(const Duration(seconds: 5), () {
      if (!mounted) return;
      final auth = ref.read(authStateProvider);
      if (auth.isLoading) {
        setState(() => _showRetry = true);
      }
    });
  }

  @override
  void dispose() {
    _bloomController.dispose();
    _floatController.dispose();
    super.dispose();
  }

  void _retry() {
    setState(() => _showRetry = false);
    ref.invalidate(authStateProvider);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: OriginColors.sand,
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: OriginSpacing.lg),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: <Widget>[
                ScaleTransition(
                  scale: CurvedAnimation(
                    parent: _bloomController,
                    curve: Curves.easeOutBack,
                  ),
                  child: AnimatedBuilder(
                    animation: _floatController,
                    builder: (context, child) {
                      final dy = -6 * (_floatController.value - 0.5);
                      return Transform.translate(
                        offset: Offset(0, dy),
                        child: child,
                      );
                    },
                    child: const OriginMark(size: 96),
                  ),
                ),
                const SizedBox(height: OriginSpacing.lg),
                FadeTransition(
                  opacity: _bloomController,
                  child: const Text(
                    'Origin',
                    style: TextStyle(
                      fontSize: 32,
                      fontWeight: FontWeight.w800,
                      color: OriginColors.charcoal,
                      letterSpacing: -0.5,
                    ),
                  ),
                ),
                const SizedBox(height: OriginSpacing.xxl),
                if (_showRetry) ...<Widget>[
                  const Text(
                    'Ça met du temps à charger…',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: OriginColors.textSecondary,
                      fontSize: 16,
                    ),
                  ),
                  const SizedBox(height: OriginSpacing.md),
                  TextButton(
                    onPressed: _retry,
                    child: const Text('Réessayer'),
                  ),
                ] else
                  const SizedBox(
                    width: 24,
                    height: 24,
                    child: CircularProgressIndicator(
                      strokeWidth: 2.5,
                      valueColor: AlwaysStoppedAnimation<Color>(
                        OriginColors.deepBlue,
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
