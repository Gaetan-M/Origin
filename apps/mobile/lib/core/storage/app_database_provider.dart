// Riverpod providers for the local Drift database and DAOs.
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:origin_mobile/core/storage/app_database.dart';
import 'package:origin_mobile/core/storage/daos/claims_dao.dart';
import 'package:origin_mobile/core/storage/daos/kv_dao.dart';
import 'package:origin_mobile/core/storage/daos/notifications_dao.dart';
import 'package:origin_mobile/core/storage/daos/parent_child_dao.dart';
import 'package:origin_mobile/core/storage/daos/persons_dao.dart';
import 'package:origin_mobile/core/storage/daos/sync_queue_dao.dart';
import 'package:origin_mobile/core/storage/daos/unions_dao.dart';

/// Singleton database. Closed automatically when the provider is disposed.
final Provider<AppDatabase> appDatabaseProvider = Provider<AppDatabase>((ref) {
  final db = AppDatabase();
  ref.onDispose(db.close);
  return db;
});

final Provider<PersonsDao> personsDaoProvider =
    Provider<PersonsDao>((ref) => PersonsDao(ref.watch(appDatabaseProvider)));

final Provider<UnionsDao> unionsDaoProvider =
    Provider<UnionsDao>((ref) => UnionsDao(ref.watch(appDatabaseProvider)));

final Provider<ParentChildDao> parentChildDaoProvider =
    Provider<ParentChildDao>((ref) => ParentChildDao(ref.watch(appDatabaseProvider)));

final Provider<ClaimsDao> claimsDaoProvider =
    Provider<ClaimsDao>((ref) => ClaimsDao(ref.watch(appDatabaseProvider)));

final Provider<NotificationsDao> notificationsDaoProvider =
    Provider<NotificationsDao>((ref) => NotificationsDao(ref.watch(appDatabaseProvider)));

final Provider<SyncQueueDao> syncQueueDaoProvider =
    Provider<SyncQueueDao>((ref) => SyncQueueDao(ref.watch(appDatabaseProvider)));

final Provider<KvDao> kvDaoProvider =
    Provider<KvDao>((ref) => KvDao(ref.watch(appDatabaseProvider)));
