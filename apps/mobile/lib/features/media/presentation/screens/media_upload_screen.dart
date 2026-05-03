import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:origin_mobile/core/theme/origin_colors.dart';
import 'package:origin_mobile/core/theme/origin_spacing.dart';
import 'package:origin_mobile/core/theme/origin_text_styles.dart';
import 'package:origin_mobile/shared/widgets/origin_button.dart';
import 'package:origin_mobile/shared/widgets/origin_scaffold.dart';

class MediaUploadScreen extends ConsumerWidget {
  const MediaUploadScreen({super.key, this.personId});

  final String? personId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return OriginScaffold(
      backgroundColor: OriginColors.sand,
      appBar: AppBar(
        backgroundColor: OriginColors.sand,
        title: const Text('Ajouter une photo'),
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () => context.pop(),
        ),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(OriginSpacing.lg),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: <Widget>[
              const Spacer(),
              Center(
                child: Container(
                  width: 96,
                  height: 96,
                  decoration: BoxDecoration(
                    color: OriginColors.terracotta.withValues(alpha: 0.12),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.photo_camera_outlined,
                    color: OriginColors.terracotta,
                    size: 44,
                  ),
                ),
              ),
              const SizedBox(height: OriginSpacing.md),
              Text(
                'Choisis une photo',
                textAlign: TextAlign.center,
                style: OriginTextStyles.sectionTitle
                    .copyWith(fontWeight: FontWeight.w700),
              ),
              const Spacer(flex: 2),
              OriginButton.primary(
                label: 'Prendre une photo',
                icon: Icons.photo_camera_outlined,
                onPressed: () => context.pop(),
              ),
              const SizedBox(height: OriginSpacing.sm),
              OriginButton.secondary(
                label: 'Choisir dans la galerie',
                icon: Icons.photo_library_outlined,
                onPressed: () => context.pop(),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
