import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:origin_mobile/core/theme/origin_colors.dart';
import 'package:origin_mobile/core/theme/origin_spacing.dart';
import 'package:origin_mobile/core/theme/origin_text_styles.dart';
import 'package:origin_mobile/shared/widgets/empty_state_view.dart';
import 'package:origin_mobile/shared/widgets/origin_scaffold.dart';

class NotificationsScreen extends ConsumerWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return OriginScaffold(
      backgroundColor: OriginColors.sand,
      appBar: AppBar(
        backgroundColor: OriginColors.sand,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
        title: Text(
          'Notifications',
          style: OriginTextStyles.sectionTitle.copyWith(
            fontWeight: FontWeight.w700,
          ),
        ),
        actions: <Widget>[
          TextButton(
            onPressed: () {},
            child: const Text(
              'Tout marquer lu',
              style: TextStyle(color: OriginColors.deepBlue),
            ),
          ),
        ],
      ),
      body: const SafeArea(
        child: Padding(
          padding: EdgeInsets.all(OriginSpacing.lg),
          child: EmptyStateView(
            icon: Icons.notifications_none,
            title: 'Pas de nouveauté',
            subtitle:
                'Tu seras prévenu·e quand quelqu\'un de ta famille fera du nouveau.',
          ),
        ),
      ),
    );
  }
}
