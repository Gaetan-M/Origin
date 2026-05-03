// Persons DAO — pure data access for the local Persons table.
//
// No business logic here; that lives in repositories.

import 'package:drift/drift.dart';
import 'package:origin_mobile/core/storage/app_database.dart';

class PersonsDao {
  PersonsDao(this._db);

  final AppDatabase _db;

  Future<int> insertPerson(PersonsCompanion entry) {
    return _db.into(_db.persons).insert(entry, mode: InsertMode.insertOrReplace);
  }

  Future<bool> updatePerson(PersonsCompanion entry) {
    return _db.update(_db.persons).replace(entry);
  }

  Future<int> deletePersonById(String id) {
    return (_db.delete(_db.persons)..where((t) => t.id.equals(id))).go();
  }

  Future<Person?> getById(String id) {
    return (_db.select(_db.persons)..where((t) => t.id.equals(id))).getSingleOrNull();
  }

  Future<List<Person>> getAll() {
    return (_db.select(_db.persons)
          ..where((t) => t.deletedAt.isNull())
          ..orderBy(<OrderClauseGenerator<$PersonsTable>>[
            (t) => OrderingTerm(expression: t.displayName),
          ]))
        .get();
  }

  Stream<Person?> watchById(String id) {
    return (_db.select(_db.persons)..where((t) => t.id.equals(id))).watchSingleOrNull();
  }

  Stream<List<Person>> watchAll() {
    return (_db.select(_db.persons)
          ..where((t) => t.deletedAt.isNull())
          ..orderBy(<OrderClauseGenerator<$PersonsTable>>[
            (t) => OrderingTerm(expression: t.displayName),
          ]))
        .watch();
  }

  /// Updates the id of a locally-created row once we have the server id.
  Future<void> rewriteIdAfterSync({
    required String oldId,
    required String newId,
  }) async {
    await _db.transaction(() async {
      // Update related person rows first.
      await (_db.update(_db.persons)..where((t) => t.id.equals(oldId)))
          .write(PersonsCompanion(
        id: Value(newId),
        isLocalOnly: const Value(false),
        lastSyncedAt: Value(DateTime.now()),
      ));
      await (_db.update(_db.personNames)..where((t) => t.personId.equals(oldId)))
          .write(PersonNamesCompanion(personId: Value(newId)));
      await (_db.update(_db.unionPartners)..where((t) => t.personId.equals(oldId)))
          .write(UnionPartnersCompanion(personId: Value(newId)));
      await (_db.update(_db.parentChild)..where((t) => t.parentId.equals(oldId)))
          .write(ParentChildCompanion(parentId: Value(newId)));
      await (_db.update(_db.parentChild)..where((t) => t.childId.equals(oldId)))
          .write(ParentChildCompanion(childId: Value(newId)));
    });
  }

  Future<void> markSynced(String id) async {
    await (_db.update(_db.persons)..where((t) => t.id.equals(id)))
        .write(PersonsCompanion(
      isLocalOnly: const Value(false),
      lastSyncedAt: Value(DateTime.now()),
    ));
  }
}
