import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import 'package:origin_mobile/core/theme/origin_colors.dart';
import 'package:origin_mobile/core/theme/origin_radius.dart';
import 'package:origin_mobile/core/theme/origin_spacing.dart';
import 'package:origin_mobile/core/theme/origin_text_styles.dart';
import 'package:origin_mobile/features/live/domain/live_enums.dart';
import 'package:origin_mobile/features/live/presentation/i18n/live_strings.dart';
import 'package:origin_mobile/features/live/presentation/providers/live_providers.dart';
import 'package:origin_mobile/shared/widgets/loading_view.dart';
import 'package:origin_mobile/shared/widgets/origin_button.dart';

/// Systematic REPLAY of an ended live. Audio-first. The native audio/video
/// players are not wired yet, so this is a graceful stub: it confirms the
/// replay kind and offers to open the short-lived playback URL in the system
/// player / browser. Falls back calmly when the replay is still being prepared.
class LiveReplayView extends ConsumerWidget {
  const LiveReplayView({
    super.key,
    required this.sessionId,
    required this.published,
  });

  final String sessionId;

  /// Whether the session has a published replay to attempt loading.
  final bool published;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final strings = LiveStrings.of(context);

    if (!published) {
      return _ReplayNotice(text: strings.replayPreparing);
    }

    final replay = ref.watch(liveReplayProvider(sessionId));

    return replay.when(
      loading: () => const SizedBox(
        height: 200,
        child: LoadingView(),
      ),
      error: (_, __) => _ReplayNotice(text: strings.replayUnavailable),
      data: (data) {
        if (!data.hasUrl) {
          return _ReplayNotice(text: strings.replayUnavailable);
        }
        final isAudio = data.mediaKind == LiveReplayMediaKind.audio;
        return Container(
          width: double.infinity,
          decoration: BoxDecoration(
            color: OriginColors.sand,
            borderRadius: BorderRadius.circular(OriginRadius.lg),
          ),
          padding: const EdgeInsets.all(OriginSpacing.lg),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: <Widget>[
              Row(
                children: <Widget>[
                  Icon(
                    isAudio ? Icons.graphic_eq : Icons.movie_outlined,
                    color: OriginColors.forestGreen,
                  ),
                  const SizedBox(width: OriginSpacing.sm),
                  Text(
                    isAudio ? strings.replayAudio : strings.replayVideo,
                    style: OriginTextStyles.bodyMedium
                        .copyWith(fontWeight: FontWeight.w700),
                  ),
                ],
              ),
              const SizedBox(height: OriginSpacing.md),
              OriginButton.primary(
                label: strings.openReplay,
                icon: Icons.play_arrow_rounded,
                onPressed: () => _open(data.url!),
              ),
            ],
          ),
        );
      },
    );
  }

  Future<void> _open(String url) async {
    final uri = Uri.tryParse(url);
    if (uri == null) return;
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }
}

class _ReplayNotice extends StatelessWidget {
  const _ReplayNotice({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: OriginColors.sand,
        borderRadius: BorderRadius.circular(OriginRadius.lg),
      ),
      padding: const EdgeInsets.symmetric(
        horizontal: OriginSpacing.lg,
        vertical: OriginSpacing.xl,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          const Icon(Icons.play_circle_outline,
              size: 40, color: OriginColors.textMuted),
          const SizedBox(height: OriginSpacing.md),
          Text(
            text,
            textAlign: TextAlign.center,
            style: OriginTextStyles.body
                .copyWith(color: OriginColors.textSecondary),
          ),
        ],
      ),
    );
  }
}
