import 'package:flutter/material.dart';
import 'package:origin_mobile/core/theme/origin_colors.dart';
import 'package:origin_mobile/core/theme/origin_text_styles.dart';
import 'package:origin_mobile/data/models/enums.dart';
import 'package:origin_mobile/shared/widgets/m_chip.dart';
import 'package:origin_mobile/shared/widgets/person_avatar.dart';

/// A populated node in the tree — avatar, name, optional dates and "toi" chip.
class TreeNode extends StatefulWidget {
  const TreeNode({
    super.key,
    required this.displayName,
    this.photoUrl,
    this.lifeStatus = LifeStatus.unknown,
    this.yearsLabel,
    this.isSelf = false,
    this.onTap,
  });

  final String displayName;
  final String? photoUrl;
  final LifeStatus lifeStatus;
  final String? yearsLabel;
  final bool isSelf;
  final VoidCallback? onTap;

  @override
  State<TreeNode> createState() => _TreeNodeState();
}

class _TreeNodeState extends State<TreeNode>
    with SingleTickerProviderStateMixin {
  late final AnimationController _pulse;

  @override
  void initState() {
    super.initState();
    _pulse = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 3000),
    );
    if (widget.isSelf) _pulse.repeat(reverse: true);
  }

  @override
  void dispose() {
    _pulse.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(40),
      onTap: widget.onTap,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          AnimatedBuilder(
            animation: _pulse,
            builder: (context, _) {
              final size = widget.isSelf ? 50.0 : 44.0;
              final ringColor = widget.isSelf
                  ? OriginColors.forestGreen
                      .withValues(alpha: 0.4 + 0.4 * _pulse.value)
                  : Colors.transparent;
              return Container(
                padding: EdgeInsets.all(widget.isSelf ? 3 : 0),
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(color: ringColor, width: 2),
                ),
                child: PersonAvatar(
                  photoUrl: widget.photoUrl,
                  displayName: widget.displayName,
                  size: size,
                  lifeStatus: widget.lifeStatus,
                ),
              );
            },
          ),
          const SizedBox(height: 4),
          SizedBox(
            width: 80,
            child: Text(
              widget.displayName,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              textAlign: TextAlign.center,
              style: OriginTextStyles.micro.copyWith(
                fontWeight: FontWeight.w600,
                color: OriginColors.charcoal,
              ),
            ),
          ),
          if (widget.yearsLabel != null) ...<Widget>[
            Text(
              widget.yearsLabel!,
              style: OriginTextStyles.micro.copyWith(
                color: OriginColors.textMuted,
                fontFeatures: const <FontFeature>[
                  FontFeature.tabularFigures(),
                ],
              ),
            ),
          ],
          if (widget.isSelf) ...<Widget>[
            const SizedBox(height: 2),
            const MChip(
              label: 'toi',
              dense: true,
              background: OriginColors.forestGreen,
              foreground: OriginColors.offWhite,
            ),
          ],
        ],
      ),
    );
  }
}
