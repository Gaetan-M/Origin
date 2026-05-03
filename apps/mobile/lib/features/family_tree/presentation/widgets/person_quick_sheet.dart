import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:origin_mobile/core/routing/route_paths.dart';
import 'package:origin_mobile/core/theme/origin_spacing.dart';
import 'package:origin_mobile/core/theme/origin_text_styles.dart';
import 'package:origin_mobile/data/models/person.dart';
import 'package:origin_mobile/shared/widgets/origin_bottom_sheet.dart';
import 'package:origin_mobile/shared/widgets/person_avatar.dart';

/// Quick-action sheet shown when the user taps a node in the tree.
class PersonQuickSheet {
  static Future<void> show(BuildContext context, Person person) {
    return OriginBottomSheet.show<void>(
      context: context,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: OriginSpacing.md),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            PersonAvatar(
              photoUrl: person.photoUrl,
              displayName: person.displayName,
              size: 64,
              lifeStatus: person.lifeStatus,
            ),
            const SizedBox(height: OriginSpacing.sm),
            Text(
              person.displayName,
              style: OriginTextStyles.sectionTitle
                  .copyWith(fontWeight: FontWeight.w700),
            ),
          ],
        ),
      ),
      actions: <OriginBottomSheetAction>[
        OriginBottomSheetAction(
          icon: Icons.person_outline,
          label: 'Voir le profil',
          onTap: () async => context.push(RoutePaths.personDetail(person.id)),
        ),
        OriginBottomSheetAction(
          icon: Icons.edit_outlined,
          label: 'Modifier',
          onTap: () async => context.push(RoutePaths.personEdit(person.id)),
        ),
        OriginBottomSheetAction(
          icon: Icons.add_link,
          label: 'Ajouter un lien',
          onTap: () async {},
        ),
      ],
    );
  }
}
