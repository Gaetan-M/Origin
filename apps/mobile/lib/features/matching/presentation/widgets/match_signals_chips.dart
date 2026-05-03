import 'package:flutter/material.dart';
import 'package:origin_mobile/shared/widgets/m_chip.dart';

/// Pills surfacing the signals (name, dates, village…) used by the matcher.
class MatchSignalsChips extends StatelessWidget {
  const MatchSignalsChips({super.key, required this.signals});

  final List<String> signals;

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 6,
      runSpacing: 6,
      children: <Widget>[
        for (final s in signals) MChip(label: s),
      ],
    );
  }
}
