import 'package:flutter/material.dart';
import 'package:origin_mobile/core/theme/origin_colors.dart';
import 'package:origin_mobile/core/theme/origin_radius.dart';
import 'package:origin_mobile/core/theme/origin_text_styles.dart';
import 'package:origin_mobile/data/models/person.dart';
import 'package:origin_mobile/shared/widgets/person_avatar.dart';

/// Compact card showing a [Person] preview — used on lists and search results.
class PersonCard extends StatelessWidget {
  const PersonCard({super.key, required this.person, this.onTap});

  final Person person;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: OriginColors.offWhite,
      borderRadius: BorderRadius.circular(OriginRadius.lg),
      child: InkWell(
        borderRadius: BorderRadius.circular(OriginRadius.lg),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: <Widget>[
              PersonAvatar(
                photoUrl: person.photoUrl,
                displayName: person.displayName,
                lifeStatus: person.lifeStatus,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: <Widget>[
                    Text(
                      person.displayName,
                      style: OriginTextStyles.bodyMedium.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    if (person.villageOrigin != null)
                      Text(
                        person.villageOrigin!,
                        style: OriginTextStyles.caption,
                      ),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right, color: OriginColors.textMuted),
            ],
          ),
        ),
      ),
    );
  }
}
