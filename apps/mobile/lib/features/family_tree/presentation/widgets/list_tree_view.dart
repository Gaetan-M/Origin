import 'package:flutter/material.dart';
import 'package:origin_mobile/core/theme/origin_colors.dart';
import 'package:origin_mobile/core/theme/origin_radius.dart';
import 'package:origin_mobile/core/theme/origin_spacing.dart';
import 'package:origin_mobile/core/theme/origin_text_styles.dart';
import 'package:origin_mobile/data/models/person.dart';
import 'package:origin_mobile/shared/widgets/person_avatar.dart';

/// Linear list view of the tree — quick fallback when a graph layout cannot
/// be rendered.
class ListTreeView extends StatelessWidget {
  const ListTreeView({super.key, required this.people, this.onTap});

  final List<Person> people;
  final void Function(Person)? onTap;

  @override
  Widget build(BuildContext context) {
    return ListView.separated(
      padding: const EdgeInsets.all(OriginSpacing.md),
      itemCount: people.length,
      separatorBuilder: (_, __) => const SizedBox(height: 8),
      itemBuilder: (context, index) {
        final p = people[index];
        return Material(
          color: OriginColors.offWhite,
          borderRadius: BorderRadius.circular(OriginRadius.lg),
          child: InkWell(
            borderRadius: BorderRadius.circular(OriginRadius.lg),
            onTap: onTap == null ? null : () => onTap!(p),
            child: Padding(
              padding: const EdgeInsets.all(OriginSpacing.md),
              child: Row(
                children: <Widget>[
                  PersonAvatar(
                    photoUrl: p.photoUrl,
                    displayName: p.displayName,
                    lifeStatus: p.lifeStatus,
                  ),
                  const SizedBox(width: OriginSpacing.md),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        Text(
                          p.displayName,
                          style: OriginTextStyles.bodyMedium.copyWith(
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        if (p.villageOrigin != null)
                          Text(
                            p.villageOrigin!,
                            style: OriginTextStyles.caption,
                          ),
                      ],
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
        );
      },
    );
  }
}
