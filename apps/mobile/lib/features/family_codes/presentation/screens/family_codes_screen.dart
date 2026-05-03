import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:origin_mobile/core/theme/origin_colors.dart';
import 'package:origin_mobile/core/theme/origin_radius.dart';
import 'package:origin_mobile/core/theme/origin_spacing.dart';
import 'package:origin_mobile/core/theme/origin_text_styles.dart';
import 'package:origin_mobile/shared/widgets/adinkra_rosette.dart';
import 'package:origin_mobile/shared/widgets/origin_button.dart';
import 'package:origin_mobile/shared/widgets/origin_scaffold.dart';

class FamilyCodesScreen extends ConsumerWidget {
  const FamilyCodesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return OriginScaffold(
      backgroundColor: OriginColors.sand,
      appBar: AppBar(
        backgroundColor: OriginColors.sand,
        elevation: 0,
        title: const Text('Codes famille'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(OriginSpacing.lg),
          children: <Widget>[
            Stack(
              children: <Widget>[
                Container(
                  padding: const EdgeInsets.all(OriginSpacing.lg),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: <Color>[
                        OriginColors.forestGreen,
                        OriginColors.forestDark,
                      ],
                    ),
                    borderRadius: BorderRadius.circular(18),
                  ),
                  child: Column(
                    children: <Widget>[
                      Text(
                        'CODE DE LA FAMILLE',
                        style: OriginTextStyles.micro.copyWith(
                          color: Colors.white.withValues(alpha: 0.85),
                          fontWeight: FontWeight.w700,
                          letterSpacing: 1.2,
                        ),
                      ),
                      const SizedBox(height: OriginSpacing.md),
                      const SelectableText(
                        'MBA · 7K2',
                        style: TextStyle(
                          fontFamily: 'Courier',
                          fontSize: 36,
                          fontWeight: FontWeight.w800,
                          color: Colors.white,
                          letterSpacing: 6,
                        ),
                      ),
                      const SizedBox(height: OriginSpacing.md),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: <Widget>[
                          OriginButton(
                            label: 'Copier',
                            icon: Icons.copy,
                            expand: false,
                            onPressed: () {
                              Clipboard.setData(
                                const ClipboardData(text: 'MBA·7K2'),
                              );
                            },
                          ),
                          const SizedBox(width: 8),
                          OriginButton.secondary(
                            label: 'Partager',
                            icon: Icons.share,
                            expand: false,
                            onPressed: () {},
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const Positioned(
                  top: -10,
                  right: -10,
                  child: AdinkraRosette(
                    size: 140,
                    color: Colors.white,
                    opacity: 0.18,
                  ),
                ),
              ],
            ),
            const SizedBox(height: OriginSpacing.lg),
            Container(
              padding: const EdgeInsets.all(OriginSpacing.md),
              decoration: BoxDecoration(
                color: OriginColors.offWhite,
                borderRadius: BorderRadius.circular(OriginRadius.lg),
                border: Border.all(color: OriginColors.border),
              ),
              child: Text(
                'Aucun code créé pour l\'instant. Le code ci-dessus est ton code par défaut.',
                style: OriginTextStyles.caption,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
