// Claims DAO.
import 'package:drift/drift.dart';
import 'package:origin_mobile/core/storage/app_database.dart';

class ClaimsDao {
  ClaimsDao(this._db);

  final AppDatabase _db;

  Future<int> insertClaim(ClaimsCompanion entry) {
    return _db.into(_db.claims).insert(entry, mode: InsertMode.insertOrReplace);
  }

  Future<bool> updateClaim(ClaimsCompanion entry) {
    return _db.update(_db.claims).replace(entry);
  }

  Future<int> deleteClaimById(String id) {
    return (_db.delete(_db.claims)..where((t) => t.id.equals(id))).go();
  }

  Future<Claim?> getById(String id) {
    return (_db.select(_db.claims)..where((t) => t.id.equals(id))).getSingleOrNull();
  }

  Future<List<Claim>> getMine(String accountId) {
    return (_db.select(_db.claims)..where((t) => t.accountId.equals(accountId))).get();
  }

  Future<List<Claim>> getPending() {
    return (_db.select(_db.claims)..where((t) => t.status.equals('PENDING'))).get();
  }

  Stream<List<Claim>> watchMine(String accountId) {
    return (_db.select(_db.claims)..where((t) => t.accountId.equals(accountId))).watch();
  }

  Stream<List<Claim>> watchPending() {
    return (_db.select(_db.claims)..where((t) => t.status.equals('PENDING'))).watch();
  }

  Future<void> markSynced(String id) async {
    await (_db.update(_db.claims)..where((t) => t.id.equals(id))).write(
      ClaimsCompanion(
        isLocalOnly: const Value(false),
        lastSyncedAt: Value(DateTime.now()),
      ),
    );
  }

  Future<void> rewriteIdAfterSync({
    required String oldId,
    required String newId,
  }) async {
    await (_db.update(_db.claims)..where((t) => t.id.equals(oldId))).write(
      ClaimsCompanion(
        id: Value(newId),
        isLocalOnly: const Value(false),
        lastSyncedAt: Value(DateTime.now()),
      ),
    );
  }
}
