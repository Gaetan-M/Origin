/// Visibility scope shared by Living Memory surfaces (albums + memorial).
///
/// Mirrors the backend `VisibilityScope` vocabulary used by the web client
/// (`@origin/shared-types`). Kept as a plain Dart enum with explicit wire
/// mappings (no codegen) so the feature compiles in isolation.
enum MemoryVisibilityScope {
  privateSelf,
  family,
  public;

  String get wire => switch (this) {
        MemoryVisibilityScope.privateSelf => 'PRIVATE_SELF',
        MemoryVisibilityScope.family => 'FAMILY',
        MemoryVisibilityScope.public => 'PUBLIC',
      };

  static MemoryVisibilityScope fromWire(String? value) {
    switch ((value ?? '').toUpperCase()) {
      case 'FAMILY':
        return MemoryVisibilityScope.family;
      case 'PUBLIC':
        return MemoryVisibilityScope.public;
      case 'PRIVATE_SELF':
      default:
        return MemoryVisibilityScope.privateSelf;
    }
  }
}
