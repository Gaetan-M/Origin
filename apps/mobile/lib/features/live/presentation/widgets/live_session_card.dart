import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import 'package:origin_mobile/core/theme/origin_colors.dart';
import 'package:origin_mobile/core/theme/origin_radius.dart';
import 'package:origin_mobile/core/theme/origin_spacing.dart';
import 'package:origin_mobile/core/theme/origin_text_styles.dart';
import 'package:origin_mobile/features/live/domain/live_session.dart';
import 'package:origin_mobile/features/live/presentation/i18n/live_strings.dart';
import 'package:origin_mobile/shared/widgets/m_chip.dart';

/// A single live-session row on the lives list. Mirrors the web
/// `LiveSessionCard`: a LIVE badge + kind chip, title, host, schedule/
/// participant meta, and a Join / Watch-replay affordance.
class LiveSessionCard extends StatelessWidget {
  const LiveSessionCard({
    super.key,
    required this.session,
    required this.onTap,
  });

  final LiveSession session;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final strings = LiveStrings.of(context);
    final isLive = session.isLive;
    final hasReplay = session.hasReplay;
    final locale = Localizations.localeOf(context).toString();

    final when = session.scheduledAt != null
        ? DateFormat.yMMMd(locale)
            .add_jm()
            .format(session.scheduledAt!.toLocal())
        : null;

    return Material(
      color: OriginColors.offWhite,
      borderRadius: BorderRadius.circular(OriginRadius.lg),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(OriginRadius.lg),
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(OriginRadius.lg),
            border: Border.all(
              color: isLive ? OriginColors.terracotta100 : OriginColors.border,
            ),
          ),
          padding: const EdgeInsets.all(OriginSpacing.md),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Wrap(
                      spacing: OriginSpacing.xs,
                      runSpacing: OriginSpacing.xs,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      children: <Widget>[
                        if (isLive)
                          MChip(
                            label: strings.liveBadge,
                            icon: Icons.fiber_manual_record,
                            background: OriginColors.terracotta50,
                            foreground: OriginColors.terracotta700,
                            dense: true,
                          ),
                        MChip(
                          label: strings.kindLabel(session.kind),
                          background: OriginColors.sand,
                          foreground: OriginColors.textSecondary,
                          dense: true,
                        ),
                      ],
                    ),
                    const SizedBox(height: OriginSpacing.sm),
                    Text(
                      session.title,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: OriginTextStyles.bodyLarge.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    if (session.hostDisplayName != null &&
                        session.hostDisplayName!.isNotEmpty) ...<Widget>[
                      const SizedBox(height: 2),
                      Text(
                        '${strings.hostedBy} ${session.hostDisplayName}',
                        style: OriginTextStyles.caption
                            .copyWith(color: OriginColors.textMuted),
                      ),
                    ],
                    if (when != null && !isLive) ...<Widget>[
                      const SizedBox(height: OriginSpacing.sm),
                      _MetaRow(
                        icon: Icons.event_outlined,
                        label: '${strings.scheduledFor} $when',
                      ),
                    ],
                    if (session.participantCount > 0) ...<Widget>[
                      const SizedBox(height: 4),
                      _MetaRow(
                        icon: Icons.people_alt_outlined,
                        label: '${session.participantCount}',
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(width: OriginSpacing.sm),
              _Action(
                isLive: isLive,
                hasReplay: hasReplay,
                joinLabel: strings.join,
                replayLabel: strings.watchReplay,
                onTap: onTap,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _MetaRow extends StatelessWidget {
  const _MetaRow({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: <Widget>[
        Icon(icon, size: 14, color: OriginColors.textMuted),
        const SizedBox(width: OriginSpacing.xs),
        Flexible(
          child: Text(
            label,
            style: OriginTextStyles.caption
                .copyWith(color: OriginColors.textMuted),
          ),
        ),
      ],
    );
  }
}

/// Compact trailing affordance — only shows when there is something to do
/// (join a live, or open a published replay). Tapping anywhere on the card
/// also navigates, so this is a visual cue rather than the only target.
class _Action extends StatelessWidget {
  const _Action({
    required this.isLive,
    required this.hasReplay,
    required this.joinLabel,
    required this.replayLabel,
    required this.onTap,
  });

  final bool isLive;
  final bool hasReplay;
  final String joinLabel;
  final String replayLabel;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    if (isLive) {
      return _Pill(
        icon: Icons.sensors,
        label: joinLabel,
        background: OriginColors.terracotta,
        foreground: OriginColors.textOnPrimary,
        onTap: onTap,
      );
    }
    if (hasReplay) {
      return _Pill(
        icon: Icons.play_circle_outline,
        label: replayLabel,
        background: OriginColors.sand,
        foreground: OriginColors.textSecondary,
        onTap: onTap,
      );
    }
    return const Icon(Icons.chevron_right, color: OriginColors.textMuted);
  }
}

class _Pill extends StatelessWidget {
  const _Pill({
    required this.icon,
    required this.label,
    required this.background,
    required this.foreground,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final Color background;
  final Color foreground;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: background,
      borderRadius: BorderRadius.circular(OriginRadius.full),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(OriginRadius.full),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              Icon(icon, size: 16, color: foreground),
              const SizedBox(width: 6),
              Text(
                label,
                style: OriginTextStyles.caption.copyWith(
                  color: foreground,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
