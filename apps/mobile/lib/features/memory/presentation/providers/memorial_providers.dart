// Riverpod providers driving the memorial UI.
//
// Online-first: reads are plain [FutureProvider]s; writes are imperative
// methods on [MemorialController] that invalidate the affected providers.
// Mirrors the web react-query hooks (`apps/web/src/lib/hooks/use-memorial.ts`).

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:origin_mobile/data/api/persons_api.dart';
import 'package:origin_mobile/data/models/person.dart';
import 'package:origin_mobile/features/memory/data/memorial_api.dart';
import 'package:origin_mobile/features/memory/data/memory_media.dart';
import 'package:origin_mobile/features/memory/domain/memorial.dart';
import 'package:origin_mobile/features/memory/domain/visibility_scope.dart';

/// The deceased person whose memorial is being viewed.
final memorialPersonProvider =
    FutureProvider.family<Person, String>((ref, personId) async {
  return ref.watch(personsApiProvider).getById(personId);
});

/// Tributes left on a person's memorial wall (newest first from the API).
final memorialTributesProvider =
    FutureProvider.family<List<MemorialTribute>, String>((ref, personId) async {
  return ref.watch(memorialApiProvider).getTributes(personId);
});

/// Aggregate counters (candles / tributes) for a person's memorial.
final memorialSummaryProvider =
    FutureProvider.family<MemorialSummary, String>((ref, personId) async {
  return ref.watch(memorialApiProvider).getSummary(personId);
});

final Provider<MemorialController> memorialControllerProvider =
    Provider<MemorialController>(MemorialController.new);

class MemorialController {
  MemorialController(this._ref);

  final Ref _ref;

  MemorialApi get _api => _ref.read(memorialApiProvider);
  MemoryMediaUploader get _uploader => _ref.read(memoryMediaUploaderProvider);

  /// Adds a tribute. For PHOTO/VIDEO tributes the [bytes] are uploaded through
  /// the media module first and the resulting media id is attached.
  Future<void> addTribute({
    required String personId,
    required MemorialTributeKind kind,
    String? message,
    Uint8List? bytes,
    String? fileName,
    String? mimeType,
    MemoryVisibilityScope visibility = MemoryVisibilityScope.family,
  }) async {
    String? mediaId;
    if (kind.needsMedia && bytes != null && fileName != null) {
      mediaId = await _uploader.upload(
        bytes: bytes,
        fileName: fileName,
        mimeType: mimeType ?? guessMimeType(fileName),
        purpose: MemoryMediaPurpose.memorial,
      );
    }
    await _api.addTribute(
      personId,
      kind: kind,
      message: message,
      mediaId: mediaId,
      visibilityScope: visibility,
    );
    _invalidate(personId);
  }

  Future<void> deleteTribute(String personId, String tributeId) async {
    await _api.deleteTribute(tributeId);
    _invalidate(personId);
  }

  void _invalidate(String personId) {
    _ref.invalidate(memorialTributesProvider(personId));
    _ref.invalidate(memorialSummaryProvider(personId));
  }
}
