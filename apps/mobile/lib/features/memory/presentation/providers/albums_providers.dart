// Riverpod providers driving the albums UI.
//
// These public Living-Memory surfaces are online-first (no offline cache), so
// reads are plain [FutureProvider]s and writes are imperative methods on
// [AlbumsController] that invalidate the affected providers. Mirrors the web
// react-query hooks (`apps/web/src/lib/hooks/use-albums.ts`).

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:origin_mobile/features/auth/presentation/providers/auth_state_provider.dart';
import 'package:origin_mobile/features/memory/data/albums_api.dart';
import 'package:origin_mobile/features/memory/data/memory_media.dart';
import 'package:origin_mobile/features/memory/domain/album.dart';
import 'package:origin_mobile/features/memory/domain/visibility_scope.dart';

/// The viewer's own albums.
final FutureProvider<List<Album>> myAlbumsProvider =
    FutureProvider<List<Album>>((ref) async {
  return ref.watch(albumsApiProvider).getMine();
});

/// Albums whose subject is [personId].
final albumsByPersonProvider =
    FutureProvider.family<List<Album>, String>((ref, personId) async {
  return ref.watch(albumsApiProvider).getByPerson(personId);
});

/// A single album with its loaded items.
final albumDetailProvider =
    FutureProvider.family<AlbumDetail, String>((ref, albumId) async {
  return ref.watch(albumsApiProvider).getById(albumId);
});

/// The current viewer's account id (used to gate owner-only actions).
final Provider<String?> currentAccountIdProvider = Provider<String?>((ref) {
  return ref.watch(authStateProvider).valueOrNull?.currentAccount?.id;
});

/// Imperative write surface for albums. Holds no state; each method performs a
/// network call then invalidates the relevant providers so the UI refetches.
final Provider<AlbumsController> albumsControllerProvider =
    Provider<AlbumsController>(AlbumsController.new);

class AlbumsController {
  AlbumsController(this._ref);

  final Ref _ref;

  AlbumsApi get _api => _ref.read(albumsApiProvider);
  MemoryMediaUploader get _uploader => _ref.read(memoryMediaUploaderProvider);

  Future<Album> createAlbum({
    required String title,
    String? description,
    AlbumKind kind = AlbumKind.personal,
    String? subjectPersonId,
    MemoryVisibilityScope visibility = MemoryVisibilityScope.privateSelf,
  }) async {
    final album = await _api.create(
      title: title,
      description: description,
      kind: kind,
      subjectPersonId: subjectPersonId,
      visibilityScope: visibility,
    );
    _ref.invalidate(myAlbumsProvider);
    if (subjectPersonId != null) {
      _ref.invalidate(albumsByPersonProvider(subjectPersonId));
    }
    return album;
  }

  /// Uploads [bytes] through the media module, then attaches the resulting
  /// media as a new item on [albumId].
  Future<void> addPhoto({
    required String albumId,
    required Uint8List bytes,
    required String fileName,
    required String mimeType,
    String? caption,
    String? takenAt,
    String? takenAtText,
  }) async {
    final mediaId = await _uploader.upload(
      bytes: bytes,
      fileName: fileName,
      mimeType: mimeType,
      purpose: MemoryMediaPurpose.album,
    );
    await _api.addItem(
      albumId,
      mediaId: mediaId,
      caption: caption,
      takenAt: takenAt,
      takenAtText: takenAtText,
    );
    _ref.invalidate(albumDetailProvider(albumId));
    _ref.invalidate(myAlbumsProvider);
  }

  Future<void> deleteItem(String albumId, String itemId) async {
    await _api.deleteItem(albumId, itemId);
    _ref.invalidate(albumDetailProvider(albumId));
    _ref.invalidate(myAlbumsProvider);
  }

  Future<void> deleteAlbum(String albumId) async {
    await _api.deleteAlbum(albumId);
    _ref.invalidate(myAlbumsProvider);
  }
}
