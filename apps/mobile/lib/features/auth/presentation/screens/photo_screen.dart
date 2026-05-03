import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';

import 'package:origin_mobile/core/routing/route_paths.dart';
import 'package:origin_mobile/core/theme/origin_colors.dart';
import 'package:origin_mobile/core/theme/origin_spacing.dart';
import 'package:origin_mobile/core/theme/origin_text_styles.dart';
import 'package:origin_mobile/features/auth/presentation/providers/onboarding_progress_provider.dart';
import 'package:origin_mobile/shared/widgets/origin_bottom_sheet.dart';
import 'package:origin_mobile/shared/widgets/origin_button.dart';
import 'package:origin_mobile/shared/widgets/origin_scaffold.dart';

class AuthPhotoScreen extends ConsumerStatefulWidget {
  const AuthPhotoScreen({super.key});

  @override
  ConsumerState<AuthPhotoScreen> createState() => _AuthPhotoScreenState();
}

class _AuthPhotoScreenState extends ConsumerState<AuthPhotoScreen> {
  final ImagePicker _picker = ImagePicker();

  Future<void> _pick(ImageSource source) async {
    final file = await _picker.pickImage(
      source: source,
      maxWidth: 1920,
      imageQuality: 82,
    );
    if (file == null) return;
    await ref.read(onboardingProgressProvider.notifier).setPhotoPath(file.path);
  }

  void _openSheet() {
    OriginBottomSheet.show<void>(
      context: context,
      title: 'Ajouter ta photo',
      actions: <OriginBottomSheetAction>[
        OriginBottomSheetAction(
          icon: Icons.photo_camera_outlined,
          label: 'Prendre une photo',
          onTap: () => _pick(ImageSource.camera),
        ),
        OriginBottomSheetAction(
          icon: Icons.photo_library_outlined,
          label: 'Choisir dans la galerie',
          onTap: () => _pick(ImageSource.gallery),
        ),
      ],
    );
  }

  void _next() => context.push(RoutePaths.authParents);

  @override
  Widget build(BuildContext context) {
    final photoPath = ref.watch(
      onboardingProgressProvider.select((s) => s.photoPath),
    );

    return OriginScaffold(
      backgroundColor: OriginColors.sand,
      appBar: AppBar(
        backgroundColor: OriginColors.sand,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: OriginColors.charcoal),
          onPressed: () => context.pop(),
        ),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(
            horizontal: OriginSpacing.lg,
            vertical: OriginSpacing.md,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: <Widget>[
              Text(
                'ÉTAPE 2 SUR 3 · LA GRAINE',
                style: OriginTextStyles.micro.copyWith(
                  color: OriginColors.ochreDark,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 1.2,
                ),
              ),
              const SizedBox(height: OriginSpacing.sm),
              Text(
                'Mets une photo de toi',
                style: OriginTextStyles.hero.copyWith(
                  fontSize: 28,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: OriginSpacing.sm),
              Text(
                'Tes proches te reconnaîtront plus vite. C\'est facultatif.',
                style: OriginTextStyles.body
                    .copyWith(color: OriginColors.textSecondary),
              ),
              const SizedBox(height: OriginSpacing.xxl),
              Center(
                child: GestureDetector(
                  onTap: _openSheet,
                  child: Container(
                    width: 160,
                    height: 160,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: OriginColors.offWhite,
                      border: Border.all(
                        color: OriginColors.border,
                        width: 2,
                      ),
                    ),
                    child: ClipOval(
                      child: photoPath == null
                          ? const Center(
                              child: Icon(
                                Icons.add_a_photo_outlined,
                                size: 36,
                                color: OriginColors.textMuted,
                              ),
                            )
                          : Image.file(
                              File(photoPath),
                              fit: BoxFit.cover,
                              width: 160,
                              height: 160,
                            ),
                    ),
                  ),
                ),
              ),
              const Spacer(),
              if (photoPath != null)
                OriginButton.primary(label: 'Continuer', onPressed: _next)
              else
                OriginButton.primary(
                  label: 'Choisir ma photo',
                  onPressed: _openSheet,
                ),
              const SizedBox(height: OriginSpacing.sm),
              Center(
                child: TextButton(
                  onPressed: _next,
                  child: const Text(
                    'Je mettrai plus tard',
                    style: TextStyle(
                      color: OriginColors.deepBlue,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
