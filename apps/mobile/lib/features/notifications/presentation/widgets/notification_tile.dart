import 'package:flutter/material.dart';
import 'package:origin_mobile/core/theme/origin_colors.dart';
import 'package:origin_mobile/core/theme/origin_radius.dart';
import 'package:origin_mobile/core/theme/origin_text_styles.dart';

/// Single notification row.
class NotificationTile extends StatelessWidget {
  const NotificationTile({
    super.key,
    required this.title,
    required this.subtitle,
    required this.time,
    this.icon = Icons.notifications_none,
    this.unread = false,
    this.onTap,
  });

  final String title;
  final String subtitle;
  final String time;
  final IconData icon;
  final bool unread;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: unread
          ? OriginColors.terracotta.withValues(alpha: 0.05)
          : OriginColors.offWhite,
      borderRadius: BorderRadius.circular(OriginRadius.lg),
      child: InkWell(
        borderRadius: BorderRadius.circular(OriginRadius.lg),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: OriginColors.terracotta.withValues(alpha: 0.12),
                  shape: BoxShape.circle,
                ),
                child: Icon(icon, color: OriginColors.terracotta, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text(
                      title,
                      style: OriginTextStyles.bodyMedium.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(subtitle, style: OriginTextStyles.caption),
                    const SizedBox(height: 4),
                    Text(
                      time,
                      style: OriginTextStyles.micro.copyWith(
                        color: OriginColors.textMuted,
                      ),
                    ),
                  ],
                ),
              ),
              if (unread)
                Container(
                  width: 8,
                  height: 8,
                  decoration: const BoxDecoration(
                    color: OriginColors.terracotta,
                    shape: BoxShape.circle,
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
