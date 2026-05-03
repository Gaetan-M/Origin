import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:origin_mobile/core/theme/origin_colors.dart';

/// A scoped messenger so non-widget code (providers, services) can show
/// snackbars without holding a [BuildContext].
class ToastService {
  ToastService();

  final GlobalKey<ScaffoldMessengerState> _key =
      GlobalKey<ScaffoldMessengerState>();

  GlobalKey<ScaffoldMessengerState> get key => _key;

  void show(String message, {ToastTone tone = ToastTone.neutral}) {
    final messenger = _key.currentState;
    if (messenger == null) return;
    messenger
      ..clearSnackBars()
      ..showSnackBar(
        SnackBar(
          content: Text(message),
          backgroundColor: _toneColor(tone),
          behavior: SnackBarBehavior.floating,
          duration: const Duration(seconds: 3),
        ),
      );
  }

  void success(String message) => show(message, tone: ToastTone.success);
  void warning(String message) => show(message, tone: ToastTone.warning);
  void error(String message) => show(message, tone: ToastTone.error);

  Color _toneColor(ToastTone tone) {
    switch (tone) {
      case ToastTone.success:
        return OriginColors.forestGreen;
      case ToastTone.warning:
        return OriginColors.ochreDark;
      case ToastTone.error:
        return OriginColors.error;
      case ToastTone.neutral:
        return OriginColors.charcoal;
    }
  }
}

enum ToastTone { neutral, success, warning, error }

final Provider<ToastService> toastServiceProvider =
    Provider<ToastService>((ref) => ToastService());
