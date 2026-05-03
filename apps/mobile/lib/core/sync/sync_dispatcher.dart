// Resolves the right Agent-3 API service for a given [SyncOperation] and
// performs the network call. Returns the canonical server id of the entity
// (for `create` ops) so the queue can reconcile the local row.
//
// We avoid statically importing every service at the top of `SyncQueue` so
// the queue stays decoupled from the (large) data-api layer.

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:logger/logger.dart';
import 'package:origin_mobile/core/sync/sync_operation.dart';

/// Result of pushing one [SyncOperation] to the server.
class SyncDispatchResult {
  const SyncDispatchResult({
    required this.success,
    this.remoteId,
    this.error,
    this.transient = false,
  });

  /// `true` if the operation was accepted by the server.
  final bool success;

  /// Server-assigned id (only meaningful for `create` ops).
  final String? remoteId;

  /// Human-readable error message.
  final String? error;

  /// Whether the failure is retriable (network/5xx) vs permanent (4xx).
  final bool transient;

  factory SyncDispatchResult.ok({String? remoteId}) =>
      SyncDispatchResult(success: true, remoteId: remoteId);

  factory SyncDispatchResult.transient(String error) =>
      SyncDispatchResult(success: false, error: error, transient: true);

  factory SyncDispatchResult.permanent(String error) =>
      SyncDispatchResult(success: false, error: error);
}

/// Function that pushes a single [SyncOperation]. Implementations call into
/// the appropriate Agent-3 API service.
typedef SyncDispatchHandler = Future<SyncDispatchResult> Function(
  Ref ref,
  SyncOperation op,
);

class SyncDispatcher {
  SyncDispatcher(this._ref, {Map<SyncEntityType, SyncDispatchHandler>? handlers})
      : _handlers = {...?handlers};

  final Ref _ref;
  final Map<SyncEntityType, SyncDispatchHandler> _handlers;
  final Logger _log = Logger();

  /// Allows feature modules to register custom handlers at boot.
  void register(SyncEntityType type, SyncDispatchHandler handler) {
    _handlers[type] = handler;
  }

  Future<SyncDispatchResult> dispatch(SyncOperation op) async {
    final handler = _handlers[op.entityType];
    if (handler == null) {
      _log.w('No dispatcher registered for ${op.entityType.wireName}');
      return SyncDispatchResult.permanent(
        'No dispatcher registered for ${op.entityType.wireName}',
      );
    }
    try {
      return await handler(_ref, op);
    } catch (e, st) {
      _log.e('Dispatcher threw for ${op.entityType.wireName}', error: e, stackTrace: st);
      return SyncDispatchResult.transient(e.toString());
    }
  }
}

/// Provider for [SyncDispatcher]. Feature modules can override this provider
/// or call [SyncDispatcher.register] at startup to attach handlers.
final Provider<SyncDispatcher> syncDispatcherProvider = Provider<SyncDispatcher>((ref) {
  return SyncDispatcher(ref);
});
