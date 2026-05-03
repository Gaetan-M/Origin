import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:origin_mobile/core/theme/origin_colors.dart';

/// Decorative kente-inspired bar.
///
/// Renders a 4-6 px tall horizontal stripe whose pattern repeats using a
/// 115 deg linear gradient cycling
/// `forestGreen -> ochre -> terracotta -> deepBlue` (4 px each).
///
/// Used at the top of hero cards, below AppBars on hero screens, and at the
/// edges of full-screen onboarding takeovers.
class KenteBar extends StatelessWidget {
  const KenteBar({super.key, this.height = 4});

  final double height;

  @override
  Widget build(BuildContext context) {
    return RepaintBoundary(
      child: SizedBox(
        height: height,
        width: double.infinity,
        child: CustomPaint(
          painter: const _KentePainter(),
        ),
      ),
    );
  }
}

class _KentePainter extends CustomPainter {
  const _KentePainter();

  @override
  void paint(Canvas canvas, Size size) {
    const stripe = 4.0;
    const palette = <Color>[
      OriginColors.forestGreen,
      OriginColors.ochre,
      OriginColors.terracotta,
      OriginColors.deepBlue,
    ];
    final paint = Paint()..style = PaintingStyle.fill;
    final radians = -25 * math.pi / 180;
    canvas.save();
    canvas.translate(0, size.height / 2);
    canvas.rotate(radians);
    canvas.translate(-size.width, -size.height);
    final totalWidth = size.width * 3;
    var i = 0;
    for (var x = 0.0; x < totalWidth; x += stripe) {
      paint.color = palette[i % palette.length];
      canvas.drawRect(
        Rect.fromLTWH(x, 0, stripe + 0.5, size.height * 3),
        paint,
      );
      i++;
    }
    canvas.restore();
  }

  @override
  bool shouldRepaint(covariant _KentePainter oldDelegate) => false;
}
