/// Generic cursor-paginated page envelope: `{ items, nextCursor }`.
///
/// The PUBLIC explore endpoints (tourism + learning) paginate by opaque cursor
/// rather than page number. [nextCursor] is null when there are no more items.
class CursorPage<T> {
  const CursorPage({required this.items, this.nextCursor});

  final List<T> items;
  final String? nextCursor;

  bool get hasMore => nextCursor != null && nextCursor!.isNotEmpty;

  /// Maps `{ items: [...], nextCursor }` (already unwrapped from the NestJS
  /// `{ data, statusCode }` envelope) into a typed page. Tolerates a bare list
  /// payload for resilience.
  static CursorPage<T> fromResponse<T>(
    Object? data,
    T Function(Map<String, dynamic> json) fromJson,
  ) {
    if (data is Map<String, dynamic>) {
      final rawItems =
          (data['items'] ?? data['data'] ?? const <dynamic>[]) as List<dynamic>;
      return CursorPage<T>(
        items: rawItems
            .whereType<Map<String, dynamic>>()
            .map(fromJson)
            .toList(),
        nextCursor: data['nextCursor'] as String? ??
            data['next_cursor'] as String?,
      );
    }
    if (data is List<dynamic>) {
      return CursorPage<T>(
        items:
            data.whereType<Map<String, dynamic>>().map(fromJson).toList(),
        nextCursor: null,
      );
    }
    return CursorPage<T>(items: const [], nextCursor: null);
  }
}
