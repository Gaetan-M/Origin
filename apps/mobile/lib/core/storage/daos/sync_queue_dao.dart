// SyncQueue DAO — backing store for offline operations awaiting push.
import 'package:drift/drift.dart';
import 'package:origin_mobile/core/storage/app_database.dart';

class SyncQueueDao {
  SyncQueueDao(this._db);

  final AppDatabase _db;

  Future<int> insert(SyncQueueCompanion entry) {
    return _db.into(_db.syncQueue).insert(entry, mode: InsertMode.insertOrReplace);
  }

  Future<bool> update(SyncQueueCompanion entry) {
    return _db.update(_db.syncQueue).replace(entry);
  }

  Future<int> deleteById(String id) {
    return (_db.delete(_db.syncQueue)..where((t) => t.id.equals(id))).go();
  }

  Future<SyncQueueData?> getById(String id) {
    return (_db.select(_db.syncQueue)..where((t) => t.id.equals(id))).getSingleOrNull();
  }

  Future<List<SyncQueueData>> getPending({int limit = 50}) {
    final now = DateTime.now();
    return (_db.select(_db.syncQueue)
          ..where((t) =>
              t.status.equals('pending') &
              (t.nextAttemptAt.isNull() | t.nextAttemptAt.isSmallerOrEqualValue(now)))
          ..orderBy(<OrderClauseGenerator<$SyncQueueTable>>[
            (t) => OrderingTerm(expression: t.createdAt),
          ])
          ..limit(limit))
        .get();
  }

  Future<int> countPending() async {
    final query = _db.selectOnly(_db.syncQueue)
      ..addColumns([_db.syncQueue.id.count()])
      ..where(_db.syncQueue.status.equals('pending'));
    final row = await query.getSingleOrNull();
    return row?.read(_db.syncQueue.id.count()) ?? 0;
  }

  Stream<int> watchPendingCount() {
    final query = _db.selectOnly(_db.syncQueue)
      ..addColumns([_db.syncQueue.id.count()])
      ..where(_db.syncQueue.status.equals('pending'));
    return query.map((row) => row.read(_db.syncQueue.id.count()) ?? 0).watchSingle();
  }

  Future<void> markInProgress(String id) async {
    await (_db.update(_db.syncQueue)..where((t) => t.id.equals(id))).write(
      const SyncQueueCompanion(status: Value('inProgress')),
    );
  }

  Future<void> markSucceeded(String id) async {
    await (_db.update(_db.syncQueue)..where((t) => t.id.equals(id))).write(
      const SyncQueueCompanion(status: Value('succeeded'), lastError: Value(null)),
    );
  }

  Future<void> markFailed({
    required String id,
    required String error,
    required int attempt,
    required DateTime nextAttemptAt,
    bool permanent = false,
  }) async {
    await (_db.update(_db.syncQueue)..where((t) => t.id.equals(id))).write(
      SyncQueueCompanion(
        status: Value(permanent ? 'failed' : 'pending'),
        lastError: Value(error),
        attemptCount: Value(attempt),
        nextAttemptAt: Value(nextAttemptAt),
      ),
    );
  }

  Future<void> setRemoteId({
    required String id,
    required String remoteId,
  }) async {
    await (_db.update(_db.syncQueue)..where((t) => t.id.equals(id))).write(
      SyncQueueCompanion(entityRemoteId: Value(remoteId)),
    );
  }

  Future<void> clearSucceeded({Duration olderThan = const Duration(days: 7)}) async {
    final cutoff = DateTime.now().subtract(olderThan);
    await (_db.delete(_db.syncQueue)
          ..where((t) => t.status.equals('succeeded') & t.createdAt.isSmallerThanValue(cutoff)))
        .go();
  }
}
