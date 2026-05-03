import 'dart:async';

import 'package:flutter/material.dart';
import 'package:origin_mobile/core/theme/origin_colors.dart';
import 'package:origin_mobile/core/theme/origin_radius.dart';
import 'package:origin_mobile/core/theme/origin_spacing.dart';
import 'package:origin_mobile/core/theme/origin_text_styles.dart';

/// Single tappable action inside an [OriginBottomSheet].
class OriginBottomSheetAction {
  const OriginBottomSheetAction({
    required this.label,
    required this.onTap,
    this.icon,
    this.destructive = false,
    this.subtitle,
  });

  final String label;
  final IconData? icon;
  final FutureOr<void> Function() onTap;
  final bool destructive;
  final String? subtitle;
}

/// Standardised bottom sheet — title + optional subtitle + actions list.
class OriginBottomSheet extends StatelessWidget {
  const OriginBottomSheet({
    super.key,
    this.title,
    this.subtitle,
    required this.actions,
    this.child,
  });

  final String? title;
  final String? subtitle;
  final List<OriginBottomSheetAction> actions;
  final Widget? child;

  static Future<T?> show<T>({
    required BuildContext context,
    String? title,
    String? subtitle,
    List<OriginBottomSheetAction> actions = const [],
    Widget? child,
  }) {
    return showModalBottomSheet<T>(
      context: context,
      backgroundColor: OriginColors.offWhite,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(
          top: Radius.circular(OriginRadius.xl),
        ),
      ),
      builder: (ctx) => OriginBottomSheet(
        title: title,
        subtitle: subtitle,
        actions: actions,
        child: child,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
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
            if (title != null) ...<Widget>[
              Text(
                title!,
                style: OriginTextStyles.sectionTitle.copyWith(
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: OriginSpacing.xs),
            ],
            if (subtitle != null) ...<Widget>[
              Text(subtitle!, style: OriginTextStyles.body),
              const SizedBox(height: OriginSpacing.md),
            ],
            if (child != null) ...<Widget>[
              child!,
              const SizedBox(height: OriginSpacing.md),
            ],
            for (final action in actions)
              _SheetTile(action: action),
          ],
        ),
      ),
    );
  }
}

class _SheetTile extends StatelessWidget {
  const _SheetTile({required this.action});

  final OriginBottomSheetAction action;

  @override
  Widget build(BuildContext context) {
    final color = action.destructive
        ? OriginColors.error
        : OriginColors.charcoal;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: InkWell(
        borderRadius: BorderRadius.circular(OriginRadius.md),
        onTap: () async {
          Navigator.of(context).maybePop();
          await action.onTap();
        },
        child: Container(
          padding: const EdgeInsets.symmetric(
            horizontal: OriginSpacing.md,
            vertical: OriginSpacing.md,
          ),
          decoration: BoxDecoration(
            color: OriginColors.sand,
            borderRadius: BorderRadius.circular(OriginRadius.md),
          ),
          constraints: const BoxConstraints(minHeight: 56),
          child: Row(
            children: <Widget>[
              if (action.icon != null) ...<Widget>[
                Icon(action.icon, color: color, size: 22),
                const SizedBox(width: OriginSpacing.md),
              ],
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: <Widget>[
                    Text(
                      action.label,
                      style: OriginTextStyles.bodyMedium
                          .copyWith(color: color, fontWeight: FontWeight.w600),
                    ),
                    if (action.subtitle != null) ...<Widget>[
                      const SizedBox(height: 2),
                      Text(
                        action.subtitle!,
                        style: OriginTextStyles.caption,
                      ),
                    ],
                  ],
                ),
              ),
              const Icon(
                Icons.chevron_right,
                color: OriginColors.textMuted,
                size: 18,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

