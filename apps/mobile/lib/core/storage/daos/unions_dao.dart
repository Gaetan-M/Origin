// Unions DAO.
import 'package:drift/drift.dart';
import 'package:origin_mobile/core/storage/app_database.dart';

class UnionsDao {
  UnionsDao(this._db);

  final AppDatabase _db;

  Future<int> insertUnion(UnionsCompanion entry) {
    return _db.into(_db.unions).insert(entry, mode: InsertMode.insertOrReplace);
  }

  Future<bool> updateUnion(UnionsCompanion entry) {
    return _db.update(_db.unions).replace(entry);
  }

  Future<int> deleteUnionById(String id) {
    return (_db.delete(_db.unions)..where((t) => t.id.equals(id))).go();
  }

  Future<Union?> getById(String id) {
    return (_db.select(_db.unions)..where((t) => t.id.equals(id))).getSingleOrNull();
  }

  Future<List<Union>> getAll() {
    return (_db.select(_db.unions)
          ..where((t) => t.deletedAt.isNull())
          ..orderBy(<OrderClauseGenerator<$UnionsTable>>[
            (t) => OrderingTerm(expression: t.startDate, mode: OrderingMode.desc),
          ]))
        .get();
  }

  Stream<List<Union>> watchAll() {
    return (_db.select(_db.unions)
          ..where((t) => t.deletedAt.isNull()))
        .watch();
  }

  Stream<Union?> watchById(String id) {
    return (_db.select(_db.unions)..where((t) => t.id.equals(id))).watchSingleOrNull();
  }

  Future<List<UnionPartner>> partnersForUnion(String unionId) {
    return (_db.select(_db.unionPartners)..where((t) => t.unionId.equals(unionId))).get();
  }

  Future<int> insertPartner(UnionPartnersCompanion entry) {
    return _db.into(_db.unionPartners).insert(entry, mode: InsertMode.insertOrReplace);
  }

  Future<int> deletePartner(String id) {
    return (_db.delete(_db.unionPartners)..where((t) => t.id.equals(id))).go();
  }

  Future<void> markSynced(String id) async {
    await (_db.update(_db.unions)..where((t) => t.id.equals(id))).write(
      UnionsCompanion(
        isLocalOnly: const Value(false),
        lastSyncedAt: Value(DateTime.now()),
      ),
    );
  }

  Future<void> rewriteIdAfterSync({
    required String oldId,
    required String newId,
  }) async {
    await _db.transaction(() async {
      await (_db.update(_db.unions)..where((t) => t.id.equals(oldId))).write(
        UnionsCompanion(
          id: Value(newId),
          isLocalOnly: const Value(false),
          lastSyncedAt: Value(DateTime.now()),
        ),
      );
      await (_db.update(_db.unionPartners)..where((t) => t.unionId.equals(oldId)))
          .write(UnionPartnersCompanion(unionId: Value(newId)));
      await (_db.update(_db.parentChild)..where((t) => t.unionId.equals(oldId)))
          .write(ParentChildCompanion(unionId: Value(newId)));
    });
  }
}
