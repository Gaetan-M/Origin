import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:origin_mobile/core/theme/origin_colors.dart';
import 'package:origin_mobile/core/theme/origin_radius.dart';
import 'package:origin_mobile/core/theme/origin_spacing.dart';
import 'package:origin_mobile/core/theme/origin_text_styles.dart';
import 'package:origin_mobile/features/memory/domain/album.dart';
import 'package:origin_mobile/features/memory/presentation/i18n/memory_strings.dart';
import 'package:origin_mobile/features/memory/presentation/providers/albums_providers.dart';
import 'package:origin_mobile/features/memory/presentation/widgets/add_album_item_sheet.dart';
import 'package:origin_mobile/features/memory/presentation/widgets/memory_network_image.dart';
import 'package:origin_mobile/shared/widgets/empty_state_view.dart';
import 'package:origin_mobile/shared/widgets/error_view.dart';
import 'package:origin_mobile/shared/widgets/loading_view.dart';
import 'package:origin_mobile/shared/widgets/origin_bottom_sheet.dart';
import 'package:origin_mobile/shared/widgets/origin_scaffold.dart';

/// A single album shown as a vertical, chronological timeline of photos.
class AlbumDetailScreen extends ConsumerWidget {
  const AlbumDetailScreen({super.key, required this.albumId});

  final String albumId;

  /// Sort chronologically: known [takenAt] first (ascending), then by position.
  List<AlbumItem> _sorted(List<AlbumItem> items) {
    final list = <AlbumItem>[...items];
    list.sort((a, b) {
      final at = a.takenAt;
      final bt = b.takenAt;
      if (at != null && bt != null) return at.compareTo(bt);
      if (at != null) return -1;
      if (bt != null) return 1;
      return a.position.compareTo(b.position);
    });
    return list;
  }

  Future<void> _confirmDeleteAlbum(
    BuildContext context,
    WidgetRef ref,
    MemoryStrings strings,
  ) async {
    await OriginBottomSheet.show<void>(
      context: context,
      title: strings.deleteAlbumConfirm,
      actions: <OriginBottomSheetAction>[
        OriginBottomSheetAction(
          label: strings.delete,
          icon: Icons.delete_outline,
          destructive: true,
          onTap: () async {
            await ref.read(albumsControllerProvider).deleteAlbum(albumId);
            if (context.mounted) context.pop();
          },
        ),
      ],
    );
  }

  Future<void> _confirmDeleteItem(
    BuildContext context,
    WidgetRef ref,
    MemoryStrings strings,
    String itemId,
  ) async {
    await OriginBottomSheet.show<void>(
      context: context,
      title: strings.deletePhotoConfirm,
      actions: <OriginBottomSheetAction>[
        OriginBottomSheetAction(
          label: strings.delete,
          icon: Icons.delete_outline,
          destructive: true,
          onTap: () =>
              ref.read(albumsControllerProvider).deleteItem(albumId, itemId),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final strings = MemoryStrings.of(context);
    final detailAsync = ref.watch(albumDetailProvider(albumId));
    final myAccountId = ref.watch(currentAccountIdProvider);

    return OriginScaffold(
      backgroundColor: OriginColors.sand,
      appBar: AppBar(
        backgroundColor: OriginColors.sand,
        elevation: 0,
        title: Text(
          detailAsync.valueOrNull?.album.title ?? strings.albumsTitle,
          style: OriginTextStyles.sectionTitle
              .copyWith(fontWeight: FontWeight.w700),
        ),
        actions: <Widget>[
          if (detailAsync.valueOrNull != null &&
              detailAsync.value!.album.ownerAccountId == myAccountId)
            IconButton(
              tooltip: strings.delete,
              icon: const Icon(Icons.delete_outline,
                  color: OriginColors.textSecondary),
              onPressed: () => _confirmDeleteAlbum(context, ref, strings),
            ),
        ],
      ),
      floatingActionButton: detailAsync.valueOrNull != null &&
              detailAsync.value!.album.ownerAccountId == myAccountId
          ? FloatingActionButton.extended(
              backgroundColor: OriginColors.terracotta,
              foregroundColor: OriginColors.offWhite,
              onPressed: () => AddAlbumItemSheet.show(context, albumId),
              icon: const Icon(Icons.add_a_photo_outlined),
              label: Text(strings.addPhoto),
            )
          : null,
      body: SafeArea(
        child: RefreshIndicator(
          color: OriginColors.deepBlue,
          onRefresh: () async =>
              ref.refresh(albumDetailProvider(albumId).future),
          child: detailAsync.when(
            loading: () => const LoadingView(),
            error: (_, __) => ErrorView(
              title: strings.errorTitle,
              message: strings.errorSubtitle,
              onRetry: () => ref.invalidate(albumDetailProvider(albumId)),
            ),
            data: (detail) {
              final canEdit = detail.album.ownerAccountId == myAccountId;
              final items = _sorted(detail.items);
              return ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.fromLTRB(
                  OriginSpacing.md,
                  OriginSpacing.md,
                  OriginSpacing.md,
                  OriginSpacing.xxl + OriginSpacing.lg,
                ),
                children: <Widget>[
                  if (detail.album.subjectPersonName != null)
                    Padding(
                      padding:
                          const EdgeInsets.only(bottom: OriginSpacing.xs),
                      child: Text(
                        strings.albumAbout(detail.album.subjectPersonName!),
                        style: OriginTextStyles.caption,
                      ),
                    ),
                  if (detail.album.description != null &&
                      detail.album.description!.trim().isNotEmpty)
                    Padding(
                      padding:
                          const EdgeInsets.only(bottom: OriginSpacing.md),
                      child: Text(
                        detail.album.description!.trim(),
                        style: OriginTextStyles.body
                            .copyWith(color: OriginColors.textSecondary),
                      ),
                    ),
                  if (items.isEmpty)
                    Padding(
                      padding: const EdgeInsets.only(top: OriginSpacing.xxl),
                      child: EmptyStateView(
                        icon: Icons.add_a_photo_outlined,
                        title: strings.timelineEmptyTitle,
                        subtitle: strings.timelineEmptyDesc,
                        actionLabel: canEdit ? strings.addPhoto : null,
                        onAction: canEdit
                            ? () => AddAlbumItemSheet.show(context, albumId)
                            : null,
                      ),
                    )
                  else
                    for (final item in items)
                      _TimelineTile(
                        item: item,
                        dateLabel: strings.formatTaken(
                          item.takenAt,
                          item.takenAtText,
                        ),
                        canEdit: canEdit,
                        onDelete: () => _confirmDeleteItem(
                          context,
                          ref,
                          strings,
                          item.id,
                        ),
                      ),
                ],
              );
            },
          ),
        ),
      ),
    );
  }
}

class _TimelineTile extends StatelessWidget {
  const _TimelineTile({
    required this.item,
    required this.dateLabel,
    required this.canEdit,
    required this.onDelete,
  });

  final AlbumItem item;
  final String dateLabel;
  final bool canEdit;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: OriginSpacing.lg),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            children: <Widget>[
              Container(
                width: 10,
                height: 10,
                decoration: const BoxDecoration(
                  color: OriginColors.forestGreen,
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: OriginSpacing.sm),
              Expanded(
                child: Text(
                  dateLabel,
                  style: OriginTextStyles.bodyMedium.copyWith(
                    color: OriginColors.forestGreen700,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              if (canEdit)
                InkWell(
                  borderRadius: BorderRadius.circular(OriginRadius.full),
                  onTap: onDelete,
                  child: const Padding(
                    padding: EdgeInsets.all(4),
                    child: Icon(Icons.delete_outline,
                        size: 18, color: OriginColors.textMuted),
                  ),
                ),
            ],
          ),
          const SizedBox(height: OriginSpacing.sm),
          ClipRRect(
            borderRadius: BorderRadius.circular(OriginRadius.lg),
            child: AspectRatio(
              aspectRatio: 4 / 3,
              child: MemoryNetworkImage(mediaId: item.mediaId),
            ),
          ),
          if (item.caption != null && item.caption!.trim().isNotEmpty) ...<Widget>[
            const SizedBox(height: OriginSpacing.sm),
            Text(
              item.caption!.trim(),
              style: OriginTextStyles.body
                  .copyWith(color: OriginColors.textSecondary),
            ),
          ],
        ],
      ),
    );
  }
}
