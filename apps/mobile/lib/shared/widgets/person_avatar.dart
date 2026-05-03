import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:origin_mobile/core/theme/origin_colors.dart';
import 'package:origin_mobile/data/models/enums.dart';

/// Circular avatar with optional life-status dot on the bottom-right.
class PersonAvatar extends StatelessWidget {
  const PersonAvatar({
    super.key,
    this.photoUrl,
    this.displayName,
    this.size = 40,
    this.lifeStatus,
    this.showStatusDot = true,
    this.borderColor,
    this.borderWidth = 0,
  });

  final String? photoUrl;
  final String? displayName;
  final double size;
  final LifeStatus? lifeStatus;
  final bool showStatusDot;
  final Color? borderColor;
  final double borderWidth;

  @override
  Widget build(BuildContext context) {
    final initials = _initialsFor(displayName ?? '');
    final bg = OriginColors.avatarColorFor(displayName ?? '?');
    final isDeceased = lifeStatus == LifeStatus.deceased;

    Widget content = ClipOval(
      child: Container(
        width: size,
        height: size,
        color: bg.withValues(alpha: 0.18),
        alignment: Alignment.center,
        child: photoUrl != null && photoUrl!.isNotEmpty
            ? CachedNetworkImage(
                imageUrl: photoUrl!,
                width: size,
                height: size,
                fit: BoxFit.cover,
                errorWidget: (_, __, ___) => _Initials(
                  initials: initials,
                  color: bg,
                  size: size,
                ),
                placeholder: (_, __) => _Initials(
                  initials: initials,
                  color: bg,
                  size: size,
                ),
              )
            : _Initials(initials: initials, color: bg, size: size),
      ),
    );

    if (isDeceased) {
      content = ColorFiltered(
        colorFilter: const ColorFilter.matrix(<double>[
          0.4, 0.4, 0.4, 0, 0,
          0.4, 0.4, 0.4, 0, 0,
          0.4, 0.4, 0.4, 0, 0,
          0,   0,   0,   1, 0,
        ]),
        child: content,
      );
    }

    if (borderWidth > 0 || (borderColor != null)) {
      content = Container(
        padding: EdgeInsets.all(borderWidth),
        decoration: BoxDecoration(
          color: borderColor ?? Colors.white,
          shape: BoxShape.circle,
        ),
        child: content,
      );
    }

    if (!showStatusDot || lifeStatus == null) {
      return SizedBox(width: size, height: size, child: content);
    }

    final dotSize = (size * 0.22).clamp(6.0, 16.0);
    final dotColor = _statusColor(lifeStatus!);

    return SizedBox(
      width: size,
      height: size,
      child: Stack(
        clipBehavior: Clip.none,
        children: <Widget>[
          content,
          Positioned(
            right: 0,
            bottom: 0,
            child: Container(
              width: dotSize,
              height: dotSize,
              decoration: BoxDecoration(
                color: dotColor,
                shape: BoxShape.circle,
                border: Border.all(color: Colors.white, width: 2),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Color _statusColor(LifeStatus s) {
    switch (s) {
      case LifeStatus.alive:
        return OriginColors.forestGreen;
      case LifeStatus.deceased:
        return OriginColors.charcoal;
      case LifeStatus.unknown:
        return const Color(0xFFBBBBBB);
    }
  }

  String _initialsFor(String name) {
    final parts =
        name.trim().split(RegExp(r'\s+')).where((p) => p.isNotEmpty).toList();
    if (parts.isEmpty) return '?';
    if (parts.length == 1) {
      return parts.first.characters.first.toUpperCase();
    }
    return '${parts.first.characters.first}${parts.last.characters.first}'
        .toUpperCase();
  }
}

class _Initials extends StatelessWidget {
  const _Initials({
    required this.initials,
    required this.color,
    required this.size,
  });

  final String initials;
  final Color color;
  final double size;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      color: color.withValues(alpha: 0.18),
      alignment: Alignment.center,
      child: Text(
        initials,
        style: TextStyle(
          fontSize: size * 0.40,
          color: color,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}
