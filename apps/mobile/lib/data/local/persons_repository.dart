import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:origin_mobile/core/storage/app_database.dart';
import 'package:origin_mobile/core/storage/app_database_provider.dart';
import 'package:origin_mobile/data/models/family_tree.dart';
import 'package:origin_mobile/data/models/person.dart';

/// Read/write facade over the [Persons] / [PersonNames] tables.
///
/// All write methods are best-effort — they swallow errors so they can be
/// used as a "background cache" off the network code path.
class PersonsRepository {
  PersonsRepository(this._db);

  final AppDatabase _db;

  Future<Person?> findById(String id) async {
    try {
      final row = await (_db.select(_db.persons)
            ..where((t) => t.id.equals(id)))
          .getSingleOrNull();
      if (row == null) return null;
      return _toPerson(row);
    } catch (_) {
      return null;
    }
  }

  Future<List<Person>> findMine() async {
    try {
      final rows = await _db.select(_db.persons).get();
      return rows.map(_toPerson).toList();
    } catch (_) {
      return const <Person>[];
    }
  }

  Future<void> upsertFromRemote(Person person) async {
    // Best-effort cache write. Swallow errors so the UI thread is never
    // blocked when the local DB is misconfigured.
    try {
      await _db.into(_db.persons).insertOnConflictUpdate(
            _personToCompanion(person),
          );
    } catch (_) {
      // ignore
    }
  }

  Future<void> upsertFamilyTree(FamilyTree tree) async {
    try {
      for (final p in tree.persons) {
        await upsertFromRemote(p);
      }
    } catch (_) {
      // ignore
    }
  }

  Future<FamilyTree?> findFamilyTree(String centerPersonId) async {
    try {
      final all = await findMine();
      if (all.isEmpty) return null;
      return FamilyTree(centerPersonId: centerPersonId, persons: all);
    } catch (_) {
      return null;
    }
  }

  Person _toPerson(PersonsData row) {
    return Person(
      id: row.id,
      displayName: row.displayName,
      normalizedName: row.normalizedName,
      gender: row.gender,
      birthYearApproximate: row.birthYearApproximate,
      birthDateText: row.birthDateText,
      birthPlace: row.birthPlace,
      villageOrigin: row.villageOrigin,
      ethnicity: row.ethnicity,
      biography: row.biography,
      occupation: row.occupation,
      hasPhoto: row.hasPhoto,
      primaryPhotoId: row.primaryPhotoId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    );
  }

  PersonsCompanion _personToCompanion(Person p) {
    final now = DateTime.now();
    return PersonsCompanion.insert(
      id: p.id,
      displayName: p.displayName,
      normalizedName: p.normalizedName ?? p.displayName.toLowerCase(),
      createdAt: p.createdAt ?? now,
      updatedAt: p.updatedAt ?? now,
    );
  }
}

final Provider<PersonsRepository> personsRepositoryProvider =
    Provider<PersonsRepository>(
  (ref) => PersonsRepository(ref.watch(appDatabaseProvider)),
);
