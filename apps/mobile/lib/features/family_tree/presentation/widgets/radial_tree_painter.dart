import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:origin_mobile/core/theme/origin_colors.dart';

/// Paints the concentric guide rings used by the radial tree layout.
class RadialTreePainter extends CustomPainter {
  RadialTreePainter({required this.degrees});

  final int degrees;

  @override
  void paint(Canvas canvas, Size size) {
    final center = size.center(Offset.zero);
    final maxRadius = math.min(size.width, size.height) / 2 - 12;

    final ringPaint = Paint()
      ..color = OriginColors.sandDark
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1;
    for (var i = 1; i <= degrees; i++) {
      canvas.drawCircle(
        center,
        maxRadius * i / degrees,
        ringPaint,
      );
    }

    final selfPaint = Paint()..color = OriginColors.forestGreen;
    canvas.drawCircle(center, 20, selfPaint);
  }

  @override
  bool shouldRepaint(covariant RadialTreePainter oldDelegate) =>
      oldDelegate.degrees != degrees;
}
