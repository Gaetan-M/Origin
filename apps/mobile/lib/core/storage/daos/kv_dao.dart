// Generic key/value DAO — used for ad-hoc settings, last sync timestamps, etc.
import 'package:drift/drift.dart';
import 'package:origin_mobile/core/storage/app_database.dart';

class KvDao {
  KvDao(this._db);

  final AppDatabase _db;

  Future<String?> get(String key) async {
    final row = await (_db.select(_db.kvStore)..where((t) => t.key.equals(key)))
        .getSingleOrNull();
    return row?.value;
  }

  Future<void> set(String key, String value) async {
    await _db.into(_db.kvStore).insert(
          KvStoreCompanion(
            key: Value(key),
            value: Value(value),
            updatedAt: Value(DateTime.now()),
          ),
          mode: InsertMode.insertOrReplace,
        );
  }

  Future<void> remove(String key) async {
    await (_db.delete(_db.kvStore)..where((t) => t.key.equals(key))).go();
  }

  Stream<String?> watch(String key) {
    return (_db.select(_db.kvStore)..where((t) => t.key.equals(key)))
        .watchSingleOrNull()
        .map((row) => row?.value);
  }

  Future<int?> getInt(String key) async {
    final raw = await get(key);
    if (raw == null) {
      return null;
    }
    return int.tryParse(raw);
  }

  Future<void> setInt(String key, int value) => set(key, value.toString());

  Future<bool> getBool(String key, {bool defaultValue = false}) async {
    final raw = await get(key);
    if (raw == null) {
      return defaultValue;
    }
    return raw == 'true' || raw == '1';
  }

  Future<void> setBool(String key, {required bool value}) => set(key, value.toString());

  Future<DateTime?> getDateTime(String key) async {
    final raw = await get(key);
    if (raw == null) {
      return null;
    }
    return DateTime.tryParse(raw);
  }

  Future<void> setDateTime(String key, DateTime value) => set(key, value.toIso8601String());
}
