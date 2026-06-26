// Domain model for a single offline operation awaiting push.
//
// Persisted via [SyncQueueDao] / `SyncQueue` Drift table. We keep this as a
// plain Dart class (not freezed) to avoid bringing freezed into the sync core
// — keeps the dependency footprint minimal.

import 'dart:convert';

import 'package:drift/drift.dart';
import 'package:origin_mobile/core/storage/app_database.dart';

enum SyncEntityType {
  person,
  union,
  unionPartner,
  parentChild,
  claim,
  identityDocument,
  notificationRead,
  accountSettings,
  feedReaction,
  feedComment,
}

extension SyncEntityTypeX on SyncEntityType {
  String get wireName => switch (this) {
        SyncEntityType.person => 'person',
        SyncEntityType.union => 'union',
        SyncEntityType.unionPartner => 'union_partner',
        SyncEntityType.parentChild => 'parent_child',
        SyncEntityType.claim => 'claim',
        SyncEntityType.identityDocument => 'identity_document',
        SyncEntityType.notificationRead => 'notification_read',
        SyncEntityType.accountSettings => 'account_settings',
        SyncEntityType.feedReaction => 'feed_reaction',
        SyncEntityType.feedComment => 'feed_comment',
      };

  static SyncEntityType fromWire(String value) {
    return SyncEntityType.values.firstWhere(
      (e) => e.wireName == value,
      orElse: () => throw ArgumentError('Unknown SyncEntityType: $value'),
    );
  }
}

enum SyncOperationType { create, update, delete }

extension SyncOperationTypeX on SyncOperationType {
  String get wireName => name;

  static SyncOperationType fromWire(String value) {
    return SyncOperationType.values.firstWhere(
      (e) => e.wireName == value,
      orElse: () => throw ArgumentError('Unknown SyncOperationType: $value'),
    );
  }
}

enum SyncOperationStatus { pending, inProgress, succeeded, failed }

extension SyncOperationStatusX on SyncOperationStatus {
  String get wireName => name;

  static SyncOperationStatus fromWire(String value) {
    return SyncOperationStatus.values.firstWhere(
      (e) => e.wireName == value,
      orElse: () => SyncOperationStatus.pending,
    );
  }
}

class SyncOperation {
  const SyncOperation({
    required this.id,
    required this.entityType,
    required this.entityLocalId,
    required this.operationType,
    required this.payload,
    required this.createdAt,
    this.entityRemoteId,
    this.attemptCount = 0,
    this.lastError,
    this.status = SyncOperationStatus.pending,
    this.nextAttemptAt,
  });

  final String id;
  final SyncEntityType entityType;
  final String entityLocalId;
  final String? entityRemoteId;
  final SyncOperationType operationType;
  final Map<String, Object?> payload;
  final DateTime createdAt;
  final int attemptCount;
  final String? lastError;
  final SyncOperationStatus status;
  final DateTime? nextAttemptAt;

  SyncOperation copyWith({
    String? id,
    SyncEntityType? entityType,
    String? entityLocalId,
    String? entityRemoteId,
    SyncOperationType? operationType,
    Map<String, Object?>? payload,
    DateTime? createdAt,
    int? attemptCount,
    String? lastError,
    SyncOperationStatus? status,
    DateTime? nextAttemptAt,
  }) {
    return SyncOperation(
      id: id ?? this.id,
      entityType: entityType ?? this.entityType,
      entityLocalId: entityLocalId ?? this.entityLocalId,
      entityRemoteId: entityRemoteId ?? this.entityRemoteId,
      operationType: operationType ?? this.operationType,
      payload: payload ?? this.payload,
      createdAt: createdAt ?? this.createdAt,
      attemptCount: attemptCount ?? this.attemptCount,
      lastError: lastError ?? this.lastError,
      status: status ?? this.status,
      nextAttemptAt: nextAttemptAt ?? this.nextAttemptAt,
    );
  }

  SyncQueueCompanion toCompanion() {
    return SyncQueueCompanion(
      id: Value(id),
      entityType: Value(entityType.wireName),
      entityLocalId: Value(entityLocalId),
      entityRemoteId: Value(entityRemoteId),
      operationType: Value(operationType.wireName),
      payload: Value(jsonEncode(payload)),
      createdAt: Value(createdAt),
      attemptCount: Value(attemptCount),
      lastError: Value(lastError),
      status: Value(status.wireName),
      nextAttemptAt: Value(nextAttemptAt),
    );
  }

  static SyncOperation fromRow(SyncQueueData row) {
    return SyncOperation(
      id: row.id,
      entityType: SyncEntityTypeX.fromWire(row.entityType),
      entityLocalId: row.entityLocalId,
      entityRemoteId: row.entityRemoteId,
      operationType: SyncOperationTypeX.fromWire(row.operationType),
      payload: jsonDecode(row.payload) as Map<String, Object?>,
      createdAt: row.createdAt,
      attemptCount: row.attemptCount,
      lastError: row.lastError,
      status: SyncOperationStatusX.fromWire(row.status),
      nextAttemptAt: row.nextAttemptAt,
    );
  }
}
