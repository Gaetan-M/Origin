import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:origin_mobile/core/theme/origin_colors.dart';
import 'package:origin_mobile/core/theme/origin_spacing.dart';
import 'package:origin_mobile/core/theme/origin_text_styles.dart';
import 'package:origin_mobile/features/live/domain/live_session.dart';
import 'package:origin_mobile/features/live/presentation/i18n/live_strings.dart';
import 'package:origin_mobile/features/live/presentation/providers/live_providers.dart';
import 'package:origin_mobile/features/live/presentation/widgets/live_session_card.dart';
import 'package:origin_mobile/shared/widgets/empty_state_view.dart';
import 'package:origin_mobile/shared/widgets/error_view.dart';
import 'package:origin_mobile/shared/widgets/loading_view.dart';
import 'package:origin_mobile/shared/widgets/origin_scaffold.dart';

/// Lives list — buckets every visible session into "happening now", "upcoming"
/// and "past". Online-first (no offline cache); pull-to-refresh re-fetches.
/// Mirrors the web `/lives` page.
class LivesScreen extends ConsumerWidget {
  const LivesScreen({super.key});

  /// Route paths (kept local; INTEGRATION wires them into the central router).
  static const String routePath = '/lives';
  static const String newRoutePath = '/lives/new';
  static String roomRoutePath(String id) => '/lives/$id';

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final strings = LiveStrings.of(context);
    final sessionsAsync = ref.watch(liveSessionsProvider);

    return OriginScaffold(
      backgroundColor: OriginColors.sand,
      appBar: AppBar(
        backgroundColor: OriginColors.sand,
        elevation: 0,
        title: Text(
          strings.title,
          style: OriginTextStyles.sectionTitle.copyWith(
            fontWeight: FontWeight.w700,
          ),
        ),
        actions: <Widget>[
          IconButton(
            tooltip: strings.schedule,
            icon: const Icon(Icons.add, color: OriginColors.charcoal),
            onPressed: () => context.push(newRoutePath),
          ),
        ],
      ),
      body: SafeArea(
        child: RefreshIndicator(
          color: OriginColors.deepBlue,
          onRefresh: () async => ref.invalidate(liveSessionsProvider),
          child: sessionsAsync.when(
            loading: () => const LoadingView(),
            error: (_, __) => _Fill(
              child: ErrorView(
                title: strings.error,
                onRetry: () => ref.invalidate(liveSessionsProvider),
              ),
            ),
            data: (sessions) => _SessionList(
              sessions: sessions,
              strings: strings,
              onOpen: (s) => context.push(roomRoutePath(s.id)),
            ),
          ),
        ),
      ),
    );
  }
}

class _SessionList extends StatelessWidget {
  const _SessionList({
    required this.sessions,
    required this.strings,
    required this.onOpen,
  });

  final List<LiveSession> sessions;
  final LiveStrings strings;
  final void Function(LiveSession session) onOpen;

  @override
  Widget build(BuildContext context) {
    if (sessions.isEmpty) {
      return _Fill(
        child: EmptyStateView(
          icon: Icons.sensors,
          title: strings.empty,
          subtitle: strings.emptyHint,
        ),
      );
    }

    final live =
        sessions.where((s) => s.isLive).toList(growable: false);
    final upcoming =
        sessions.where((s) => s.isScheduled).toList(growable: false);
    final past = sessions.where((s) => s.isEnded).toList(growable: false);

    final blocks = <Widget>[
      _Section(
        title: strings.sectionLive,
        sessions: live,
        onOpen: onOpen,
      ),
      _Section(
        title: strings.sectionUpcoming,
        sessions: upcoming,
        onOpen: onOpen,
      ),
      _Section(
        title: strings.sectionPast,
        sessions: past,
        onOpen: onOpen,
      ),
    ];

    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(OriginSpacing.md),
      children: <Widget>[
        Text(
          strings.subtitle,
          style: OriginTextStyles.caption
              .copyWith(color: OriginColors.textMuted),
        ),
        const SizedBox(height: OriginSpacing.md),
        ...blocks,
      ],
    );
  }
}

class _Section extends StatelessWidget {
  const _Section({
    required this.title,
    required this.sessions,
    required this.onOpen,
  });

  final String title;
  final List<LiveSession> sessions;
  final void Function(LiveSession session) onOpen;

  @override
  Widget build(BuildContext context) {
    if (sessions.isEmpty) return const SizedBox.shrink();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Padding(
          padding: const EdgeInsets.only(bottom: OriginSpacing.sm),
          child: Text(
            title.toUpperCase(),
            style: OriginTextStyles.micro.copyWith(
              color: OriginColors.textMuted,
              fontWeight: FontWeight.w700,
              letterSpacing: 1.1,
            ),
          ),
        ),
        for (final session in sessions) ...<Widget>[
          LiveSessionCard(
            session: session,
            onTap: () => onOpen(session),
          ),
          const SizedBox(height: OriginSpacing.sm),
        ],
        const SizedBox(height: OriginSpacing.md),
      ],
    );
  }
}

/// Makes a non-scrolling child fill the viewport so pull-to-refresh works on
/// empty/error states.
class _Fill extends StatelessWidget {
  const _Fill({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        return SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          child: ConstrainedBox(
            constraints: BoxConstraints(minHeight: constraints.maxHeight),
            child: child,
          ),
        );
      },
    );
  }
}
