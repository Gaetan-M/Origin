import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:origin_mobile/core/theme/origin_colors.dart';
import 'package:origin_mobile/core/theme/origin_radius.dart';
import 'package:origin_mobile/core/theme/origin_spacing.dart';
import 'package:origin_mobile/core/theme/origin_text_styles.dart';
import 'package:origin_mobile/features/live/domain/live_session.dart';
import 'package:origin_mobile/features/live/presentation/i18n/live_strings.dart';
import 'package:origin_mobile/features/live/presentation/providers/live_providers.dart';
import 'package:origin_mobile/features/live/presentation/widgets/live_replay_view.dart';
import 'package:origin_mobile/shared/widgets/loading_view.dart';
import 'package:origin_mobile/shared/widgets/m_chip.dart';
import 'package:origin_mobile/shared/widgets/origin_button.dart';
import 'package:origin_mobile/shared/widgets/origin_scaffold.dart';

/// Live room. Mirrors the web `/lives/[id]` page, but the native LiveKit SDK
/// is NOT wired yet — so an active session renders a calm, bilingual
/// "opens on web for now" placeholder (audio-first lives never crash the app),
/// and an ended session shows the systematic replay stub.
class LiveRoomScreen extends ConsumerWidget {
  const LiveRoomScreen({super.key, required this.sessionId});

  final String sessionId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final strings = LiveStrings.of(context);
    final sessionAsync = ref.watch(liveSessionProvider(sessionId));

    return OriginScaffold(
      backgroundColor: OriginColors.sand,
      appBar: AppBar(
        backgroundColor: OriginColors.sand,
        elevation: 0,
        title: Text(
          sessionAsync.valueOrNull?.title ?? strings.title,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: OriginTextStyles.sectionTitle
              .copyWith(fontWeight: FontWeight.w700),
        ),
      ),
      body: SafeArea(
        child: sessionAsync.when(
          loading: () => const LoadingView(),
          error: (_, __) => Padding(
            padding: const EdgeInsets.all(OriginSpacing.lg),
            child: _ComingSoon(strings: strings, onBack: () => _back(context)),
          ),
          data: (session) => _Body(
            session: session,
            strings: strings,
            sessionId: sessionId,
            onBack: () => _back(context),
          ),
        ),
      ),
    );
  }

  void _back(BuildContext context) {
    if (context.canPop()) {
      context.pop();
    } else {
      context.go('/lives');
    }
  }
}

class _Body extends ConsumerWidget {
  const _Body({
    required this.session,
    required this.strings,
    required this.sessionId,
    required this.onBack,
  });

  final LiveSession session;
  final LiveStrings strings;
  final String sessionId;
  final VoidCallback onBack;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return ListView(
      padding: const EdgeInsets.all(OriginSpacing.md),
      children: <Widget>[
        Wrap(
          spacing: OriginSpacing.xs,
          runSpacing: OriginSpacing.xs,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: <Widget>[
            MChip(
              label: strings.kindLabel(session.kind),
              background: OriginColors.sand,
              foreground: OriginColors.textSecondary,
              dense: true,
            ),
            MChip(
              label: strings.statusLabel(session.status),
              background: session.isLive
                  ? OriginColors.terracotta50
                  : OriginColors.deepBlue50,
              foreground: session.isLive
                  ? OriginColors.terracotta700
                  : OriginColors.deepBlue,
              dense: true,
            ),
          ],
        ),
        if (session.hostDisplayName != null &&
            session.hostDisplayName!.isNotEmpty) ...<Widget>[
          const SizedBox(height: OriginSpacing.sm),
          Text(
            '${strings.hostedBy} ${session.hostDisplayName}',
            style: OriginTextStyles.caption
                .copyWith(color: OriginColors.textMuted),
          ),
        ],
        if (session.description != null &&
            session.description!.isNotEmpty) ...<Widget>[
          const SizedBox(height: OriginSpacing.md),
          Text(session.description!, style: OriginTextStyles.body),
        ],
        const SizedBox(height: OriginSpacing.lg),

        // Ended -> systematic replay. Active -> graceful "opens on web" gate.
        if (session.isEnded)
          LiveReplayView(
            sessionId: sessionId,
            published: session.replayPublished,
          )
        else
          _LiveGate(
            sessionId: sessionId,
            strings: strings,
            onBack: onBack,
          ),
      ],
    );
  }
}

/// Fetches the join token (mirroring the contract) and renders a graceful
/// placeholder: the native SDK is not wired, so we never attempt to connect.
class _LiveGate extends ConsumerWidget {
  const _LiveGate({
    required this.sessionId,
    required this.strings,
    required this.onBack,
  });

  final String sessionId;
  final LiveStrings strings;
  final VoidCallback onBack;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tokenAsync = ref.watch(liveTokenProvider(sessionId));

    return tokenAsync.when(
      loading: () => Column(
        children: <Widget>[
          const SizedBox(height: OriginSpacing.xl),
          const LoadingView(),
          const SizedBox(height: OriginSpacing.md),
          Text(
            strings.roomLoading,
            style: OriginTextStyles.caption
                .copyWith(color: OriginColors.textMuted),
          ),
        ],
      ),
      // On any token error we still degrade gracefully rather than crash.
      error: (_, __) =>
          _ComingSoon(strings: strings, onBack: onBack),
      data: (token) => _ComingSoon(
        strings: strings,
        onBack: onBack,
        notConfigured: !token.configured,
      ),
    );
  }
}

/// Calm, bilingual placeholder shown while the native LiveKit room is not
/// wired. Never blocks the rest of the UI.
class _ComingSoon extends StatelessWidget {
  const _ComingSoon({
    required this.strings,
    required this.onBack,
    this.notConfigured = false,
  });

  final LiveStrings strings;
  final VoidCallback onBack;
  final bool notConfigured;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: OriginColors.offWhite,
        borderRadius: BorderRadius.circular(OriginRadius.lg),
        border: Border.all(color: OriginColors.border),
      ),
      padding: const EdgeInsets.all(OriginSpacing.xl),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          Container(
            width: 64,
            height: 64,
            decoration: const BoxDecoration(
              color: OriginColors.sand,
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.sensors,
                size: 30, color: OriginColors.forestGreen),
          ),
          const SizedBox(height: OriginSpacing.md),
          Text(
            strings.comingSoonTitle,
            textAlign: TextAlign.center,
            style: OriginTextStyles.sectionTitle
                .copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: OriginSpacing.sm),
          Text(
            notConfigured ? strings.notConfigured : strings.comingSoonBody,
            textAlign: TextAlign.center,
            style: OriginTextStyles.body
                .copyWith(color: OriginColors.textSecondary),
          ),
          const SizedBox(height: OriginSpacing.md),
          Text(
            strings.audioFirstNote,
            textAlign: TextAlign.center,
            style: OriginTextStyles.caption
                .copyWith(color: OriginColors.textMuted),
          ),
          const SizedBox(height: OriginSpacing.lg),
          OriginButton.secondary(
            label: strings.backToList,
            onPressed: onBack,
            expand: false,
          ),
        ],
      ),
    );
  }
}
