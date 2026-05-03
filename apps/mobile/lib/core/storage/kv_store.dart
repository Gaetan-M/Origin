// Tiny key/value store backed by Drift's `KvStore` table.
//
// Used for non-sensitive flags (e.g. `firstLaunchComplete`, onboarding
// progress JSON, last opened tab) that benefit from being purged at logout.

import 'package:drift/drift.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:origin_mobile/core/storage/app_database.dart';
import 'package:origin_mobile/core/storage/app_database_provider.dart';

/// Convenience facade around the [KvStore] table.
class KvStore {
  KvStore(this._db);

  final AppDatabase _db;

  Future<String?> getString(String key) async {
    final row = await (_db.select(_db.kvStore)
          ..where((t) => t.key.equals(key)))
        .getSingleOrNull();
    return row?.value;
  }

  Future<void> setString(String key, String value) async {
    await _db.into(_db.kvStore).insertOnConflictUpdate(
          KvStoreCompanion(
            key: Value<String>(key),
            value: Value<String>(value),
            updatedAt: Value<DateTime>(DateTime.now()),
          ),
        );
  }

  Future<bool> getBool(String key, {bool defaultValue = false}) async {
    final raw = await getString(key);
    if (raw == null) return defaultValue;
    return raw == '1' || raw.toLowerCase() == 'true';
  }

  Future<void> setBool(String key, {required bool value}) {
    return setString(key, value ? '1' : '0');
  }

  Future<void> remove(String key) async {
    await (_db.delete(_db.kvStore)..where((t) => t.key.equals(key))).go();
  }
}

/// Provider exposing the kv-store facade.
final Provider<KvStore> kvStoreProvider = Provider<KvStore>(
  (ref) => KvStore(ref.watch(appDatabaseProvider)),
);
