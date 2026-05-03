// Notifications DAO (local cache only).
import 'package:drift/drift.dart';
import 'package:origin_mobile/core/storage/app_database.dart';

class NotificationsDao {
  NotificationsDao(this._db);

  final AppDatabase _db;

  Future<int> insertNotification(NotificationsLocalCompanion entry) {
    return _db.into(_db.notificationsLocal).insert(entry, mode: InsertMode.insertOrReplace);
  }

  Future<int> upsertMany(List<NotificationsLocalCompanion> rows) async {
    var changed = 0;
    await _db.batch((b) {
      b.insertAll(_db.notificationsLocal, rows, mode: InsertMode.insertOrReplace);
    });
    changed = rows.length;
    return changed;
  }

  Future<NotificationsLocalData?> getById(String id) {
    return (_db.select(_db.notificationsLocal)..where((t) => t.id.equals(id)))
        .getSingleOrNull();
  }

  Future<List<NotificationsLocalData>> getAllForAccount(String accountId) {
    return (_db.select(_db.notificationsLocal)
          ..where((t) => t.accountId.equals(accountId))
          ..orderBy(<OrderClauseGenerator<$NotificationsLocalTable>>[
            (t) => OrderingTerm(expression: t.createdAt, mode: OrderingMode.desc),
          ]))
        .get();
  }

  Stream<List<NotificationsLocalData>> watchAllForAccount(String accountId) {
    return (_db.select(_db.notificationsLocal)
          ..where((t) => t.accountId.equals(accountId))
          ..orderBy(<OrderClauseGenerator<$NotificationsLocalTable>>[
            (t) => OrderingTerm(expression: t.createdAt, mode: OrderingMode.desc),
          ]))
        .watch();
  }

  Stream<int> watchUnreadCount(String accountId) {
    final query = _db.selectOnly(_db.notificationsLocal)
      ..addColumns([_db.notificationsLocal.id.count()])
      ..where(_db.notificationsLocal.accountId.equals(accountId) &
          _db.notificationsLocal.isRead.equals(false));
    return query.map((row) => row.read(_db.notificationsLocal.id.count()) ?? 0).watchSingle();
  }

  Future<void> markRead(String id) async {
    await (_db.update(_db.notificationsLocal)..where((t) => t.id.equals(id))).write(
      NotificationsLocalCompanion(
        isRead: const Value(true),
        readAt: Value(DateTime.now()),
      ),
    );
  }

  Future<void> markAllRead(String accountId) async {
    await (_db.update(_db.notificationsLocal)..where((t) => t.accountId.equals(accountId)))
        .write(NotificationsLocalCompanion(
      isRead: const Value(true),
      readAt: Value(DateTime.now()),
    ));
  }

  Future<int> deleteById(String id) {
    return (_db.delete(_db.notificationsLocal)..where((t) => t.id.equals(id))).go();
  }

  Future<void> clearForAccount(String accountId) async {
    await (_db.delete(_db.notificationsLocal)..where((t) => t.accountId.equals(accountId)))
        .go();
  }
}
