import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:origin_mobile/core/theme/origin_colors.dart';
import 'package:origin_mobile/core/theme/origin_spacing.dart';
import 'package:origin_mobile/core/theme/origin_text_styles.dart';
import 'package:origin_mobile/features/memory/domain/album.dart';
import 'package:origin_mobile/features/memory/presentation/i18n/memory_strings.dart';
import 'package:origin_mobile/features/memory/presentation/providers/albums_providers.dart';
import 'package:origin_mobile/features/memory/presentation/widgets/album_card.dart';
import 'package:origin_mobile/features/memory/presentation/widgets/create_album_sheet.dart';
import 'package:origin_mobile/shared/widgets/empty_state_view.dart';
import 'package:origin_mobile/shared/widgets/error_view.dart';
import 'package:origin_mobile/shared/widgets/loading_view.dart';
import 'package:origin_mobile/shared/widgets/origin_scaffold.dart';

/// Grid of the viewer's albums. Tapping a card opens its timeline; the FAB
/// opens the create-album sheet.
class AlbumsScreen extends ConsumerWidget {
  const AlbumsScreen({super.key});

  Future<void> _create(BuildContext context, WidgetRef ref) async {
    final albumId = await CreateAlbumSheet.show(context);
    if (albumId != null && context.mounted) {
      context.push('/albums/$albumId');
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final strings = MemoryStrings.of(context);
    final albumsAsync = ref.watch(myAlbumsProvider);

    return OriginScaffold(
      backgroundColor: OriginColors.sand,
      appBar: AppBar(
        backgroundColor: OriginColors.sand,
        elevation: 0,
        title: Text(
          strings.albumsTitle,
          style: OriginTextStyles.sectionTitle
              .copyWith(fontWeight: FontWeight.w700),
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: OriginColors.deepBlue,
        foregroundColor: OriginColors.offWhite,
        onPressed: () => _create(context, ref),
        icon: const Icon(Icons.add),
        label: Text(strings.createAlbum),
      ),
      body: SafeArea(
        child: RefreshIndicator(
          color: OriginColors.deepBlue,
          onRefresh: () async => ref.refresh(myAlbumsProvider.future),
          child: albumsAsync.when(
            loading: () => const LoadingView(),
            error: (_, __) => _Fill(
              child: ErrorView(
                title: strings.errorTitle,
                message: strings.errorSubtitle,
                onRetry: () => ref.invalidate(myAlbumsProvider),
              ),
            ),
            data: (albums) {
              if (albums.isEmpty) {
                return _Fill(
                  child: EmptyStateView(
                    icon: Icons.photo_library_outlined,
                    title: strings.albumsEmptyTitle,
                    subtitle: strings.albumsEmptyDesc,
                    actionLabel: strings.createAlbum,
                    onAction: () => _create(context, ref),
                  ),
                );
              }
              return GridView.builder(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.fromLTRB(
                  OriginSpacing.md,
                  OriginSpacing.md,
                  OriginSpacing.md,
                  OriginSpacing.xxl + OriginSpacing.lg,
                ),
                gridDelegate:
                    const SliverGridDelegateWithMaxCrossAxisExtent(
                  maxCrossAxisExtent: 320,
                  mainAxisSpacing: OriginSpacing.md,
                  crossAxisSpacing: OriginSpacing.md,
                  childAspectRatio: 0.82,
                ),
                itemCount: albums.length,
                itemBuilder: (context, index) {
                  final Album album = albums[index];
                  return AlbumCard(
                    album: album,
                    onTap: () => context.push('/albums/${album.id}'),
                  );
                },
              );
            },
          ),
        ),
      ),
    );
  }
}

/// Wraps a non-scrolling child so pull-to-refresh still works on empty/error.
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
