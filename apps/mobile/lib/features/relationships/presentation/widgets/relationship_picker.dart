import 'package:flutter/material.dart';
import 'package:origin_mobile/core/theme/origin_colors.dart';
import 'package:origin_mobile/core/theme/origin_radius.dart';
import 'package:origin_mobile/core/theme/origin_text_styles.dart';

/// Quick chips to choose a relationship type.
class RelationshipPicker extends StatelessWidget {
  const RelationshipPicker({super.key, required this.onPicked, this.value});

  final ValueChanged<String> onPicked;
  final String? value;

  @override
  Widget build(BuildContext context) {
    const items = <String>[
      'parent',
      'enfant',
      'frère/sœur',
      'conjoint',
      'oncle/tante',
      'cousin',
    ];
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: <Widget>[
        for (final r in items)
          ChoiceChip(
            label: Text(r),
            selected: value == r,
            onSelected: (_) => onPicked(r),
            selectedColor: OriginColors.forestGreen50,
            labelStyle: OriginTextStyles.caption.copyWith(
              fontWeight: FontWeight.w600,
              color: value == r
                  ? OriginColors.forestGreen
                  : OriginColors.charcoal,
            ),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(OriginRadius.full),
            ),
          ),
      ],
    );
  }
}
