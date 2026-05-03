import 'package:origin_mobile/core/error/app_failure.dart';

/// Discriminated union that carries either a value or a typed [AppFailure].
///
/// Prefer `Result<T>` over throwing across layer boundaries (API <-> repo
/// <-> notifier). Inside a single layer, throwing is fine if we catch and
/// convert at the boundary.
sealed class Result<T> {
  const Result();

  /// Build a successful result.
  const factory Result.success(T value) = Success<T>;

  /// Build a failed result.
  const factory Result.failure(AppFailure failure) = Failure<T>;

  /// Whether this result represents a success.
  bool get isSuccess => this is Success<T>;

  /// Whether this result represents a failure.
  bool get isFailure => this is Failure<T>;

  /// Pattern-matches on the variant and returns the result of the called
  /// branch. Both branches must be provided.
  R when<R>({
    required R Function(T value) success,
    required R Function(AppFailure failure) failure,
  }) {
    final self = this;
    if (self is Success<T>) {
      return success(self.value);
    }
    return failure((self as Failure<T>).failure);
  }

  /// Like [when] but with a friendlier name for callers reading
  /// `result.fold(...)`.
  R fold<R>({
    required R Function(T value) onSuccess,
    required R Function(AppFailure failure) onFailure,
  }) =>
      when(success: onSuccess, failure: onFailure);

  /// Map the success value, leaving failures untouched.
  Result<R> map<R>(R Function(T value) mapper) {
    final self = this;
    if (self is Success<T>) {
      return Result<R>.success(mapper(self.value));
    }
    return Result<R>.failure((self as Failure<T>).failure);
  }

  /// Chain another [Result]-producing computation.
  Result<R> flatMap<R>(Result<R> Function(T value) mapper) {
    final self = this;
    if (self is Success<T>) {
      return mapper(self.value);
    }
    return Result<R>.failure((self as Failure<T>).failure);
  }

  /// Returns the wrapped value or `null` for failures.
  T? get valueOrNull => this is Success<T> ? (this as Success<T>).value : null;

  /// Returns the wrapped failure or `null` for successes.
  AppFailure? get failureOrNull =>
      this is Failure<T> ? (this as Failure<T>).failure : null;
}

/// Successful variant.
final class Success<T> extends Result<T> {
  const Success(this.value);

  final T value;

  @override
  String toString() => 'Success<$T>($value)';

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is Success<T> && other.value == value);

  @override
  int get hashCode => value.hashCode;
}

/// Failed variant.
final class Failure<T> extends Result<T> {
  const Failure(this.failure);

  final AppFailure failure;

  @override
  String toString() => 'Failure<$T>($failure)';

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is Failure<T> && other.failure == failure);

  @override
  int get hashCode => failure.hashCode;
}
