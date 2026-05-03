import 'package:flutter/material.dart';
import 'package:origin_mobile/core/theme/origin_colors.dart';
import 'package:origin_mobile/core/theme/origin_text_styles.dart';

/// Ghost slot — dashed circle inviting the user to add a family member.
class EmptyNode extends StatelessWidget {
  const EmptyNode({super.key, this.label, this.onTap, this.size = 60});

  final String? label;
  final VoidCallback? onTap;
  final double size;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: label ?? 'Ajouter une personne',
      button: true,
      child: InkWell(
        borderRadius: BorderRadius.circular(size),
        onTap: onTap,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            CustomPaint(
              size: Size(size, size),
              painter: _DashedCirclePainter(),
              child: SizedBox(
                width: size,
                height: size,
                child: Icon(
                  Icons.add,
                  color: OriginColors.forestGreen,
                  size: size * 0.4,
                ),
              ),
            ),
            if (label != null) ...<Widget>[
              const SizedBox(height: 4),
              Text(
                label!,
                style: OriginTextStyles.micro.copyWith(
                  color: OriginColors.forestGreen,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _DashedCirclePainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final fill = Paint()
      ..color = OriginColors.forestGreen.withValues(alpha: 0.05)
      ..style = PaintingStyle.fill;
    final stroke = Paint()
      ..color = OriginColors.forestGreen.withValues(alpha: 0.5)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.5;

    final radius = size.width / 2 - 1;
    canvas.drawCircle(size.center(Offset.zero), radius, fill);

    const dashCount = 32;
    final step = 2 * 3.141592653589793 / dashCount;
    for (var i = 0; i < dashCount; i++) {
      if (i.isOdd) continue;
      final start = i * step;
      final end = (i + 1) * step;
      canvas.drawArc(
        Rect.fromCircle(center: size.center(Offset.zero), radius: radius),
        start,
        end - start,
        false,
        stroke,
      );
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
