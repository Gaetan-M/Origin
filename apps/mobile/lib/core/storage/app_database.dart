// Drift database for Origin mobile.
//
// Mirrors the essential entities from `apps/api/prisma/schema.prisma` so the
// app can operate fully offline and sync deltas opportunistically. We do NOT
// mirror sensitive material (e.g. encrypted document numbers) — only what is
// safe and useful on-device.
//
// Conventions:
//   * Table classes are PascalCase plural (Persons, Unions, ...).
//   * Primary keys are TEXT (UUID v4). For locally-created rows we generate a
//     temporary UUID; once the server returns an id we rewrite the row.
//   * Enums are stored as TEXT to keep migrations cheap.
//   * Timestamps are `DateTime` columns (Drift stores them as ISO-8601).
//
// ignore_for_file: lines_longer_than_80_chars

import 'dart:io';

import 'package:drift/drift.dart';
import 'package:drift/native.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:sqlite3/sqlite3.dart';
import 'package:sqlite3_flutter_libs/sqlite3_flutter_libs.dart';

part 'app_database.g.dart';

// ============================================================================
// TABLES
// ============================================================================

class Accounts extends Table {
  TextColumn get id => text()();
  TextColumn get phoneNumber => text()();
  TextColumn get phoneCountryCode => text().withDefault(const Constant('+237'))();
  TextColumn get fullName => text().nullable()();
  TextColumn get email => text().nullable()();
  TextColumn get languagePreference => text().withDefault(const Constant('fr'))();
  BoolColumn get dataSaverMode => boolean().withDefault(const Constant(false))();
  BoolColumn get largeTextMode => boolean().withDefault(const Constant(false))();
  BoolColumn get whatsappEnabled => boolean().withDefault(const Constant(true))();
  BoolColumn get pinEnabled => boolean().withDefault(const Constant(false))();
  TextColumn get role => text().withDefault(const Constant('USER'))();
  DateTimeColumn get lastLoginAt => dateTime().nullable()();
  DateTimeColumn get createdAt => dateTime()();
  DateTimeColumn get updatedAt => dateTime()();
  DateTimeColumn get deletedAt => dateTime().nullable()();

  @override
  Set<Column<Object>> get primaryKey => {id};
}

class Persons extends Table {
  TextColumn get id => text()();
  TextColumn get displayName => text()();
  TextColumn get normalizedName => text()();
  TextColumn get gender => text().nullable()();
  TextColumn get lifeStatus => text().withDefault(const Constant('UNKNOWN'))();
  BoolColumn get deceasedAssumed => boolean().withDefault(const Constant(false))();
  DateTimeColumn get birthDate => dateTime().nullable()();
  TextColumn get birthDatePrecision => text().withDefault(const Constant('UNKNOWN'))();
  IntColumn get birthYearApproximate => integer().nullable()();
  TextColumn get birthDateText => text().nullable()();
  DateTimeColumn get deceasedDate => dateTime().nullable()();
  TextColumn get deceasedDatePrecision => text().withDefault(const Constant('UNKNOWN'))();
  IntColumn get deceasedYearApproximate => integer().nullable()();
  TextColumn get deceasedDateText => text().nullable()();
  TextColumn get birthPlace => text().nullable()();
  TextColumn get birthRegion => text().nullable()();
  TextColumn get birthCountry => text().nullable()();
  TextColumn get deceasedPlace => text().nullable()();
  TextColumn get deceasedRegion => text().nullable()();
  TextColumn get deceasedCountry => text().nullable()();
  TextColumn get currentResidencePlace => text().nullable()();
  TextColumn get currentResidenceCountry => text().nullable()();
  TextColumn get ethnicity => text().nullable()();
  TextColumn get villageOrigin => text().nullable()();
  TextColumn get chefferie => text().nullable()();
  TextColumn get biography => text().nullable()();
  TextColumn get occupation => text().nullable()();
  TextColumn get phoneNumber => text().nullable()();
  TextColumn get primaryPhotoId => text().nullable()();
  BoolColumn get hasPhoto => boolean().withDefault(const Constant(false))();
  TextColumn get verificationLevel => text().withDefault(const Constant('UNVERIFIED'))();
  RealColumn get confidenceScore => real().withDefault(const Constant(0.0))();
  TextColumn get createdByAccountId => text().nullable()();
  TextColumn get updatedByAccountId => text().nullable()();
  TextColumn get claimedByAccountId => text().nullable()();
  DateTimeColumn get claimVerifiedAt => dateTime().nullable()();
  BoolColumn get isPublic => boolean().withDefault(const Constant(false))();
  IntColumn get privacyLevel => integer().withDefault(const Constant(1))();
  DateTimeColumn get createdAt => dateTime()();
  DateTimeColumn get updatedAt => dateTime()();
  DateTimeColumn get deletedAt => dateTime().nullable()();
  // Local-only flags
  BoolColumn get isLocalOnly => boolean().withDefault(const Constant(false))();
  DateTimeColumn get lastSyncedAt => dateTime().nullable()();

  @override
  Set<Column<Object>> get primaryKey => {id};
}

class PersonNames extends Table {
  TextColumn get id => text()();
  TextColumn get personId => text().references(Persons, #id, onDelete: KeyAction.cascade)();
  TextColumn get nameType => text()();
  TextColumn get fullName => text()();
  TextColumn get firstName => text().nullable()();
  TextColumn get lastName => text().nullable()();
  TextColumn get middleNames => text().nullable()();
  TextColumn get normalizedFullName => text()();
  BoolColumn get isPrimary => boolean().withDefault(const Constant(false))();
  DateTimeColumn get usedFromDate => dateTime().nullable()();
  DateTimeColumn get usedUntilDate => dateTime().nullable()();
  DateTimeColumn get createdAt => dateTime()();
  DateTimeColumn get updatedAt => dateTime()();

  @override
  Set<Column<Object>> get primaryKey => {id};
}

class Unions extends Table {
  TextColumn get id => text()();
  TextColumn get unionType => text().withDefault(const Constant('UNKNOWN'))();
  TextColumn get status => text().withDefault(const Constant('UNKNOWN'))();
  DateTimeColumn get startDate => dateTime().nullable()();
  TextColumn get startDatePrecision => text().withDefault(const Constant('UNKNOWN'))();
  IntColumn get startYearApproximate => integer().nullable()();
  TextColumn get startDateText => text().nullable()();
  DateTimeColumn get endDate => dateTime().nullable()();
  TextColumn get endDatePrecision => text().withDefault(const Constant('UNKNOWN'))();
  IntColumn get endYearApproximate => integer().nullable()();
  TextColumn get endReason => text().nullable()();
  TextColumn get place => text().nullable()();
  TextColumn get notes => text().nullable()();
  TextColumn get createdByAccountId => text().nullable()();
  DateTimeColumn get createdAt => dateTime()();
  DateTimeColumn get updatedAt => dateTime()();
  DateTimeColumn get deletedAt => dateTime().nullable()();
  BoolColumn get isLocalOnly => boolean().withDefault(const Constant(false))();
  DateTimeColumn get lastSyncedAt => dateTime().nullable()();

  @override
  Set<Column<Object>> get primaryKey => {id};
}

class UnionPartners extends Table {
  TextColumn get id => text()();
  TextColumn get unionId => text().references(Unions, #id, onDelete: KeyAction.cascade)();
  TextColumn get personId => text().references(Persons, #id, onDelete: KeyAction.cascade)();
  TextColumn get role => text().nullable()();
  IntColumn get wifeRank => integer().nullable()();
  DateTimeColumn get createdAt => dateTime()();

  @override
  Set<Column<Object>> get primaryKey => {id};
}

class ParentChild extends Table {
  TextColumn get id => text()();
  TextColumn get parentId => text().references(Persons, #id, onDelete: KeyAction.cascade)();
  TextColumn get childId => text().references(Persons, #id, onDelete: KeyAction.cascade)();
  TextColumn get relationshipType => text().withDefault(const Constant('BIOLOGICAL'))();
  TextColumn get unionId => text().nullable()();
  RealColumn get confidence => real().withDefault(const Constant(1.0))();
  TextColumn get notes => text().nullable()();
  TextColumn get createdByAccountId => text().nullable()();
  DateTimeColumn get createdAt => dateTime()();
  DateTimeColumn get updatedAt => dateTime()();
  DateTimeColumn get deletedAt => dateTime().nullable()();
  BoolColumn get isLocalOnly => boolean().withDefault(const Constant(false))();
  DateTimeColumn get lastSyncedAt => dateTime().nullable()();

  @override
  Set<Column<Object>> get primaryKey => {id};
}

class Claims extends Table {
  TextColumn get id => text()();
  TextColumn get accountId => text()();
  TextColumn get personId => text()();
  TextColumn get status => text().withDefault(const Constant('PENDING'))();
  TextColumn get verificationLevel => text().withDefault(const Constant('SELF_DECLARED'))();
  IntColumn get validationCount => integer().withDefault(const Constant(0))();
  TextColumn get disputedByClaimId => text().nullable()();
  TextColumn get disputeReason => text().nullable()();
  TextColumn get evidence => text().nullable()();
  DateTimeColumn get createdAt => dateTime()();
  DateTimeColumn get updatedAt => dateTime()();
  DateTimeColumn get resolvedAt => dateTime().nullable()();
  BoolColumn get isLocalOnly => boolean().withDefault(const Constant(false))();
  DateTimeColumn get lastSyncedAt => dateTime().nullable()();

  @override
  Set<Column<Object>> get primaryKey => {id};
}

class IdentityDocuments extends Table {
  TextColumn get id => text()();
  TextColumn get personId => text()();
  TextColumn get documentType => text()();
  // We do NOT store the encrypted document number on-device. Only metadata.
  TextColumn get documentNumberLast4 => text().nullable()();
  TextColumn get issuingAuthority => text().nullable()();
  TextColumn get issuingPlace => text().nullable()();
  DateTimeColumn get issueDate => dateTime().nullable()();
  DateTimeColumn get expiryDate => dateTime().nullable()();
  TextColumn get scanFileId => text().nullable()();
  DateTimeColumn get scanExpiresAt => dateTime().nullable()();
  TextColumn get verificationStatus => text().withDefault(const Constant('SELF_DECLARED'))();
  TextColumn get verifiedByAccountId => text().nullable()();
  DateTimeColumn get verifiedAt => dateTime().nullable()();
  TextColumn get addedByAccountId => text().nullable()();
  DateTimeColumn get createdAt => dateTime()();
  DateTimeColumn get updatedAt => dateTime()();
  DateTimeColumn get deletedAt => dateTime().nullable()();

  @override
  Set<Column<Object>> get primaryKey => {id};
}

class FamilyCodes extends Table {
  TextColumn get id => text()();
  TextColumn get code => text()();
  TextColumn get accountId => text()();
  TextColumn get label => text().nullable()();
  IntColumn get maxUses => integer().withDefault(const Constant(50))();
  IntColumn get usedCount => integer().withDefault(const Constant(0))();
  DateTimeColumn get expiresAt => dateTime()();
  DateTimeColumn get revokedAt => dateTime().nullable()();
  DateTimeColumn get createdAt => dateTime()();

  @override
  Set<Column<Object>> get primaryKey => {id};
}

class FamilyCodeUses extends Table {
  TextColumn get id => text()();
  TextColumn get familyCodeId => text().references(FamilyCodes, #id, onDelete: KeyAction.cascade)();
  TextColumn get usedByAccountId => text()();
  DateTimeColumn get usedAt => dateTime()();

  @override
  Set<Column<Object>> get primaryKey => {id};
}

class Invitations extends Table {
  TextColumn get id => text()();
  TextColumn get token => text()();
  TextColumn get inviterAccountId => text()();
  TextColumn get targetPersonId => text().nullable()();
  TextColumn get targetPhoneNumber => text().nullable()();
  TextColumn get relationshipHint => text().nullable()();
  TextColumn get channel => text().nullable()();
  DateTimeColumn get usedAt => dateTime().nullable()();
  TextColumn get usedByAccountId => text().nullable()();
  DateTimeColumn get expiresAt => dateTime()();
  DateTimeColumn get createdAt => dateTime()();

  @override
  Set<Column<Object>> get primaryKey => {id};
}

class NotificationsLocal extends Table {
  TextColumn get id => text()();
  TextColumn get accountId => text()();
  TextColumn get notificationType => text()();
  TextColumn get title => text()();
  TextColumn get body => text().nullable()();
  TextColumn get relatedEntityType => text().nullable()();
  TextColumn get relatedEntityId => text().nullable()();
  TextColumn get actionUrl => text().nullable()();
  TextColumn get channelsCsv => text().withDefault(const Constant('push'))();
  DateTimeColumn get sentAt => dateTime().nullable()();
  BoolColumn get isRead => boolean().withDefault(const Constant(false))();
  DateTimeColumn get readAt => dateTime().nullable()();
  DateTimeColumn get createdAt => dateTime()();

  @override
  Set<Column<Object>> get primaryKey => {id};
}

class MediaLocal extends Table {
  TextColumn get id => text()();
  TextColumn get fileType => text()();
  TextColumn get mimeType => text().nullable()();
  IntColumn get fileSizeBytes => integer().nullable()();
  TextColumn get s3Key => text().nullable()();
  TextColumn get cdnUrl => text().nullable()();
  TextColumn get localFilePath => text().nullable()();
  IntColumn get width => integer().nullable()();
  IntColumn get height => integer().nullable()();
  IntColumn get durationSeconds => integer().nullable()();
  TextColumn get personId => text().nullable()();
  IntColumn get photoYear => integer().nullable()();
  TextColumn get uploadedByAccountId => text().nullable()();
  DateTimeColumn get createdAt => dateTime()();
  DateTimeColumn get expiresAt => dateTime().nullable()();
  DateTimeColumn get deletedAt => dateTime().nullable()();
  BoolColumn get isUploaded => boolean().withDefault(const Constant(false))();

  @override
  Set<Column<Object>> get primaryKey => {id};
}

class SyncQueue extends Table {
  TextColumn get id => text()();
  TextColumn get entityType => text()();
  TextColumn get entityLocalId => text()();
  TextColumn get entityRemoteId => text().nullable()();
  TextColumn get operationType => text()();
  TextColumn get payload => text()();
  DateTimeColumn get createdAt => dateTime()();
  IntColumn get attemptCount => integer().withDefault(const Constant(0))();
  TextColumn get lastError => text().nullable()();
  TextColumn get status => text().withDefault(const Constant('pending'))();
  DateTimeColumn get nextAttemptAt => dateTime().nullable()();

  @override
  Set<Column<Object>> get primaryKey => {id};
}

class KvStore extends Table {
  TextColumn get key => text()();
  TextColumn get value => text()();
  DateTimeColumn get updatedAt => dateTime()();

  @override
  Set<Column<Object>> get primaryKey => {key};
}

// ============================================================================
// DAOS — declared in separate files but included via @DriftAccessor below.
// ============================================================================

@DriftDatabase(
  tables: [
    Accounts,
    Persons,
    PersonNames,
    Unions,
    UnionPartners,
    ParentChild,
    Claims,
    IdentityDocuments,
    FamilyCodes,
    FamilyCodeUses,
    Invitations,
    NotificationsLocal,
    MediaLocal,
    SyncQueue,
    KvStore,
  ],
)
class AppDatabase extends _$AppDatabase {
  AppDatabase() : super(_openConnection());

  /// Override the default executor (used by tests with an in-memory DB).
  AppDatabase.forExecutor(super.executor);

  @override
  int get schemaVersion => 1;

  @override
  MigrationStrategy get migration => MigrationStrategy(
        onCreate: (m) async {
          await m.createAll();
        },
        beforeOpen: (details) async {
          // Enable foreign keys (off by default in SQLite).
          await customStatement('PRAGMA foreign_keys = ON');
        },
      );

  /// Wipes every table — used at logout to make sure no stale data is left
  /// behind. Schema metadata and the database file itself are preserved.
  Future<void> drainAll() async {
    await transaction(() async {
      await delete(syncQueue).go();
      await delete(notificationsLocal).go();
      await delete(mediaLocal).go();
      await delete(invitations).go();
      await delete(familyCodeUses).go();
      await delete(familyCodes).go();
      await delete(identityDocuments).go();
      await delete(claims).go();
      await delete(parentChild).go();
      await delete(unionPartners).go();
      await delete(unions).go();
      await delete(personNames).go();
      await delete(persons).go();
      await delete(accounts).go();
      await delete(kvStore).go();
    });
  }

  static QueryExecutor _openConnection() {
    return LazyDatabase(() async {
      // sqlite3_flutter_libs ships an Android workaround we should apply.
      if (Platform.isAndroid) {
        await applyWorkaroundToOpenSqlite3OnOldAndroidVersions();
      }
      final dbFolder = await getApplicationDocumentsDirectory();
      final file = File(p.join(dbFolder.path, 'origin.sqlite'));

      // Make sqlite3 use a temporary directory that the platform allows.
      final cachebase = (await getTemporaryDirectory()).path;
      sqlite3.tempDirectory = cachebase;

      return NativeDatabase.createInBackground(file);
    });
  }
}
