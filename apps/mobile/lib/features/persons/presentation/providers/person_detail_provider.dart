import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

// Cross-agent imports — Agent 3 (API services / DTOs) and Agent 4 (offline
// repository facade).
//
// Symbols expected:
//   - `personsApiProvider` from `data/api/persons_api.dart`
//   - `personsRepositoryProvider` from `data/local/persons_repository.dart`
//   - `Person` DTO from `data/models/person.dart`
//   - `FamilyTree` DTO from `data/models/family_tree.dart`
//
// They might land slightly out of sync with this file during the parallel
// build — the analyzer will surface missing imports if so.
import 'package:origin_mobile/data/api/persons_api.dart';
import 'package:origin_mobile/data/local/persons_repository.dart';
import 'package:origin_mobile/data/models/family_tree.dart';
import 'package:origin_mobile/data/models/person.dart';

/// Fetch a single Person by id.
///
/// The default behaviour is "online with offline fallback":
///   1. Try `personsApi.getById` (Agent 3) — fresh, authoritative.
///   2. On failure, fall back to `personsRepository.findById` (Agent 4) so we
///      always render something when the user has a local copy.
///
/// Result is cached by Riverpod for the duration of the watch — manual refresh
/// can be triggered via `ref.invalidate(personByIdProvider(id))`.
final personByIdProvider =
    FutureProvider.family<Person, String>((ref, personId) async {
  final api = ref.read(personsApiProvider);
  final repo = ref.read(personsRepositoryProvider);

  try {
    final remote = await api.getById(personId);
    // Best-effort cache write — a failure here must not break the UI.
    unawaited(repo.upsertFromRemote(remote));
    return remote;
  } catch (error, stack) {
    final cached = await repo.findById(personId);
    if (cached != null) {
      return cached;
    }
    Error.throwWithStackTrace(error, stack);
  }
});

/// Fetch the family tree (subgraph) centred on [personId] up to [degrees].
///
/// `degrees` is clamped to the API's supported range [1..5]. Tree fetches are
/// expensive — we DO cache offline copies but always prefer the network.
final familyTreeProvider =
    FutureProvider.family<FamilyTree, FamilyTreeArgs>((ref, args) async {
  final api = ref.read(personsApiProvider);
  final repo = ref.read(personsRepositoryProvider);
  final degrees = args.degrees.clamp(1, 5);

  try {
    final tree = await api.getFamilyTree(args.personId, degrees: degrees);
    unawaited(repo.upsertFamilyTree(tree));
    return tree;
  } catch (error, stack) {
    final cached = await repo.findFamilyTree(args.personId);
    if (cached != null) {
      return cached;
    }
    Error.throwWithStackTrace(error, stack);
  }
});

/// Argument tuple for [familyTreeProvider].
@immutable
class FamilyTreeArgs {
  const FamilyTreeArgs({required this.personId, this.degrees = 2});

  final String personId;
  final int degrees;

  @override
  bool operator ==(Object other) =>
      other is FamilyTreeArgs &&
      other.personId == personId &&
      other.degrees == degrees;

  @override
  int get hashCode => Object.hash(personId, degrees);
}

/// Fire-and-forget helper to silently swallow background-cache errors without
/// pulling in `dart:async`'s `unawaited` from a transitive package.
@pragma('vm:prefer-inline')
void unawaited(Future<void> future) {
  // We deliberately ignore the future here: it's a side-effect cache write.
  future.then<void>((_) {}, onError: (Object _) {});
}
