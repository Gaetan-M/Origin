import 'dart:math' as math;

import 'package:flutter/material.dart';

/// Decorative adinkra-inspired rosette used as ambient brand decor.
///
/// Six rotational petals around a central dot, with two dashed concentric
/// rings. Render with low opacity (0.05-0.18) on hero cards corners and
/// onboarding backgrounds.
class AdinkraRosette extends StatelessWidget {
  const AdinkraRosette({
    super.key,
    this.size = 200,
    this.color = const Color(0xFF2D7A4B),
    this.opacity = 0.06,
  });

  final double size;
  final Color color;
  final double opacity;

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: Opacity(
        opacity: opacity,
        child: SizedBox(
          width: size,
          height: size,
          child: CustomPaint(painter: _AdinkraPainter(color: color)),
        ),
      ),
    );
  }
}

class _AdinkraPainter extends CustomPainter {
  _AdinkraPainter({required this.color});

  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final c = Offset(size.width / 2, size.height / 2);
    final r = size.width / 2;
    final fill = Paint()
      ..color = color
      ..style = PaintingStyle.fill;
    final stroke = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = math.max(0.6, size.width * 0.005);

    canvas.drawCircle(c, size.width * 0.03, fill);

    for (var i = 0; i < 6; i++) {
      final angle = i * math.pi / 3;
      canvas.save();
      canvas.translate(c.dx, c.dy);
      canvas.rotate(angle);
      final path = Path()
        ..moveTo(0, -r * 0.36)
        ..quadraticBezierTo(r * 0.06, -r * 0.22, 0, -r * 0.12)
        ..quadraticBezierTo(-r * 0.06, -r * 0.22, 0, -r * 0.36)
        ..close();
      canvas.drawPath(path, fill);
      canvas.restore();
    }

    _drawDashedCircle(canvas, c, r * 0.84, stroke, dash: 2, gap: 4);
    _drawDashedCircle(canvas, c, r * 0.56, stroke, dash: 1, gap: 3);
  }

  void _drawDashedCircle(
    Canvas canvas,
    Offset center,
    double radius,
    Paint paint, {
    required double dash,
    required double gap,
  }) {
    final circumference = 2 * math.pi * radius;
    final step = (dash + gap) / circumference;
    var t = 0.0;
    while (t < 2 * math.pi) {
      final start = Offset(
        center.dx + radius * math.cos(t),
        center.dy + radius * math.sin(t),
      );
      final endT = t + dash / circumference;
      final end = Offset(
        center.dx + radius * math.cos(endT),
        center.dy + radius * math.sin(endT),
      );
      canvas.drawLine(start, end, paint);
      t += step;
    }
  }

  @override
  bool shouldRepaint(covariant _AdinkraPainter oldDelegate) =>
      oldDelegate.color != color;
}
