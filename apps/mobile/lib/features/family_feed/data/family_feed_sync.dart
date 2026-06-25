// Sync dispatch handlers for offline-authored feed reactions & comments.
//
// These push queued `SyncOperation`s (entityType `feedReaction` / `feedComment`)
// to the backend via `FamilyFeedApi`, classifying failures as transient
// (network / 5xx → retried with backoff) or permanent (4xx → surfaced).
//
// INTEGRATION: call `registerFamilyFeedSyncHandlers(dispatcher, ref)` once at
// app boot (where the `SyncDispatcher` is created / overridden), AFTER adding
// `feedReaction` and `feedComment` to the `SyncEntityType` enum. The handlers
// resolve their dependencies from the passed `Ref`.

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:origin_mobile/core/sync/sync_dispatcher.dart';
import 'package:origin_mobile/core/sync/sync_operation.dart';
import 'package:origin_mobile/features/family_feed/data/family_feed_api.dart';
import 'package:origin_mobile/features/family_feed/data/family_feed_providers_data.dart';
import 'package:origin_mobile/features/family_feed/domain/feed_enums.dart';

/// Wires the feed sync handlers into [dispatcher]. The handlers resolve their
/// dependencies from the [Ref] the dispatcher passes them at dispatch time.
void registerFamilyFeedSyncHandlers(SyncDispatcher dispatcher) {
  dispatcher.register(SyncEntityType.feedReaction, _dispatchReaction);
  dispatcher.register(SyncEntityType.feedComment, _dispatchComment);
}

Future<SyncDispatchResult> _dispatchReaction(Ref ref, SyncOperation op) async {
  final api = ref.read(familyFeedApiProvider);
  final postId = op.payload['feedPostId'] as String?;
  final type = FeedReactionType.fromWire(op.payload['reactionType'] as String?);
  if (postId == null || type == null) {
    return SyncDispatchResult.permanent('Malformed feed reaction payload');
  }
  try {
    if (op.operationType == SyncOperationType.delete) {
      await api.removeReaction(postId, type);
      return SyncDispatchResult.ok();
    }
    final remoteId = await api.addReaction(postId, type);
    return SyncDispatchResult.ok(remoteId: remoteId);
  } on DioException catch (e) {
    return _classify(e);
  }
}

Future<SyncDispatchResult> _dispatchComment(Ref ref, SyncOperation op) async {
  final api = ref.read(familyFeedApiProvider);
  final cache = ref.read(familyFeedCacheDaoProvider);
  final postId = op.payload['feedPostId'] as String?;
  final body = op.payload['body'] as String?;
  final localId = op.payload['localId'] as String?;
  if (postId == null || body == null || body.isEmpty) {
    return SyncDispatchResult.permanent('Malformed feed comment payload');
  }
  try {
    final remoteId = await api.addComment(postId, body);
    // Reconcile the optimistic local comment with the server id.
    if (localId != null && remoteId.isNotEmpty) {
      await cache.rewriteCommentId(oldId: localId, newId: remoteId);
    } else if (localId != null) {
      await cache.markCommentSynced(localId);
    }
    return SyncDispatchResult.ok(remoteId: remoteId);
  } on DioException catch (e) {
    return _classify(e);
  }
}

/// Maps a [DioException] to transient (retry) vs permanent (give up).
SyncDispatchResult _classify(DioException e) {
  final status = e.response?.statusCode ?? 0;
  switch (e.type) {
    case DioExceptionType.connectionTimeout:
    case DioExceptionType.sendTimeout:
    case DioExceptionType.receiveTimeout:
    case DioExceptionType.connectionError:
      return SyncDispatchResult.transient(e.message ?? 'network error');
    case DioExceptionType.badResponse:
      if (status >= 500) {
        return SyncDispatchResult.transient('server error $status');
      }
      // 409 (already reacted / already retracted) is idempotently fine.
      if (status == 409) {
        return SyncDispatchResult.ok();
      }
      return SyncDispatchResult.permanent('rejected ($status)');
    case DioExceptionType.cancel:
    case DioExceptionType.badCertificate:
    case DioExceptionType.unknown:
      return SyncDispatchResult.transient(e.message ?? 'unknown error');
  }
}
