import 'dart:async';
import 'dart:io';

import 'package:dio/dio.dart';

import 'package:origin_mobile/core/network/api_exception.dart';

/// Domain-level error type — every API call funnels its failures into one
/// of these so screens / providers handle a small, exhaustive set instead
/// of raw `DioException`/`ApiException` sprawl.
sealed class AppFailure {
  const AppFailure();

  /// User-facing message in French, matching the app's "langage parlé"
  /// guideline (no technical jargon).
  ///
  /// Localization is intentionally hand-written here instead of routed
  /// through `AppLocalizations` so this layer stays decoupled from the
  /// presentation layer. Agent 5/2 can wrap these strings in a localized
  /// resolver if desired.
  String userMessage();

  /// Convert any caught error into an [AppFailure].
  static AppFailure fromException(Object error, [StackTrace? stack]) {
    if (error is AppFailure) return error;

    if (error is ApiException) {
      return _fromApiException(error);
    }

    if (error is DioException) {
      // In practice DioExceptions are upgraded to ApiException by the
      // interceptor. This branch catches the rare cases where they leak.
      return _fromApiException(ApiException.fromDioException(error));
    }

    if (error is SocketException) {
      return const NetworkFailure(reason: NetworkFailureReason.offline);
    }

    if (error is TimeoutException) {
      return const NetworkFailure(reason: NetworkFailureReason.timeout);
    }

    return UnknownFailure(cause: error, stack: stack);
  }

  static AppFailure _fromApiException(ApiException e) {
    if (e.isOffline) {
      return NetworkFailure(
        reason: NetworkFailureReason.offline,
        cause: e,
      );
    }

    final code = e.statusCode;
    if (code == 401) {
      return UnauthorizedFailure(message: e.message, cause: e);
    }
    if (code == 403) {
      return ForbiddenFailure(message: e.message, cause: e);
    }
    if (code == 404) {
      return NotFoundFailure(message: e.message, cause: e);
    }
    if (code == 408 || code == 504) {
      return NetworkFailure(
        reason: NetworkFailureReason.timeout,
        cause: e,
      );
    }
    if (code == 429) {
      Duration? retryAfter;
      final headers = (e.cause is DioException)
          ? (e.cause as DioException).response?.headers
          : null;
      final raw = headers?.value('retry-after');
      if (raw != null) {
        final asInt = int.tryParse(raw);
        if (asInt != null) retryAfter = Duration(seconds: asInt);
      }
      return RateLimitFailure(retryAfter: retryAfter, cause: e);
    }
    if (code == 400 || code == 422) {
      return ValidationFailure(
        fieldErrors: _extractFieldErrors(e),
        message: e.message,
        cause: e,
      );
    }
    if (code >= 500) {
      return ServerFailure(
        statusCode: code,
        code: e.code,
        message: e.message,
        cause: e,
      );
    }
    return ServerFailure(
      statusCode: code,
      code: e.code,
      message: e.message,
      cause: e,
    );
  }

  static Map<String, List<String>> _extractFieldErrors(ApiException e) {
    final details = e.details;
    final result = <String, List<String>>{};
    if (details is List) {
      // class-validator returns plain string lists by default; we keep them
      // under a generic `_` field so consumers can still display them.
      result['_'] = details.map((it) => it?.toString() ?? '').toList();
    }
    return result;
  }
}

enum NetworkFailureReason { offline, timeout }

class NetworkFailure extends AppFailure {
  const NetworkFailure({required this.reason, this.cause});

  final NetworkFailureReason reason;
  final Object? cause;

  @override
  String userMessage() {
    switch (reason) {
      case NetworkFailureReason.offline:
        return 'Pas de connexion. Vérifie ton réseau et réessaie.';
      case NetworkFailureReason.timeout:
        return 'Le serveur a mis trop de temps à répondre. Réessaie.';
    }
  }
}

class ServerFailure extends AppFailure {
  const ServerFailure({
    required this.statusCode,
    this.code,
    required this.message,
    this.cause,
  });

  final int statusCode;
  final String? code;
  final String message;
  final Object? cause;

  @override
  String userMessage() {
    if (statusCode >= 500) {
      return 'Notre serveur a un petit souci. Réessaie dans un instant.';
    }
    return "Ça n'a pas marché, réessaie.";
  }
}

class ValidationFailure extends AppFailure {
  const ValidationFailure({
    required this.fieldErrors,
    required this.message,
    this.cause,
  });

  final Map<String, List<String>> fieldErrors;
  final String message;
  final Object? cause;

  @override
  String userMessage() {
    if (fieldErrors.isNotEmpty) {
      final first = fieldErrors.values.first;
      if (first.isNotEmpty) return first.first;
    }
    return 'Quelques infos sont incorrectes. Vérifie et réessaie.';
  }
}

class UnauthorizedFailure extends AppFailure {
  const UnauthorizedFailure({this.message, this.cause});

  final String? message;
  final Object? cause;

  @override
  String userMessage() => 'Reconnecte-toi pour continuer.';
}

class ForbiddenFailure extends AppFailure {
  const ForbiddenFailure({this.message, this.cause});

  final String? message;
  final Object? cause;

  @override
  String userMessage() => "Tu n'as pas accès à cette action.";
}

class NotFoundFailure extends AppFailure {
  const NotFoundFailure({this.message, this.cause});

  final String? message;
  final Object? cause;

  @override
  String userMessage() => 'On ne trouve pas ce que tu cherches.';
}

class RateLimitFailure extends AppFailure {
  const RateLimitFailure({this.retryAfter, this.cause});

  final Duration? retryAfter;
  final Object? cause;

  @override
  String userMessage() {
    final after = retryAfter;
    if (after != null) {
      final seconds = after.inSeconds;
      return 'Trop d’essais. Réessaie dans ${seconds}s.';
    }
    return 'Trop d’essais. Réessaie dans un instant.';
  }
}

class UnknownFailure extends AppFailure {
  const UnknownFailure({this.cause, this.stack});

  final Object? cause;
  final StackTrace? stack;

  @override
  String userMessage() => "Ça n'a pas marché, réessaie.";
}
