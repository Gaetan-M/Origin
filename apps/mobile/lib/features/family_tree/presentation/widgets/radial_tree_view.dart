import 'package:flutter/material.dart';
import 'package:origin_mobile/features/family_tree/presentation/widgets/radial_tree_painter.dart';

/// Radial visualisation placeholder — uses [RadialTreePainter] to render the
/// concentric rings and node positions.
class RadialTreeView extends StatelessWidget {
  const RadialTreeView({super.key, this.degrees = 2});

  final int degrees;

  @override
  Widget build(BuildContext context) {
    return InteractiveViewer(
      minScale: 0.5,
      maxScale: 3,
      child: SizedBox(
        width: double.infinity,
        height: double.infinity,
        child: CustomPaint(painter: RadialTreePainter(degrees: degrees)),
      ),
    );
  }
}
