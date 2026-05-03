import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:origin_mobile/core/routing/route_paths.dart';
import 'package:origin_mobile/core/theme/origin_colors.dart';
import 'package:origin_mobile/core/theme/origin_radius.dart';
import 'package:origin_mobile/core/theme/origin_spacing.dart';
import 'package:origin_mobile/core/theme/origin_text_styles.dart';
import 'package:origin_mobile/data/models/enums.dart';
import 'package:origin_mobile/features/family_tree/presentation/widgets/empty_node.dart';
import 'package:origin_mobile/features/family_tree/presentation/widgets/tree_node.dart';
import 'package:origin_mobile/shared/widgets/origin_scaffold.dart';

enum _TreeLayout { vertical, horizontal, map }

class FamilyTreeScreen extends ConsumerStatefulWidget {
  const FamilyTreeScreen({super.key});

  @override
  ConsumerState<FamilyTreeScreen> createState() => _FamilyTreeScreenState();
}

class _FamilyTreeScreenState extends ConsumerState<FamilyTreeScreen> {
  _TreeLayout _layout = _TreeLayout.vertical;

  @override
  Widget build(BuildContext context) {
    return OriginScaffold(
      backgroundColor: OriginColors.sand,
      body: SafeArea(
        bottom: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            // Top bar
            Padding(
              padding: const EdgeInsets.fromLTRB(
                OriginSpacing.lg,
                OriginSpacing.md,
                OriginSpacing.lg,
                OriginSpacing.sm,
              ),
              child: Row(
                children: <Widget>[
                  Expanded(
                    child: Text(
                      "L'arbre",
                      style: OriginTextStyles.hero.copyWith(
                        fontSize: 22,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                  _RoundIconButton(
                    icon: Icons.search,
                    onTap: () => context.push(RoutePaths.homeSearch),
                  ),
                  const SizedBox(width: 8),
                  _RoundIconButton(
                    icon: Icons.tune,
                    onTap: () {},
                  ),
                ],
              ),
            ),
            // Segmented control
            Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: OriginSpacing.lg,
              ),
              child: _LayoutSegment(
                value: _layout,
                onChanged: (v) => setState(() => _layout = v),
              ),
            ),
            const SizedBox(height: OriginSpacing.md),
            // Tree canvas
            Expanded(
              child: Stack(
                children: <Widget>[
                  Positioned.fill(child: _DotsBackground()),
                  _buildTree(),
                ],
              ),
            ),
            // Bottom hint
            Padding(
              padding: const EdgeInsets.all(OriginSpacing.lg),
              child: _Hint(
                text: 'Touche un emplacement vide pour ajouter un proche — '
                    'l\'arbre grandit avec toi.',
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTree() {
    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(
        horizontal: OriginSpacing.lg,
        vertical: OriginSpacing.md,
      ),
      child: Column(
        children: <Widget>[
          // Grandparents row
          _RowSection(
            title: 'Grands-parents',
            children: <Widget>[
              EmptyNode(
                label: '+ aïeul',
                onTap: () => context.push(RoutePaths.personNew),
              ),
              EmptyNode(
                label: '+ aïeule',
                onTap: () => context.push(RoutePaths.personNew),
              ),
              EmptyNode(
                label: '+ aïeul',
                onTap: () => context.push(RoutePaths.personNew),
              ),
              EmptyNode(
                label: '+ aïeule',
                onTap: () => context.push(RoutePaths.personNew),
              ),
            ],
          ),
          const _Connector(),
          // Parents row
          _RowSection(
            title: 'Parents · Tantes · Oncles',
            children: <Widget>[
              EmptyNode(
                label: '+ papa',
                onTap: () => context.push(RoutePaths.personNew),
              ),
              EmptyNode(
                label: '+ maman',
                onTap: () => context.push(RoutePaths.personNew),
              ),
            ],
          ),
          const _Connector(),
          // Self row
          _RowSection(
            title: 'Toi · Frères/Sœurs · Conjoint',
            children: <Widget>[
              const TreeNode(
                displayName: 'Toi',
                isSelf: true,
                lifeStatus: LifeStatus.alive,
              ),
              EmptyNode(
                label: '+ frère/sœur',
                onTap: () => context.push(RoutePaths.personNew),
              ),
              EmptyNode(
                label: '+ conjoint',
                onTap: () => context.push(RoutePaths.personNew),
              ),
            ],
          ),
          const _Connector(),
          // Children row
          _RowSection(
            title: 'Enfants',
            children: <Widget>[
              EmptyNode(
                label: '+ enfant',
                onTap: () => context.push(RoutePaths.personNew),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _RoundIconButton extends StatelessWidget {
  const _RoundIconButton({required this.icon, required this.onTap});

  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: OriginColors.offWhite,
      shape: const CircleBorder(),
      child: InkWell(
        customBorder: const CircleBorder(),
        onTap: onTap,
        child: SizedBox(
          width: 40,
          height: 40,
          child: Icon(icon, color: OriginColors.charcoal, size: 20),
        ),
      ),
    );
  }
}

class _LayoutSegment extends StatelessWidget {
  const _LayoutSegment({required this.value, required this.onChanged});

  final _TreeLayout value;
  final ValueChanged<_TreeLayout> onChanged;

  @override
  Widget build(BuildContext context) {
    Widget item(_TreeLayout v, String label, IconData icon) {
      final selected = v == value;
      return Expanded(
        child: GestureDetector(
          onTap: () => onChanged(v),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 180),
            margin: const EdgeInsets.all(3),
            decoration: BoxDecoration(
              color: selected ? OriginColors.offWhite : Colors.transparent,
              borderRadius: BorderRadius.circular(OriginRadius.md),
              boxShadow: selected
                  ? <BoxShadow>[
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.06),
                        blurRadius: 6,
                        offset: const Offset(0, 1),
                      ),
                    ]
                  : null,
            ),
            padding: const EdgeInsets.symmetric(vertical: 10),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: <Widget>[
                Icon(
                  icon,
                  size: 16,
                  color: selected
                      ? OriginColors.charcoal
                      : OriginColors.textMuted,
                ),
                const SizedBox(width: 6),
                Text(
                  label,
                  style: OriginTextStyles.caption.copyWith(
                    color: selected
                        ? OriginColors.charcoal
                        : OriginColors.textMuted,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return Container(
      decoration: BoxDecoration(
        color: OriginColors.sand,
        borderRadius: BorderRadius.circular(OriginRadius.md),
      ),
      child: Row(
        children: <Widget>[
          item(_TreeLayout.vertical, 'Vertical', Icons.swap_vert),
          item(_TreeLayout.horizontal, 'Horizontal', Icons.swap_horiz),
          item(_TreeLayout.map, 'Carte', Icons.public),
        ],
      ),
    );
  }
}

class _Connector extends StatelessWidget {
  const _Connector();

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 28,
      width: 1,
      margin: const EdgeInsets.symmetric(vertical: 4),
      color: OriginColors.sandDark,
    );
  }
}

class _RowSection extends StatelessWidget {
  const _RowSection({required this.title, required this.children});

  final String title;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: <Widget>[
        Text(
          title.toUpperCase(),
          style: OriginTextStyles.micro.copyWith(
            color: OriginColors.textMuted,
            fontWeight: FontWeight.w700,
            letterSpacing: 1.2,
          ),
        ),
        const SizedBox(height: 8),
        Wrap(
          alignment: WrapAlignment.center,
          spacing: 16,
          runSpacing: 16,
          children: children,
        ),
      ],
    );
  }
}

class _Hint extends StatelessWidget {
  const _Hint({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: OriginSpacing.md,
        vertical: OriginSpacing.sm,
      ),
      decoration: BoxDecoration(
        color: OriginColors.forestGreen.withValues(alpha: 0.06),
        borderRadius: BorderRadius.circular(OriginRadius.md),
        border: Border.all(
          color: OriginColors.forestGreen.withValues(alpha: 0.3),
          style: BorderStyle.solid,
        ),
      ),
      child: Row(
        children: <Widget>[
          const Icon(
            Icons.info_outline,
            size: 18,
            color: OriginColors.forestGreen,
          ),
          const SizedBox(width: OriginSpacing.sm),
          Expanded(
            child: Text(
              text,
              style: OriginTextStyles.caption.copyWith(
                color: OriginColors.forestGreen,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _DotsBackground extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return CustomPaint(painter: _DotsPainter());
  }
}

class _DotsPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = OriginColors.forestGreen.withValues(alpha: 0.06)
      ..style = PaintingStyle.fill;
    const step = 20.0;
    for (var x = 0.0; x < size.width; x += step) {
      for (var y = 0.0; y < size.height; y += step) {
        canvas.drawCircle(Offset(x, y), 1, paint);
      }
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
