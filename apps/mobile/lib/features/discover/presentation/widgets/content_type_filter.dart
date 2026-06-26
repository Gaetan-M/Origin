import 'package:flutter/material.dart';

import 'package:origin_mobile/core/theme/origin_colors.dart';
import 'package:origin_mobile/core/theme/origin_radius.dart';
import 'package:origin_mobile/core/theme/origin_spacing.dart';
import 'package:origin_mobile/core/theme/origin_text_styles.dart';
import 'package:origin_mobile/features/discover/domain/cultural_enums.dart';
import 'package:origin_mobile/features/discover/presentation/i18n/discover_strings.dart';

/// Horizontally-scrollable, low-data facet chips for the discovery feed.
class ContentTypeFilter extends StatelessWidget {
  const ContentTypeFilter({
    super.key,
    required this.value,
    required this.onChanged,
    required this.strings,
  });

  final CulturalContentType? value;
  final ValueChanged<CulturalContentType?> onChanged;
  final DiscoverStrings strings;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 40,
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: OriginSpacing.md),
        children: <Widget>[
          _Chip(
            label: strings.filterAll,
            active: value == null,
            onTap: () => onChanged(null),
          ),
          for (final type in kCulturalContentTypes)
            _Chip(
              label: strings.contentTypeLabel(type),
              active: value == type,
              onTap: () => onChanged(type),
            ),
        ],
      ),
    );
  }
}

class _Chip extends StatelessWidget {
  const _Chip({
    required this.label,
    required this.active,
    required this.onTap,
  });

  final String label;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(right: OriginSpacing.sm),
      child: Semantics(
        button: true,
        selected: active,
        label: label,
        child: Material(
          color: active ? OriginColors.deepBlue : OriginColors.offWhite,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(OriginRadius.full),
            side: BorderSide(
              color: active ? OriginColors.deepBlue : OriginColors.border,
            ),
          ),
          child: InkWell(
            borderRadius: BorderRadius.circular(OriginRadius.full),
            onTap: onTap,
            child: Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: OriginSpacing.md,
                vertical: OriginSpacing.sm,
              ),
              child: Center(
                child: Text(
                  label,
                  style: OriginTextStyles.caption.copyWith(
                    color:
                        active ? OriginColors.offWhite : OriginColors.textSecondary,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
