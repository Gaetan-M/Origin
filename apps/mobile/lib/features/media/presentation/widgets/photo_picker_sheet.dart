import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import 'package:origin_mobile/shared/widgets/origin_bottom_sheet.dart';

class PhotoPickerSheet {
  static Future<XFile?> show(BuildContext context) async {
    final picker = ImagePicker();
    XFile? picked;
    await OriginBottomSheet.show<void>(
      context: context,
      title: 'Ajouter une photo',
      actions: <OriginBottomSheetAction>[
        OriginBottomSheetAction(
          icon: Icons.photo_camera_outlined,
          label: 'Prendre une photo',
          onTap: () async {
            picked = await picker.pickImage(source: ImageSource.camera);
          },
        ),
        OriginBottomSheetAction(
          icon: Icons.photo_library_outlined,
          label: 'Choisir dans la galerie',
          onTap: () async {
            picked = await picker.pickImage(source: ImageSource.gallery);
          },
        ),
      ],
    );
    return picked;
  }
}
