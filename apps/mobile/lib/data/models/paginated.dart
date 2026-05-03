import 'package:freezed_annotation/freezed_annotation.dart';

part 'paginated.freezed.dart';
part 'paginated.g.dart';

/// Generic envelope for paginated list responses.
///
/// Backend uses two slightly different shapes:
///   * `{ data: [...], meta: { total, page, limit, totalPages } }`
///     (e.g. `GET /persons/mine`).
///   * Bare arrays (e.g. `GET /claims/mine`).
///
/// API services adapt both to this canonical wrapper.
@Freezed(genericArgumentFactories: true)
class Paginated<T> with _$Paginated<T> {
  const factory Paginated({
    required List<T> items,
    required int page,
    required int limit,
    required int total,
    int? totalPages,
  }) = _Paginated<T>;

  factory Paginated.fromJson(
    Map<String, dynamic> json,
    T Function(Object? json) fromJsonT,
  ) =>
      _$PaginatedFromJson<T>(json, fromJsonT);
}

/// Helper used by API services to map `{ data, meta }` into [Paginated].
Paginated<T> paginatedFromBackend<T>(
  Map<String, dynamic> json,
  T Function(Object? json) fromJsonT,
) {
  final rawItems = (json['data'] ?? json['items'] ?? <dynamic>[]) as List<dynamic>;
  final meta = (json['meta'] ?? const <String, dynamic>{}) as Map<String, dynamic>;
  return Paginated<T>(
    items: rawItems.map(fromJsonT).toList(),
    page: (meta['page'] as num?)?.toInt() ?? 1,
    limit: (meta['limit'] as num?)?.toInt() ?? rawItems.length,
    total: (meta['total'] as num?)?.toInt() ?? rawItems.length,
    totalPages: (meta['totalPages'] as num?)?.toInt(),
  );
}
