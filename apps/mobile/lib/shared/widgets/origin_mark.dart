import 'package:flutter/material.dart';
import 'package:origin_mobile/core/theme/origin_colors.dart';

/// Origin tree mark — used as logo across splash, onboarding, hero cards.
///
/// Composed of:
/// - 3 root paths in [OriginColors.terracottaDark]
/// - a trunk in [OriginColors.terracotta]
/// - a 5-cluster canopy mixing forest/forestLight/forestDark with ochre and
///   terracottaLight accents
/// - 3 small white silhouettes inside the canopy
///
/// When [useAsset] is true (default), this widget prefers the bundled PNG
/// `assets/images/origin-logo.png`. Setting it to false renders the painted
/// fallback that supports recoloring.
class OriginMark extends StatelessWidget {
  const OriginMark({super.key, this.size = 32, this.useAsset = true});

  final double size;
  final bool useAsset;

  @override
  Widget build(BuildContext context) {
    if (useAsset) {
      return Semantics(
        label: 'Origin',
        child: Image.asset(
          'assets/images/origin-logo.png',
          width: size,
          height: size,
          fit: BoxFit.contain,
          errorBuilder: (_, __, ___) => _Painted(size: size),
        ),
      );
    }
    return _Painted(size: size);
  }
}

class _Painted extends StatelessWidget {
  const _Painted({required this.size});

  final double size;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size * 1.2,
      child: CustomPaint(painter: const _OriginMarkPainter()),
    );
  }
}

class _OriginMarkPainter extends CustomPainter {
  const _OriginMarkPainter();

  @override
  void paint(Canvas canvas, Size size) {
    final scale = size.width / 60;
    Offset p(double x, double y) => Offset(x * scale, y * scale);

    final rootPaint = Paint()
      ..color = OriginColors.terracottaDark.withValues(alpha: 0.85)
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round
      ..strokeWidth = 1.6 * scale;
    final root1 = Path()
      ..moveTo(p(30, 50).dx, p(30, 50).dy)
      ..quadraticBezierTo(
          p(22, 56).dx, p(22, 56).dy, p(16, 64).dx, p(16, 64).dy);
    final root2 = Path()
      ..moveTo(p(30, 50).dx, p(30, 50).dy)
      ..quadraticBezierTo(
          p(38, 56).dx, p(38, 56).dy, p(44, 64).dx, p(44, 64).dy);
    final root3 = Path()
      ..moveTo(p(30, 50).dx, p(30, 50).dy)
      ..lineTo(p(30, 66).dx, p(30, 66).dy);
    canvas.drawPath(root1, rootPaint);
    canvas.drawPath(root2, rootPaint);
    canvas.drawPath(root3, rootPaint);

    final trunk = Path()
      ..moveTo(p(27, 22).dx, p(27, 22).dy)
      ..quadraticBezierTo(
          p(26, 36).dx, p(26, 36).dy, p(28, 50).dx, p(28, 50).dy)
      ..lineTo(p(32, 50).dx, p(32, 50).dy)
      ..quadraticBezierTo(
          p(34, 36).dx, p(34, 36).dy, p(33, 22).dx, p(33, 22).dy)
      ..close();
    canvas.drawPath(trunk, Paint()..color = OriginColors.terracotta);

    void circle(double x, double y, double r, Color color,
        {double opacity = 1}) {
      canvas.drawCircle(
        p(x, y),
        r * scale,
        Paint()..color = color.withValues(alpha: opacity),
      );
    }

    circle(30, 14, 9, OriginColors.forestGreen);
    circle(20, 18, 7, OriginColors.forestLight);
    circle(40, 18, 7, OriginColors.forestDark);
    circle(24, 10, 5, OriginColors.ochre, opacity: 0.85);
    circle(36, 11, 5, OriginColors.terracottaLight, opacity: 0.8);
    circle(30, 6, 4, OriginColors.forestLight);

    final white = Paint()..color = Colors.white.withValues(alpha: 0.85);
    canvas.drawCircle(p(26, 14), 1.2 * scale, white);
    canvas.drawCircle(p(34, 13), 1.2 * scale, white);
    canvas.drawCircle(p(30, 18), 1.1 * scale, white);
  }

  @override
  bool shouldRepaint(covariant _OriginMarkPainter oldDelegate) => false;
}
