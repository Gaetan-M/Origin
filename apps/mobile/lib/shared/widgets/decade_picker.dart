import 'package:flutter/material.dart';
import 'package:origin_mobile/core/theme/origin_colors.dart';
import 'package:origin_mobile/core/theme/origin_radius.dart';
import 'package:origin_mobile/core/theme/origin_spacing.dart';
import 'package:origin_mobile/core/theme/origin_text_styles.dart';

/// Bottom sheet picker that lets the user choose an approximate decade
/// (e.g. "années 70") instead of a precise year.
class DecadePicker extends StatelessWidget {
  const DecadePicker({
    super.key,
    required this.onPicked,
    this.includeUnknown = true,
  });

  final void Function(int? year) onPicked;
  final bool includeUnknown;

  static Future<int?> show(
    BuildContext context, {
    bool includeUnknown = true,
  }) {
    return showModalBottomSheet<int?>(
      context: context,
      backgroundColor: OriginColors.offWhite,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(
          top: Radius.circular(OriginRadius.xl),
        ),
      ),
      builder: (ctx) => DecadePicker(
        includeUnknown: includeUnknown,
        onPicked: (year) => Navigator.of(ctx).pop(year),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now().year;
    final decades = <(_DecadeOption, int?)>[
      (const _DecadeOption('Avant 1950'), 1940),
      (const _DecadeOption('Années 50'), 1950),
      (const _DecadeOption('Années 60'), 1960),
      (const _DecadeOption('Années 70'), 1970),
      (const _DecadeOption('Années 80'), 1980),
      (const _DecadeOption('Années 90'), 1990),
      (const _DecadeOption('Années 2000'), 2000),
      (const _DecadeOption('Années 2010'), 2010),
      (const _DecadeOption('Années 2020'), 2020),
      (_DecadeOption('Cette année ($now)'), now),
      if (includeUnknown) (const _DecadeOption('Je ne sais pas'), null),
    ];

    return SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(
          OriginSpacing.lg,
          OriginSpacing.md,
          OriginSpacing.lg,
          OriginSpacing.lg,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: OriginColors.borderStrong,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: OriginSpacing.md),
            Text(
              'À peu près quand ?',
              style: OriginTextStyles.sectionTitle
                  .copyWith(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: OriginSpacing.md),
            ...decades.map(
              (e) => Padding(
                padding: const EdgeInsets.only(bottom: 4),
                child: InkWell(
                  borderRadius: BorderRadius.circular(OriginRadius.md),
                  onTap: () => onPicked(e.$2),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: OriginSpacing.md,
                      vertical: OriginSpacing.md,
                    ),
                    decoration: BoxDecoration(
                      color: OriginColors.sand,
                      borderRadius:
                          BorderRadius.circular(OriginRadius.md),
                    ),
                    child: Row(
                      children: <Widget>[
                        Expanded(
                          child: Text(
                            e.$1.label,
                            style: OriginTextStyles.bodyMedium.copyWith(
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                        const Icon(
                          Icons.chevron_right,
                          color: OriginColors.textMuted,
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _DecadeOption {
  const _DecadeOption(this.label);
  final String label;
}
