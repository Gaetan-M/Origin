import 'package:flutter/material.dart';

import 'package:origin_mobile/core/theme/origin_colors.dart';
import 'package:origin_mobile/core/theme/origin_radius.dart';
import 'package:origin_mobile/core/theme/origin_spacing.dart';
import 'package:origin_mobile/core/theme/origin_text_styles.dart';
import 'package:origin_mobile/features/memory/domain/visibility_scope.dart';
import 'package:origin_mobile/features/memory/presentation/i18n/memory_strings.dart';

/// Three-up segmented control for choosing a [MemoryVisibilityScope].
/// Mirrors the web `VisibilitySelect`.
class VisibilitySelector extends StatelessWidget {
  const VisibilitySelector({
    super.key,
    required this.value,
    required this.onChanged,
    this.showLabel = true,
  });

  final MemoryVisibilityScope value;
  final ValueChanged<MemoryVisibilityScope> onChanged;
  final bool showLabel;

  static const List<MemoryVisibilityScope> _options = <MemoryVisibilityScope>[
    MemoryVisibilityScope.privateSelf,
    MemoryVisibilityScope.family,
    MemoryVisibilityScope.public,
  ];

  IconData _iconFor(MemoryVisibilityScope scope) {
    switch (scope) {
      case MemoryVisibilityScope.privateSelf:
        return Icons.lock_outline;
      case MemoryVisibilityScope.family:
        return Icons.groups_2_outlined;
      case MemoryVisibilityScope.public:
        return Icons.public;
    }
  }

  @override
  Widget build(BuildContext context) {
    final strings = MemoryStrings.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        if (showLabel) ...<Widget>[
          Text(
            strings.visibilityLabel,
            style: OriginTextStyles.bodyMedium
                .copyWith(fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: OriginSpacing.sm),
        ],
        Row(
          children: <Widget>[
            for (final scope in _options) ...<Widget>[
              Expanded(
                child: _Option(
                  icon: _iconFor(scope),
                  label: strings.visibility(scope),
                  active: value == scope,
                  onTap: () => onChanged(scope),
                ),
              ),
              if (scope != _options.last)
                const SizedBox(width: OriginSpacing.sm),
            ],
          ],
        ),
      ],
    );
  }
}

class _Option extends StatelessWidget {
  const _Option({
    required this.icon,
    required this.label,
    required this.active,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final color =
        active ? OriginColors.forestGreen : OriginColors.textSecondary;
    return InkWell(
      borderRadius: BorderRadius.circular(OriginRadius.md),
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(
          horizontal: OriginSpacing.sm,
          vertical: OriginSpacing.md,
        ),
        decoration: BoxDecoration(
          color: active
              ? OriginColors.forestGreen50
              : OriginColors.offWhite,
          borderRadius: BorderRadius.circular(OriginRadius.md),
          border: Border.all(
            color: active ? OriginColors.forestGreen : OriginColors.border,
            width: active ? 1.5 : 1,
          ),
        ),
        child: Column(
          children: <Widget>[
            Icon(icon, size: 18, color: color),
            const SizedBox(height: 6),
            Text(
              label,
              textAlign: TextAlign.center,
              style: OriginTextStyles.micro.copyWith(
                color: color,
                fontWeight: active ? FontWeight.w700 : FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
