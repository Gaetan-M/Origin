// ParentChild DAO.
import 'package:drift/drift.dart';
import 'package:origin_mobile/core/storage/app_database.dart';

class ParentChildDao {
  ParentChildDao(this._db);

  final AppDatabase _db;

  Future<int> insertLink(ParentChildCompanion entry) {
    return _db.into(_db.parentChild).insert(entry, mode: InsertMode.insertOrReplace);
  }

  Future<bool> updateLink(ParentChildCompanion entry) {
    return _db.update(_db.parentChild).replace(entry);
  }

  Future<int> deleteLinkById(String id) {
    return (_db.delete(_db.parentChild)..where((t) => t.id.equals(id))).go();
  }

  Future<ParentChildData?> getById(String id) {
    return (_db.select(_db.parentChild)..where((t) => t.id.equals(id))).getSingleOrNull();
  }

  Future<List<ParentChildData>> findParentsOf(String childId) {
    return (_db.select(_db.parentChild)
          ..where((t) => t.childId.equals(childId) & t.deletedAt.isNull()))
        .get();
  }

  Future<List<ParentChildData>> findChildrenOf(String parentId) {
    return (_db.select(_db.parentChild)
          ..where((t) => t.parentId.equals(parentId) & t.deletedAt.isNull()))
        .get();
  }

  Stream<List<ParentChildData>> watchParentsOf(String childId) {
    return (_db.select(_db.parentChild)
          ..where((t) => t.childId.equals(childId) & t.deletedAt.isNull()))
        .watch();
  }

  Stream<List<ParentChildData>> watchChildrenOf(String parentId) {
    return (_db.select(_db.parentChild)
          ..where((t) => t.parentId.equals(parentId) & t.deletedAt.isNull()))
        .watch();
  }

  Future<void> markSynced(String id) async {
    await (_db.update(_db.parentChild)..where((t) => t.id.equals(id))).write(
      ParentChildCompanion(
        isLocalOnly: const Value(false),
        lastSyncedAt: Value(DateTime.now()),
      ),
    );
  }

  Future<void> rewriteIdAfterSync({
    required String oldId,
    required String newId,
  }) async {
    await (_db.update(_db.parentChild)..where((t) => t.id.equals(oldId))).write(
      ParentChildCompanion(
        id: Value(newId),
        isLocalOnly: const Value(false),
        lastSyncedAt: Value(DateTime.now()),
      ),
    );
  }
}
