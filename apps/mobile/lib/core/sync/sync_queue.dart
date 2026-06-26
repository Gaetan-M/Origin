// Offline write queue.
//
// Persists [SyncOperation]s in the [SyncQueueDao] and drains them in FIFO
// order whenever connectivity is available. On network/5xx errors we apply
// exponential backoff capped at ~30 minutes per operation. Permanent (4xx)
// failures leave the operation in `failed` status for surfacing to the user.
//
// Idempotence: an operation in `succeeded` status is never re-pushed.

import 'dart:async';
import 'dart:math' as math;

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:logger/logger.dart';
import 'package:origin_mobile/core/storage/app_database.dart';
import 'package:origin_mobile/core/storage/app_database_provider.dart';
import 'package:origin_mobile/core/storage/daos/parent_child_dao.dart';
import 'package:origin_mobile/core/storage/daos/persons_dao.dart';
import 'package:origin_mobile/core/storage/daos/sync_queue_dao.dart';
import 'package:origin_mobile/core/storage/daos/unions_dao.dart';
import 'package:origin_mobile/core/sync/sync_dispatcher.dart';
import 'package:origin_mobile/core/sync/sync_operation.dart';

enum SyncStatus { idle, syncing, error }

class SyncQueue {
  SyncQueue({
    required SyncQueueDao queueDao,
    required SyncDispatcher dispatcher,
    required PersonsDao personsDao,
    required UnionsDao unionsDao,
    required ParentChildDao parentChildDao,
  })  : _queueDao = queueDao,
        _dispatcher = dispatcher,
        _personsDao = personsDao,
        _unionsDao = unionsDao,
        _parentChildDao = parentChildDao;

  final SyncQueueDao _queueDao;
  final SyncDispatcher _dispatcher;
  final PersonsDao _personsDao;
  final UnionsDao _unionsDao;
  final ParentChildDao _parentChildDao;
  final Logger _log = Logger();

  final StreamController<SyncStatus> _statusController =
      StreamController<SyncStatus>.broadcast();
  bool _draining = false;

  /// Maximum attempts before an operation is marked `failed` (permanent).
  static const int _maxAttempts = 8;

  /// Persists a new operation. Safe to call from any thread.
  Future<void> enqueue(SyncOperation op) async {
    await _queueDao.insert(op.toCompanion());
    _log.d('Queued ${op.operationType.wireName} ${op.entityType.wireName}/${op.entityLocalId}');
  }

  /// Stream of high-level status used by the UI banner.
  Stream<SyncStatus> watchStatus() => _statusController.stream;

  /// Stream of the count of pending ops (for badges, etc.).
  Stream<int> watchPendingCount() => _queueDao.watchPendingCount();

  /// Walks the queue, pushing pending operations one by one. Concurrent calls
  /// are no-ops (lock via `_draining`).
  Future<void> drain() async {
    if (_draining) {
      return;
    }
    _draining = true;
    _statusController.add(SyncStatus.syncing);
    try {
      while (true) {
        final batch = await _queueDao.getPending();
        if (batch.isEmpty) {
          break;
        }
        var anyTransient = false;
        for (final row in batch) {
          final op = SyncOperation.fromRow(row);
          if (op.status == SyncOperationStatus.succeeded) {
            // Idempotence guard.
            continue;
          }
          await _queueDao.markInProgress(op.id);
          final result = await _dispatcher.dispatch(op);
          if (result.success) {
            await _onSuccess(op, result);
          } else if (result.transient) {
            anyTransient = true;
            await _onTransientFailure(op, result.error ?? 'unknown');
          } else {
            await _onPermanentFailure(op, result.error ?? 'unknown');
          }
        }
        if (anyTransient) {
          // Avoid hot-looping on transient errors.
          break;
        }
      }
      _statusController.add(SyncStatus.idle);
    } catch (e, st) {
      _log.e('Sync drain failed', error: e, stackTrace: st);
      _statusController.add(SyncStatus.error);
    } finally {
      _draining = false;
    }
  }

  Future<void> _onSuccess(SyncOperation op, SyncDispatchResult result) async {
    final remoteId = result.remoteId;
    if (remoteId != null && remoteId.isNotEmpty && remoteId != op.entityLocalId) {
      await _rewriteEntityId(op.entityType, op.entityLocalId, remoteId);
      await _queueDao.setRemoteId(id: op.id, remoteId: remoteId);
    } else if (op.operationType != SyncOperationType.delete) {
      await _markEntitySynced(op.entityType, op.entityLocalId);
    }
    await _queueDao.markSucceeded(op.id);
  }

  Future<void> _onTransientFailure(SyncOperation op, String error) async {
    final attempt = op.attemptCount + 1;
    if (attempt >= _maxAttempts) {
      await _onPermanentFailure(op, 'Max attempts reached: $error');
      return;
    }
    final backoffSeconds = math.min(1800, math.pow(2, attempt).toInt());
    final next = DateTime.now().add(Duration(seconds: backoffSeconds));
    await _queueDao.markFailed(
      id: op.id,
      error: error,
      attempt: attempt,
      nextAttemptAt: next,
    );
    _log.w('Transient sync failure (attempt $attempt): ${op.entityType.wireName} — $error');
  }

  Future<void> _onPermanentFailure(SyncOperation op, String error) async {
    await _queueDao.markFailed(
      id: op.id,
      error: error,
      attempt: op.attemptCount + 1,
      nextAttemptAt: DateTime.now(),
      permanent: true,
    );
    _log.e('Permanent sync failure: ${op.entityType.wireName} — $error');
  }

  Future<void> _rewriteEntityId(
    SyncEntityType type,
    String oldId,
    String newId,
  ) async {
    switch (type) {
      case SyncEntityType.person:
        await _personsDao.rewriteIdAfterSync(oldId: oldId, newId: newId);
      case SyncEntityType.union:
        await _unionsDao.rewriteIdAfterSync(oldId: oldId, newId: newId);
      case SyncEntityType.parentChild:
        await _parentChildDao.rewriteIdAfterSync(oldId: oldId, newId: newId);
      case SyncEntityType.claim:
      case SyncEntityType.identityDocument:
      case SyncEntityType.unionPartner:
      case SyncEntityType.notificationRead:
      case SyncEntityType.accountSettings:
      case SyncEntityType.feedReaction:
      case SyncEntityType.feedComment:
        // For these we don't currently rewrite ids — the local row is dropped
        // after success or never had a temporary id.
        break;
    }
  }

  Future<void> _markEntitySynced(SyncEntityType type, String id) async {
    switch (type) {
      case SyncEntityType.person:
        await _personsDao.markSynced(id);
      case SyncEntityType.union:
        await _unionsDao.markSynced(id);
      case SyncEntityType.parentChild:
        await _parentChildDao.markSynced(id);
      case SyncEntityType.claim:
      case SyncEntityType.identityDocument:
      case SyncEntityType.unionPartner:
      case SyncEntityType.notificationRead:
      case SyncEntityType.accountSettings:
      case SyncEntityType.feedReaction:
      case SyncEntityType.feedComment:
        break;
    }
  }

  Future<void> dispose() async {
    await _statusController.close();
  }
}

final Provider<SyncQueue> syncQueueProvider = Provider<SyncQueue>((ref) {
  final queue = SyncQueue(
    queueDao: ref.watch(syncQueueDaoProvider),
    dispatcher: ref.watch(syncDispatcherProvider),
    personsDao: ref.watch(personsDaoProvider),
    unionsDao: ref.watch(unionsDaoProvider),
    parentChildDao: ref.watch(parentChildDaoProvider),
  );
  ref.onDispose(queue.dispose);
  return queue;
});

final StreamProvider<SyncStatus> syncStatusStreamProvider =
    StreamProvider<SyncStatus>((ref) {
  return ref.watch(syncQueueProvider).watchStatus();
});

final StreamProvider<int> syncPendingCountProvider = StreamProvider<int>((ref) {
  return ref.watch(syncQueueProvider).watchPendingCount();
});
